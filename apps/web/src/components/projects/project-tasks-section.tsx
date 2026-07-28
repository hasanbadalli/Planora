"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Plus,
  TrendingUp,
} from "lucide-react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getTasks } from "@/lib/api";
import {
  addDays,
  dateKey,
  parseDateKey,
  startOfWeek,
  weekBounds,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ProjectTasksSection({
  project,
  projects,
  onProjectsChange,
}: {
  project: Project;
  projects: Project[];
  onProjectsChange: (projects: Project[]) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const selectedKey = dateKey(selectedDate);
  const weekKey = dateKey(startOfWeek(selectedDate));
  const week = useMemo(() => parseDateKey(weekKey), [weekKey]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(week, index)),
    [week],
  );

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const [from, to] = weekBounds(week);
        setTasks(await getTasks(from, to, project.id));
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Project tasks could not be loaded.",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [project.id, week],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const selectedTasks = tasks.filter(
    (task) => task.occurrence_date === selectedKey,
  );
  const completed = selectedTasks.filter((task) => task.status === "done").length;
  const progress = selectedTasks.length
    ? Math.round((completed / selectedTasks.length) * 100)
    : 0;
  const plannedMinutes = selectedTasks.reduce(
    (total, task) =>
      total +
      (task.estimated_minutes ??
        Math.max(
          0,
          (new Date(task.ends_at).valueOf() -
            new Date(task.starts_at).valueOf()) /
            60_000,
        )),
    0,
  );

  function updateSelectedTasks(nextSelectedTasks: Task[]) {
    setTasks((items) => [
      ...items.filter((task) => task.occurrence_date !== selectedKey),
      ...nextSelectedTasks,
    ]);
  }

  return (
    <section className="min-w-0 rounded-[22px] border border-[#dce3da] bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74847b]">
            Daily project board
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#233d36]">
            {selectedDate.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="mt-1 text-sm text-[#7e8b85]">
            Move between days and keep this project&apos;s execution in one focused view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((day) => addDays(day, -1))}
            aria-label="Previous project day"
            className="min-h-11 min-w-11 rounded-xl"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <input
            type="date"
            aria-label="Choose project day"
            value={selectedKey}
            onChange={(event) =>
              setSelectedDate(parseDateKey(event.target.value))
            }
            className="h-11 min-w-36 rounded-xl border border-[#d9e1d8] bg-white px-3 text-xs font-semibold text-[#39524b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((day) => addDays(day, 1))}
            aria-label="Next project day"
            className="min-h-11 min-w-11 rounded-xl"
          >
            <ChevronRight aria-hidden />
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskOpen(true);
            }}
            className="min-h-11 rounded-xl bg-[#173b35] text-white"
            disabled={project.status === "archived"}
          >
            <Plus aria-hidden />
            Add task
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
          {days.map((day) => {
            const key = dateKey(day);
            const count = tasks.filter(
              (task) => task.occurrence_date === key,
            ).length;
            const active = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                aria-pressed={active}
                className={cn(
                  "min-h-[76px] rounded-xl border px-2 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]",
                  active
                    ? "border-[#58786b] bg-[#edf3e9] shadow-sm"
                    : "border-[#e1e6df] bg-[#fbfcfa] hover:border-[#c6d1c8] hover:bg-white",
                )}
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-[#7a8881]">
                  {day.toLocaleDateString("en", { weekday: "short" })}
                </span>
                <span className="mt-1 block text-sm font-semibold text-[#29423b]">
                  {day.getDate()}
                </span>
                <span className="mt-1 block text-[9px] font-medium text-[#89958f]">
                  {count} {count === 1 ? "task" : "tasks"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#77857f]">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading tasks...
        </div>
      ) : (
        <>
          <div className="mt-4">
            <TaskSummary tasks={selectedTasks} />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e1e6df] bg-[#f9faf7] p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#65776f]">
                <span className="flex items-center gap-2">
                  <TrendingUp className="size-4" aria-hidden /> Daily progress
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e8e1]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#e1e6df] bg-[#f9faf7] p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#587267]">
                <Clock3 className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#29423b]">
                  {formatDuration(plannedMinutes)}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#829089]">
                  Planned effort
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <TaskKanbanBoard
              tasks={selectedTasks}
              projects={projects}
              onTasksChange={updateSelectedTasks}
              onEdit={(task) => {
                setEditingTask(task);
                setTaskOpen(true);
              }}
              onError={(message) => setError(message || null)}
            />
          </div>
        </>
      )}

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        projects={projects.filter(
          (item) => item.status !== "archived" || item.id === project.id,
        )}
        onProjectsChange={onProjectsChange}
        selectedDate={selectedKey}
        task={editingTask}
        defaultProjectId={project.id}
        onSaved={() => void load(true)}
      />
    </section>
  );
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}
