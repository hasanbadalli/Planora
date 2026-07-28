"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
} from "lucide-react";

import { TimeGrid } from "@/components/calendar/time-grid";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskSummary } from "@/components/tasks/task-summary";
import { Button } from "@/components/ui/button";
import { ApiError, Project, Task, getProjects, getTasks } from "@/lib/api";
import { addDays, dateKey, dayBounds, parseDateKey } from "@/lib/dates";

export function DayTimeline({ date }: { date: string }) {
  const router = useRouter();
  const parsedDate = useMemo(() => parseDateKey(date), [date]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [from, to] = dayBounds(parsedDate);
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
  }, [parsedDate]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  function moveDay(amount: number) {
    router.push(`/calendar/${dateKey(addDays(parsedDate, amount))}`);
  }

  const title = parsedDate.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#65766f] hover:text-[#294b42]"
      >
        <ArrowLeft className="size-4" />
        Back to week
      </Link>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70867a]">
            Daily schedule
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[#6e7d76]">
            Drag to reschedule. Resize the top or bottom edge to change
            duration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => moveDay(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => moveDay(1)}
            aria-label="Next day"
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

      <div className="mt-6">
        <TaskSummary tasks={tasks} />
      </div>
      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}
      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center gap-2 rounded-[22px] border border-[#dce3da] bg-white text-sm text-[#77857f]">
            <LoaderCircle className="animate-spin" />
            Loading timeline...
          </div>
        ) : (
          <TimeGrid
            days={[parsedDate]}
            tasks={tasks}
            projects={projects}
            selectedDate={date}
            showDayHeaders={false}
            onEdit={(task) => {
              setEditingTask(task);
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
        selectedDate={date}
        task={editingTask}
        onSaved={() => void load()}
      />
    </div>
  );
}
