"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Plus } from "lucide-react";

import { TimeGrid } from "@/components/calendar/time-grid";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getProjects, getTasks } from "@/lib/api";
import { addDays, dateKey, startOfWeek, weekBounds } from "@/lib/dates";

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
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-7 sm:py-6 xl:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70867a]">
            Weekly time map
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            Calendar
          </h1>
          <p className="mt-2 text-sm text-[#6e7d76]">
            Drag tasks across days or time. Resize either edge in 15-minute
            steps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => moveWeek(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-44 text-center">
            <p className="text-sm font-semibold text-[#28423c]">{rangeLabel}</p>
            <button
              onClick={() => {
                const today = new Date();
                setWeek(startOfWeek(today));
                setSelectedDate(dateKey(today));
              }}
              className="mt-0.5 text-xs font-medium text-[#71827a] hover:text-[#28423c]"
            >
              Back to this week
            </button>
          </div>
          <Button
            variant="outline"
            size="icon-lg"
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
            className="h-11 bg-[#173b35] px-4 text-white"
          >
            <Plus />
            Add task
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <TaskSummary tasks={selectedTasks} />
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

      <div className="mt-4">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center gap-2 rounded-[22px] border border-[#dce3da] bg-white text-sm text-[#77857f]">
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
