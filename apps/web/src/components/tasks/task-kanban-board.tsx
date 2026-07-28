"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, Clock3, GripVertical, Repeat2 } from "lucide-react";

import { TaskCategoryIcon } from "@/components/tasks/task-category-icon";
import {
  ApiError,
  Project,
  Task,
  TaskStatus,
  updateTask,
  updateTaskOccurrence,
} from "@/lib/api";
import { formatTime } from "@/lib/dates";
import { STATUS_STYLES, TASK_STATUSES, statusLabel } from "@/lib/task-status";
import {
  primaryTaskCategory,
  taskCategories,
  taskProjects,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

interface TaskKanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  onTasksChange: (tasks: Task[]) => void;
  onEdit: (task: Task) => void;
  onError: (message: string) => void;
}

export function TaskKanbanBoard({
  tasks,
  projects,
  onTasksChange,
  onEdit,
  onError,
}: TaskKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function changeStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    const key = taskKey(task);
    if (pendingKeys.has(key)) return;
    const snapshot = tasks;
    const optimisticCompletedAt =
      status === "done" ? new Date().toISOString() : null;
    const optimistic = tasks.map((item) =>
      taskKey(item) === key
        ? { ...item, status, completed_at: optimisticCompletedAt }
        : item,
    );
    onTasksChange(optimistic);
    setPendingKeys((items) => new Set(items).add(key));
    onError("");
    try {
      const saved = task.weekly_repeat
        ? await updateTaskOccurrence(task.id, task.series_date, {
            scope: "occurrence",
            status,
          })
        : await updateTask(task.id, { status });
      onTasksChange(
        optimistic.map((item) => (taskKey(item) === key ? saved : item)),
      );
      setFeedback(`${task.title} moved to ${statusLabel(status)}.`);
    } catch (caught) {
      onTasksChange(snapshot);
      onError(
        caught instanceof ApiError
          ? `${caught.message} The task was moved back.`
          : "The status change failed. The task was moved back.",
      );
    } finally {
      setPendingKeys((items) => {
        const next = new Set(items);
        next.delete(key);
        return next;
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    const status = event.over?.id as TaskStatus | undefined;
    setActiveTask(null);
    if (task && status && TASK_STATUSES.some((item) => item.value === status)) {
      void changeStatus(task, status);
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={(event) =>
          setActiveTask((event.active.data.current?.task as Task) ?? null)
        }
        onDragCancel={() => setActiveTask(null)}
        onDragEnd={onDragEnd}
      >
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status.value}
              status={status.value}
              label={status.label}
              tasks={tasks.filter((task) => task.status === status.value)}
              projects={projects}
              pendingKeys={pendingKeys}
              onEdit={onEdit}
            />
          ))}
        </div>
        <DragOverlay
          dropAnimation={{
            duration: 190,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {activeTask ? (
            <KanbanCardContent
              task={activeTask}
              projects={taskProjects(activeTask, projects)}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      {feedback ? (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-xl bg-[#173b35] px-4 py-3 text-sm font-medium text-white shadow-xl sm:bottom-6 sm:right-6"
        >
          <Check className="size-4 text-[#d7f36b]" />
          {feedback}
        </div>
      ) : null}
    </>
  );
}

function KanbanColumn({
  status,
  label,
  tasks,
  projects,
  pendingKeys,
  onEdit,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  projects: Project[];
  pendingKeys: Set<string>;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-h-56 rounded-[20px] border border-[#dce3da] bg-[#f9faf7] p-3 transition-all duration-200",
        isOver &&
          "-translate-y-0.5 border-[#6f8d80] bg-[#eef4eb] shadow-[0_12px_28px_rgba(45,75,64,0.1)] ring-2 ring-[#769184]/20",
      )}
    >
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "todo"
                ? "bg-slate-400"
                : status === "in_progress"
                  ? "bg-amber-500"
                  : "bg-emerald-500",
            )}
          />
          <h2 className="text-sm font-semibold text-[#29423b]">{label}</h2>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#74817b]">
          {tasks.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {tasks.length ? (
          tasks.map((task) => (
            <KanbanCard
              key={taskKey(task)}
              task={task}
              projects={taskProjects(task, projects)}
              disabled={pendingKeys.has(taskKey(task))}
              onEdit={() => onEdit(task)}
            />
          ))
        ) : (
          <div
            className={cn(
              "rounded-xl border border-dashed border-[#dce3da] px-4 py-10 text-center text-xs text-[#929c97] transition-colors",
              isOver && "border-[#769184] bg-white/70 text-[#557167]",
            )}
          >
            {isOver ? `Move to ${label}` : "Drop a task here"}
          </div>
        )}
      </div>
    </section>
  );
}

function KanbanCard({
  task,
  projects,
  disabled,
  onEdit,
}: {
  task: Task;
  projects: Project[];
  disabled: boolean;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: taskKey(task), data: { task }, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "touch-none transition-[opacity,transform] duration-150",
        isDragging && "relative z-20 scale-[0.98] opacity-20",
      )}
    >
      <div
        {...listeners}
        {...attributes}
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEdit();
        }}
        className={cn(
          "cursor-grab rounded-2xl border border-[#dfe5dc] bg-white p-4 shadow-[0_5px_16px_rgba(40,58,50,0.04)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bdcbbb] hover:shadow-md active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#4f7665]",
          disabled && "cursor-wait opacity-60",
        )}
      >
        <KanbanCardContent task={task} projects={projects} />
      </div>
    </div>
  );
}

function KanbanCardContent({
  task,
  projects,
  overlay = false,
}: {
  task: Task;
  projects: Project[];
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        overlay &&
          "w-72 rotate-1 scale-[1.03] rounded-2xl border border-[#91a79d] bg-white p-4 shadow-[0_24px_60px_rgba(30,58,49,0.24)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#edf2ec] text-[#4f6b60]">
            <TaskCategoryIcon
              category={primaryTaskCategory(task)}
              className="size-3.5"
            />
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
              STATUS_STYLES[task.status],
            )}
          >
            {statusLabel(task.status)}
          </span>
        </div>
        <GripVertical className="size-4 text-[#9aa49f]" />
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-5 text-[#253e37]">
        {task.title}
      </h3>
      {task.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#7a8781]">
          {task.description}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-[#75827c]">
        <span>
          {formatTime(task.starts_at)}–{formatTime(task.ends_at)}
        </span>
        <span className="flex items-center gap-2.5">
          {task.estimated_minutes ? (
            <span className="flex items-center gap-1" title="Estimated effort">
              <Clock3 className="size-3" />
              {formatEffort(task.estimated_minutes)}
            </span>
          ) : null}
          {task.weekly_repeat ? (
            <span className="flex items-center gap-1">
              <Repeat2 className="size-3" />
              Weekly
            </span>
          ) : null}
        </span>
      </div>
      <TaskContext task={task} projects={projects} />
    </div>
  );
}

function TaskContext({ task, projects }: { task: Task; projects: Project[] }) {
  const categories = taskCategories(task);
  if (!projects.length && categories.length <= 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#edf0ec] pt-3 text-[10px] font-semibold text-[#66766f]">
      {projects.slice(0, 2).map((project) => (
        <span
          key={project.id}
          className="flex min-w-0 items-center gap-1.5 rounded-full bg-[#f3f5f2] px-2 py-1"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="max-w-28 truncate">{project.name}</span>
        </span>
      ))}
      {projects.length > 2 ? (
        <span className="rounded-full bg-[#f3f5f2] px-2 py-1">
          +{projects.length - 2}
        </span>
      ) : null}
      {categories.length > 1 ? (
        <span className="rounded-full bg-[#edf2ec] px-2 py-1 text-[#526d63]">
          +{categories.length - 1} categor{categories.length === 2 ? "y" : "ies"}
        </span>
      ) : null}
    </div>
  );
}

function formatEffort(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function taskKey(task: Task): string {
  return `${task.id}:${task.series_date}`;
}
