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
import { useWorkspaceRefresh } from "@/lib/workspace-events";

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

  useWorkspaceRefresh(
    useCallback(() => {
      void load(true);
    }, [load]),
  );

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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to week
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag to reschedule, resize either edge in 15-minute steps.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => moveDay(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
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
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
      <div className="mt-4">
        {loading ? (
          <div className="flex min-h-[440px] items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
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
