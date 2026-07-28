"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Expand,
  GripHorizontal,
  GripVertical,
  Repeat2,
} from "lucide-react";

import { TaskCategoryIcon } from "@/components/tasks/task-category-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  Project,
  Task,
  updateTask,
  updateTaskOccurrence,
} from "@/lib/api";
import { dateKey, formatTime } from "@/lib/dates";
import { STATUS_STYLES, statusLabel } from "@/lib/task-status";
import { primaryTaskCategory, taskProjects } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const HOUR_HEIGHT = 60;
const MIN_TASK_MINUTES = 15;

interface TimeGridProps {
  days: Date[];
  tasks: Task[];
  projects: Project[];
  selectedDate?: string;
  showDayHeaders?: boolean;
  onSelectDate?: (date: string) => void;
  onEdit: (task: Task) => void;
  onTasksChange: (tasks: Task[]) => void;
  onReload: () => void;
  onError: (message: string) => void;
}

interface TimeChange {
  task: Task;
  startsAt: Date;
  endsAt: Date;
}

export function TimeGrid({
  days,
  tasks,
  projects,
  selectedDate,
  showDayHeaders = true,
  onSelectDate,
  onEdit,
  onTasksChange,
  onReload,
  onError,
}: TimeGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const columnsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dropPreview, setDropPreview] = useState<TimeChange | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [recurrenceChange, setRecurrenceChange] = useState<TimeChange | null>(
    null,
  );
  const minWidth =
    days.length === 1 ? "100%" : Math.max(days.length * 168 + 64, 620);
  const firstTaskHour = tasks.length
    ? Math.min(...tasks.map((task) => new Date(task.starts_at).getHours()))
    : 8;

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = Math.max(firstTaskHour - 1, 0) * HOUR_HEIGHT;
  }, [days, firstTaskHour]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function requestTimeChange(change: TimeChange) {
    if (change.endsAt <= change.startsAt) {
      setDropPreview(null);
      onError("End time must be after start time.");
      return;
    }
    if (change.task.weekly_repeat) setRecurrenceChange(change);
    else void persistTimeChange(change, "occurrence");
  }

  async function persistTimeChange(
    change: TimeChange,
    scope: "occurrence" | "future",
  ) {
    const key = taskKey(change.task);
    if (pendingKeys.has(key)) return;
    const snapshot = tasks;
    onSelectDate?.(dateKey(change.startsAt));
    const optimistic = tasks.map((item) =>
      item.id === change.task.id && item.series_date === change.task.series_date
        ? {
            ...item,
            starts_at: change.startsAt.toISOString(),
            ends_at: change.endsAt.toISOString(),
            occurrence_date: dateKey(change.startsAt),
          }
        : item,
    );
    onTasksChange(optimistic);
    setPendingKeys((items) => new Set(items).add(key));
    onError("");
    try {
      const saved = change.task.weekly_repeat
        ? await updateTaskOccurrence(change.task.id, change.task.series_date, {
            scope,
            starts_at: change.startsAt.toISOString(),
            ends_at: change.endsAt.toISOString(),
          })
        : await updateTask(change.task.id, {
            starts_at: change.startsAt.toISOString(),
            ends_at: change.endsAt.toISOString(),
          });
      onTasksChange(
        optimistic.map((item) =>
          item.id === change.task.id &&
          item.series_date === change.task.series_date
            ? saved
            : item,
        ),
      );
      setFeedback(
        `${change.task.title} scheduled for ${change.startsAt.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}, ${formatTime(change.startsAt.toISOString())}–${formatTime(change.endsAt.toISOString())}.`,
      );
      onReload();
    } catch (caught) {
      onTasksChange(snapshot);
      onError(
        caught instanceof ApiError
          ? `${caught.message} The calendar change was rolled back.`
          : "The calendar change failed and was rolled back.",
      );
    } finally {
      setDropPreview(null);
      setPendingKeys((items) => {
        const next = new Set(items);
        next.delete(key);
        return next;
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(null);
    if (!task || !columnsRef.current || pendingKeys.has(taskKey(task))) {
      setDropPreview(null);
      return;
    }
    const change = dragTimeChange(
      task,
      event.delta.x,
      event.delta.y,
      columnsRef.current.clientWidth / days.length,
      days,
    );
    if (
      change.startsAt.valueOf() === new Date(task.starts_at).valueOf() &&
      change.endsAt.valueOf() === new Date(task.ends_at).valueOf()
    ) {
      setDropPreview(null);
      return;
    }
    requestTimeChange(change);
  }

  function onDragMove(event: DragMoveEvent) {
    const task = event.active.data.current?.task as Task | undefined;
    if (!task || !columnsRef.current) return;
    setDropPreview(
      dragTimeChange(
        task,
        event.delta.x,
        event.delta.y,
        columnsRef.current.clientWidth / days.length,
        days,
      ),
    );
  }

  function resizeTask(
    layout: TaskLayout,
    edge: "start" | "end",
    pixels: number,
  ) {
    const startsAt = new Date(layout.task.starts_at);
    const endsAt = new Date(layout.task.ends_at);
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const minutes = Math.round((pixels / HOUR_HEIGHT) * 4) * 15;
    if (minutes === 0) return;
    if (edge === "start") {
      startsAt.setTime(
        Math.max(
          dayStart.valueOf(),
          Math.min(
            startsAt.getTime() + minutes * 60_000,
            endsAt.getTime() - MIN_TASK_MINUTES * 60_000,
          ),
        ),
      );
    } else {
      endsAt.setTime(
        Math.min(
          dayEnd.valueOf(),
          Math.max(
            endsAt.getTime() + minutes * 60_000,
            startsAt.getTime() + MIN_TASK_MINUTES * 60_000,
          ),
        ),
      );
    }
    requestTimeChange({ task: layout.task, startsAt, endsAt });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[22px] border border-[#d9e1d8] bg-white">
        {days.length > 1 ? (
          <div className="flex items-center justify-between gap-3 border-b border-[#e6ebe4] bg-[#f8faf6] px-4 py-2 text-[10px] font-semibold text-[#718078] sm:hidden">
            <span>Swipe to explore the week</span>
            <span className="text-[#47685d]">Time stays pinned</span>
          </div>
        ) : null}
        <div
          ref={scrollRef}
          data-calendar-scroll
          className="h-[clamp(420px,60dvh,620px)] overflow-auto overscroll-contain scroll-smooth sm:h-[clamp(460px,64dvh,660px)]"
        >
          <div style={{ minWidth }}>
            {showDayHeaders ? (
              <div
                className="sticky top-0 z-50 grid border-b border-[#e1e7df] bg-[#fbfcfa]"
                style={{
                  gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-20 border-r border-[#dce3dc] bg-[#f7f9f6] shadow-[5px_0_12px_rgba(37,60,50,0.06)]" />
                {days.map((day) => {
                  const key = dateKey(day);
                  const active = selectedDate === key;
                  const today = key === dateKey(new Date());
                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative border-r border-[#e4e9e3] px-2 py-3 text-center last:border-r-0",
                        active && "bg-[#f0f5eb]",
                      )}
                    >
                      <button
                        onClick={() => onSelectDate?.(key)}
                        className="w-full rounded-lg"
                      >
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7f8c86]">
                          {day.toLocaleDateString("en", { weekday: "short" })}
                        </span>
                        <span
                          className={cn(
                            "mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                            today && "bg-[#d7f36b] text-[#17342f]",
                          )}
                        >
                          {day.getDate()}
                        </span>
                      </button>
                      <Link
                        href={`/calendar/${key}`}
                        aria-label={`Open ${day.toLocaleDateString("en", { month: "long", day: "numeric" })} detail`}
                        className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-lg text-[#8a9690] hover:bg-white hover:text-[#31554a]"
                      >
                        <Expand className="size-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <DndContext
                sensors={sensors}
                onDragStart={(event) => {
                  const task = event.active.data.current?.task as Task;
                  setActiveTask(task);
                  setDropPreview({
                    task,
                    startsAt: new Date(task.starts_at),
                    endsAt: new Date(task.ends_at),
                  });
                }}
                onDragMove={onDragMove}
                onDragCancel={() => {
                  setActiveTask(null);
                  setDropPreview(null);
                }}
                onDragEnd={onDragEnd}
              >
                <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
                  <HourLabels />
                  <HourLines />
                  <div
                    ref={columnsRef}
                    className="absolute inset-y-0 left-16 right-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {days.map((day) => {
                      const key = dateKey(day);
                      const layouts = layoutDayTasks(
                        tasks.filter((task) => task.occurrence_date === key),
                        day,
                      );
                      return (
                        <div
                          key={key}
                          className={cn(
                            "relative border-r border-[#e1e6e0] last:border-r-0",
                            selectedDate === key && "bg-[#f7faf4]/55",
                          )}
                        >
                          {dropPreview &&
                          dateKey(dropPreview.startsAt) === key ? (
                            <TimeDropPreview
                              change={dropPreview}
                              day={day}
                              saving={pendingKeys.has(
                                taskKey(dropPreview.task),
                              )}
                            />
                          ) : null}
                          {layouts.map((layout) => (
                            <TimeTaskBlock
                              key={taskKey(layout.task)}
                              layout={layout}
                              projects={taskProjects(layout.task, projects)}
                              disabled={pendingKeys.has(taskKey(layout.task))}
                              onEdit={() => onEdit(layout.task)}
                              onResize={(edge, pixels) =>
                                resizeTask(layout, edge, pixels)
                              }
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <DragOverlay
                    dropAnimation={{
                      duration: 180,
                      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                  >
                    {activeTask ? (
                      <TimeTaskContent
                        task={activeTask}
                        projects={taskProjects(activeTask, projects)}
                        overlay
                      />
                    ) : null}
                  </DragOverlay>
                </div>
            </DndContext>
          </div>
        </div>
      </div>

      <Dialog
        open={recurrenceChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRecurrenceChange(null);
            setDropPreview(null);
          }
        }}
      >
        <DialogContent className="p-6 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Update recurring task</DialogTitle>
            <DialogDescription>
              Choose how this calendar change should affect the weekly series.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border border-[#e0e6de] bg-[#f8faf6] p-4 text-sm text-[#53645d]">
            <p>
              <strong className="text-[#263f38]">This occurrence</strong>{" "}
              changes only {recurrenceChange?.task.series_date}.
            </p>
            <p>
              <strong className="text-[#263f38]">This and future</strong> keeps
              earlier weeks unchanged and starts a new schedule here.
            </p>
          </div>
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button
              variant="outline"
              onClick={() => {
                setRecurrenceChange(null);
                setDropPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const change = recurrenceChange;
                setRecurrenceChange(null);
                if (change) void persistTimeChange(change, "occurrence");
              }}
            >
              This occurrence
            </Button>
            <Button
              className="bg-[#173b35] text-white"
              onClick={() => {
                const change = recurrenceChange;
                setRecurrenceChange(null);
                if (change) void persistTimeChange(change, "future");
              }}
            >
              This and future
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {feedback ? (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-50 flex max-w-sm items-center gap-2 rounded-xl bg-[#173b35] px-4 py-3 text-sm font-medium text-white shadow-xl sm:bottom-6 sm:right-6"
        >
          <Check className="size-4 shrink-0 text-[#d7f36b]" />
          {feedback}
        </div>
      ) : null}
    </>
  );
}

function dragTimeChange(
  task: Task,
  deltaX: number,
  deltaY: number,
  dayWidth: number,
  days: Date[],
): TimeChange {
  const sourceIndex = Math.max(
    days.findIndex((day) => dateKey(day) === task.occurrence_date),
    0,
  );
  const targetIndex = Math.min(
    Math.max(sourceIndex + Math.round(deltaX / dayWidth), 0),
    days.length - 1,
  );
  const dayDelta = targetIndex - sourceIndex;
  const minuteDelta = Math.round((deltaY / HOUR_HEIGHT) * 4) * 15;
  const startsAt = new Date(task.starts_at);
  const endsAt = new Date(task.ends_at);
  const duration = endsAt.valueOf() - startsAt.valueOf();
  startsAt.setDate(startsAt.getDate() + dayDelta);
  startsAt.setMinutes(startsAt.getMinutes() + minuteDelta);
  const targetStart = new Date(days[targetIndex]);
  targetStart.setHours(0, 0, 0, 0);
  const targetEnd = new Date(targetStart);
  targetEnd.setDate(targetEnd.getDate() + 1);
  if (startsAt < targetStart) startsAt.setTime(targetStart.valueOf());
  if (startsAt.valueOf() + duration > targetEnd.valueOf()) {
    startsAt.setTime(targetEnd.valueOf() - duration);
  }
  endsAt.setTime(startsAt.valueOf() + duration);
  return { task, startsAt, endsAt };
}

function TimeDropPreview({
  change,
  day,
  saving,
}: {
  change: TimeChange;
  day: Date;
  saving: boolean;
}) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const top =
    ((change.startsAt.valueOf() - dayStart.valueOf()) / 3_600_000) *
    HOUR_HEIGHT;
  const height = Math.max(
    ((change.endsAt.valueOf() - change.startsAt.valueOf()) / 3_600_000) *
      HOUR_HEIGHT,
    26,
  );
  return (
    <div
      className="pointer-events-none absolute inset-x-1 z-30 flex items-start rounded-lg border-2 border-dashed border-[#55796c] bg-[#dfead9]/80 p-2 shadow-[0_10px_28px_rgba(45,75,64,0.16)] transition-[top,height] duration-100"
      style={{ top, height }}
    >
      <span className="rounded-md bg-[#173b35] px-2 py-1 text-[9px] font-bold text-white shadow-sm">
        {saving ? "Saving" : "Drop"}{" "}
        {formatTime(change.startsAt.toISOString())}–
        {formatTime(change.endsAt.toISOString())}
      </span>
    </div>
  );
}

function HourLabels() {
  return (
    <div
      data-hour-gutter
      className="sticky left-0 z-40 h-full w-16 border-r border-[#dce3dc] bg-[#fbfcfa] shadow-[5px_0_12px_rgba(37,60,50,0.06)]"
    >
      <span className="absolute right-3 top-1.5 text-[10px] font-medium tabular-nums text-[#718078]">
        00:00
      </span>
      {Array.from({ length: 23 }, (_, index) => index + 1).map((hour) => (
        <span
          key={hour}
          className="absolute right-3 -translate-y-1/2 text-[10px] font-medium tabular-nums text-[#83908a]"
          style={{ top: hour * HOUR_HEIGHT }}
        >
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}
      <span className="absolute bottom-1.5 right-3 text-[10px] font-medium tabular-nums text-[#718078]">
        24:00
      </span>
    </div>
  );
}

function HourLines() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-16 right-0">
      {Array.from({ length: 25 }, (_, hour) => (
        <div
          key={`hour-${hour}`}
          className="absolute left-0 right-0 border-t border-[#e8ece7]"
          style={{ top: hour * HOUR_HEIGHT }}
        />
      ))}
      {Array.from({ length: 48 }, (_, half) => (
        <div
          key={`half-${half}`}
          className="absolute left-0 right-0 border-t border-dashed border-[#f0f2ef]"
          style={{ top: half * (HOUR_HEIGHT / 2) }}
        />
      ))}
    </div>
  );
}

interface TaskLayout {
  task: Task;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

function layoutDayTasks(tasks: Task[], day: Date): TaskLayout[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const sorted = tasks
    .map((task) => ({
      task,
      start: Math.max(new Date(task.starts_at).valueOf(), dayStart.valueOf()),
      end: Math.min(new Date(task.ends_at).valueOf(), dayEnd.valueOf()),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const groups: typeof sorted[] = [];
  let currentGroup: typeof sorted = [];
  let groupEnd = 0;
  for (const item of sorted) {
    if (currentGroup.length && item.start >= groupEnd) {
      groups.push(currentGroup);
      currentGroup = [];
      groupEnd = 0;
    }
    currentGroup.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (currentGroup.length) groups.push(currentGroup);

  return groups.flatMap((group) => {
    const laneEnds: number[] = [];
    const placed = group.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      return { ...item, lane };
    });
    const lanes = Math.max(laneEnds.length, 1);
    return placed.map(({ task, start, end, lane }) => ({
      task,
      lane,
      lanes,
      top: ((start - dayStart.valueOf()) / 3_600_000) * HOUR_HEIGHT,
      height: Math.max(((end - start) / 3_600_000) * HOUR_HEIGHT, 26),
    }));
  });
}

function TimeTaskBlock({
  layout,
  projects,
  disabled,
  onEdit,
  onResize,
}: {
  layout: TaskLayout;
  projects: Project[];
  disabled: boolean;
  onEdit: () => void;
  onResize: (edge: "start" | "end", pixels: number) => void;
}) {
  const { task, lane, lanes, top, height } = layout;
  const primaryProject = projects[0];
  const [resizePreview, setResizePreview] = useState<{
    edge: "start" | "end";
    pixels: number;
  } | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: taskKey(task), data: { task }, disabled });
  const gap = 4;
  const width = `calc((100% - ${(lanes + 1) * gap}px) / ${lanes})`;
  const left = `calc(${(lane / lanes) * 100}% + ${gap}px)`;
  const minimumHeight = (MIN_TASK_MINUTES / 60) * HOUR_HEIGHT;
  const snappedResizePixels = resizePreview
    ? Math.round((resizePreview.pixels / HOUR_HEIGHT) * 4) *
      (HOUR_HEIGHT / 4)
    : 0;
  const resizePixels = resizePreview
    ? resizePreview.edge === "start"
      ? Math.min(snappedResizePixels, height - minimumHeight)
      : Math.max(snappedResizePixels, minimumHeight - height)
    : 0;
  const previewTop =
    resizePreview?.edge === "start" ? top + resizePixels : top;
  const previewHeight = resizePreview
    ? resizePreview.edge === "start"
      ? height - resizePixels
      : height + resizePixels
    : height;
  const previewStartsAt = new Date(task.starts_at);
  const previewEndsAt = new Date(task.ends_at);
  if (resizePreview?.edge === "start") {
    previewStartsAt.setMinutes(
      previewStartsAt.getMinutes() + (resizePixels / HOUR_HEIGHT) * 60,
    );
  }
  if (resizePreview?.edge === "end") {
    previewEndsAt.setMinutes(
      previewEndsAt.getMinutes() + (resizePixels / HOUR_HEIGHT) * 60,
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        top: previewTop,
        height: previewHeight,
        left,
        width,
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "absolute z-10 touch-none transition-[top,height,opacity] duration-100",
        isDragging && "opacity-20",
        resizePreview && "z-30",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEdit();
        }}
        className={cn(
          "relative h-full cursor-grab overflow-hidden rounded-lg border bg-white px-2 py-1.5 text-left shadow-sm outline-none transition-all duration-150 hover:z-20 hover:-translate-y-px hover:shadow-md active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#4f7665]",
          resizePreview &&
            "ring-2 ring-[#55796c]/35 shadow-[0_12px_30px_rgba(45,75,64,0.2)]",
          disabled && "cursor-wait opacity-60",
        )}
        style={{
          borderColor: `${primaryProject?.color ?? "#5F7169"}70`,
          backgroundColor: `${primaryProject?.color ?? "#5F7169"}14`,
          borderLeftWidth: 3,
        }}
      >
        <ResizeHandle
          edge="start"
          onPreview={(pixels) =>
            setResizePreview(
              pixels === null ? null : { edge: "start", pixels },
            )
          }
          onResize={onResize}
        />
        <TimeTaskContent
          task={task}
          projects={projects}
          compact={previewHeight < 52}
        />
        {resizePreview ? (
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#173b35] px-2 py-1 text-[9px] font-bold text-white shadow-lg">
            {formatTime(previewStartsAt.toISOString())}–
            {formatTime(previewEndsAt.toISOString())}
          </span>
        ) : null}
        <ResizeHandle
          edge="end"
          onPreview={(pixels) =>
            setResizePreview(
              pixels === null ? null : { edge: "end", pixels },
            )
          }
          onResize={onResize}
        />
      </div>
    </div>
  );
}

function ResizeHandle({
  edge,
  onPreview,
  onResize,
}: {
  edge: "start" | "end";
  onPreview: (pixels: number | null) => void;
  onResize: (edge: "start" | "end", pixels: number) => void;
}) {
  function pointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const move = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      onPreview(moveEvent.clientY - startY);
    };
    const up = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onPreview(null);
      onResize(edge, upEvent.clientY - startY);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { once: true });
  }

  return (
    <button
      type="button"
      onPointerDown={pointerDown}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Resize task ${edge} time`}
      className={cn(
        "absolute left-0 right-0 z-20 flex h-3 cursor-ns-resize touch-none items-center justify-center text-[#50665d] opacity-40 transition hover:bg-white/50 hover:opacity-100 focus:opacity-100 sm:opacity-0",
        edge === "start" ? "top-0" : "bottom-0",
      )}
    >
      <GripHorizontal className="size-3" />
    </button>
  );
}

function TimeTaskContent({
  task,
  projects,
  compact = false,
  overlay = false,
}: {
  task: Task;
  projects: Project[];
  compact?: boolean;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        overlay &&
          "w-52 scale-[1.04] rounded-xl border border-[#89a096] bg-white p-3 shadow-[0_24px_60px_rgba(30,58,49,0.25)]",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span className="truncate text-[9px] font-bold tabular-nums text-[#50665d]">
          {formatTime(task.starts_at)}–{formatTime(task.ends_at)}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase",
            STATUS_STYLES[task.status],
          )}
        >
          {statusLabel(task.status)}
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5">
        <TaskCategoryIcon
          category={primaryTaskCategory(task)}
          className="size-3 shrink-0 text-[#526d63]"
        />
        <p className="truncate text-[11px] font-semibold leading-4 text-[#263f38]">
          {task.title}
        </p>
      </div>
      {!compact ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[9px] font-medium text-[#6d7b75]">
            {projects.length
              ? `${projects[0].name}${projects.length > 1 ? ` +${projects.length - 1}` : ""}`
              : primaryTaskCategory(task)}
          </span>
          {task.weekly_repeat ? (
            <Repeat2 className="size-2.5 shrink-0 text-[#71856f]" />
          ) : (
            <GripVertical className="size-2.5 shrink-0 text-[#8d9993]" />
          )}
        </div>
      ) : null}
    </div>
  );
}

function taskKey(task: Task): string {
  return `${task.id}:${task.series_date}`;
}
