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
import { useWorkspaceRefresh } from "@/lib/workspace-events";
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

  useWorkspaceRefresh(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

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
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedDate.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Move between days and keep this project&apos;s execution in one focused view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((day) => addDays(day, -1))}
            aria-label="Previous project day"
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
            className="h-11 min-w-36 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedDate((day) => addDays(day, 1))}
            aria-label="Next project day"
          >
            <ChevronRight aria-hidden />
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskOpen(true);
            }}
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
                  "min-h-[76px] rounded-md border px-2 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/50 bg-primary/5 shadow-notion"
                    : "border-border bg-muted hover:border-border hover:bg-card",
                )}
              >
                <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {day.toLocaleDateString("en", { weekday: "short" })}
                </span>
                <span className="mt-1 block text-sm font-semibold text-foreground">
                  {day.getDate()}
                </span>
                <span className="mt-1 block text-[9px] font-medium text-muted-foreground">
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
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading tasks...
        </div>
      ) : (
        <>
          <div className="mt-4">
            <TaskSummary tasks={selectedTasks} />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-2">
                  <TrendingUp className="size-4" aria-hidden /> Daily progress
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-card text-muted-foreground">
                <Clock3 className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatDuration(plannedMinutes)}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
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
