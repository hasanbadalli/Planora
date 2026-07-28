"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Plus } from "lucide-react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getProjects, getTasks } from "@/lib/api";
import { addDays, dateKey, dayBounds, parseDateKey } from "@/lib/dates";
import { useWorkspaceRefresh } from "@/lib/workspace-events";

export function DailyKanban() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const selectedKey = dateKey(selectedDate);
  const isToday = selectedKey === dateKey(new Date());

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [from, to] = dayBounds(selectedDate);
      const [nextTasks, nextProjects] = await Promise.all([
        getTasks(from, to),
        getProjects(),
      ]);
      setTasks(nextTasks);
      setProjects(nextProjects);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "This day could not be loaded.",
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedDate]);

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

  const title = isToday
    ? "Today"
    : selectedDate.toLocaleDateString("en", { weekday: "long" });
  const subtitle = selectedDate.toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((date) => addDays(date, -1))}
            aria-label="Previous day"
          >
            <ChevronLeft />
          </Button>
          <input
            aria-label="Choose day"
            type="date"
            value={selectedKey}
            onChange={(event) =>
              setSelectedDate(parseDateKey(event.target.value))
            }
            className="h-8 rounded-md border border-border bg-card px-2 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((date) => addDays(date, 1))}
            aria-label="Next day"
          >
            <ChevronRight />
          </Button>
          {!isToday ? (
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setEditingTask(null);
              setDialogOpen(true);
            }}
          >
            <Plus />
            New task
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <TaskSummary tasks={tasks} />
      </div>
      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-medium">
            Dismiss
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" />
          Loading board...
        </div>
      ) : (
        <div className="mt-5">
          <TaskKanbanBoard
            tasks={tasks}
            projects={projects}
            onTasksChange={setTasks}
            onEdit={(task) => {
              setEditingTask(task);
              setDialogOpen(true);
            }}
            onError={(message) => setError(message || null)}
          />
        </div>
      )}
      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects.filter((project) => project.status !== "archived")}
        onProjectsChange={setProjects}
        selectedDate={selectedKey}
        task={editingTask}
        onSaved={() => void load()}
      />
    </div>
  );
}
