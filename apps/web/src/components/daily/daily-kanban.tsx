"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Plus } from "lucide-react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getProjects, getTasks } from "@/lib/api";
import {
  addDays,
  dateKey,
  dayBounds,
  parseDateKey,
} from "@/lib/dates";

export function DailyKanban() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const selectedKey = dateKey(selectedDate);

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
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

  const title = selectedDate.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70867a]">
            Daily board
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[#6e7d76]">
            Move work through the day without losing its schedule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
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
            className="h-11 rounded-xl border border-[#d9e1d8] bg-white px-3 text-sm font-semibold text-[#39524b]"
          />
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => setSelectedDate((date) => addDays(date, 1))}
            aria-label="Next day"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedDate(new Date())}
            className="h-11"
          >
            Today
          </Button>
          <Button
            onClick={() => {
              setEditingTask(null);
              setDialogOpen(true);
            }}
            className="h-11 bg-[#173b35] px-4 text-white"
          >
            <Plus />
            Add task
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <TaskSummary tasks={tasks} />
      </div>
      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold">
            Dismiss
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-sm text-[#77857f]">
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
