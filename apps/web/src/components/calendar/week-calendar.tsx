"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Plus } from "lucide-react";

import { TimeGrid } from "@/components/calendar/time-grid";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getProjects, getTasks } from "@/lib/api";
import { addDays, dateKey, startOfWeek, weekBounds } from "@/lib/dates";
import { useWorkspaceRefresh } from "@/lib/workspace-events";

export function WeekCalendar() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(week, index)),
    [week],
  );

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [from, to] = weekBounds(week);
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
          : "The calendar could not be loaded.",
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [week]);
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

  function moveWeek(amount: number) {
    const next = addDays(week, amount * 7);
    setWeek(next);
    setSelectedDate(dateKey(next));
  }

  const weekEnd = addDays(week, 6);
  const rangeLabel =
    week.getMonth() === weekEnd.getMonth()
      ? `${week.toLocaleDateString("en", { month: "long", day: "numeric" })}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${week.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`;
  const selectedTasks = tasks.filter(
    (task) => task.occurrence_date === selectedDate,
  );

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => moveWeek(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date();
              setWeek(startOfWeek(today));
              setSelectedDate(dateKey(today));
            }}
          >
            This week
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => moveWeek(1)}
            aria-label="Next week"
          >
            <ChevronRight />
          </Button>
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

      <div className="mt-4">
        <TaskSummary tasks={selectedTasks} />
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

      <div className="mt-4">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" />
            Loading your week...
          </div>
        ) : (
          <TimeGrid
            days={days}
            tasks={tasks}
            projects={projects}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onEdit={(task) => {
              setEditingTask(task);
              setSelectedDate(task.occurrence_date);
              setDialogOpen(true);
            }}
            onTasksChange={setTasks}
            onReload={() => void load(true)}
            onError={setError}
          />
        )}
      </div>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects.filter((project) => project.status !== "archived")}
        onProjectsChange={setProjects}
        selectedDate={selectedDate}
        task={editingTask}
        onSaved={() => void load()}
      />
    </div>
  );
}
