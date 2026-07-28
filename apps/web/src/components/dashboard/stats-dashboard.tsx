"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderKanban,
  Gauge,
  LoaderCircle,
  Minus,
  RotateCcw,
} from "lucide-react";

import { TaskCategoryIcon } from "@/components/tasks/task-category-icon";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  DashboardRange,
  DashboardStats,
  DashboardTrend,
  TaskCategory,
  TaskStatus,
  getDashboardStats,
  getProjectStats,
} from "@/lib/api";
import { STATUS_COLORS } from "@/lib/task-status";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "3_months", label: "3 months" },
  { value: "6_months", label: "6 months" },
];

const CATEGORY_OPTIONS: Array<{ value: TaskCategory; label: string }> = [
  { value: "coding", label: "Coding" },
  { value: "reading", label: "Reading" },
  { value: "meeting", label: "Meeting" },
  { value: "study", label: "Study" },
  { value: "planning", label: "Planning" },
  { value: "personal", label: "Personal" },
  { value: "exercise", label: "Exercise" },
  { value: "other", label: "Other" },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

interface StatsDashboardProps {
  scope: "all" | "project";
  projectId?: string;
}

export function StatsDashboard({ scope, projectId }: StatsDashboardProps) {
  const [range, setRange] = useState<DashboardRange>("week");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const nextRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const nextStats =
        scope === "project"
          ? await getProjectStats(projectId ?? "", range, category || undefined)
          : await getDashboardStats(range, category || undefined);
      if (nextRequestId === requestId.current) setStats(nextStats);
    } catch (caught) {
      if (nextRequestId !== requestId.current) return;
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Dashboard data could not be loaded.",
      );
    } finally {
      if (nextRequestId === requestId.current) setLoading(false);
    }
  }, [category, projectId, range, scope]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const projectName = stats?.scope.project_name;

  return (
    <div
      className={cn(
        "relative",
        scope === "all" ? "mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8" : "py-2",
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className={cn(
              "font-bold tracking-tight",
              scope === "all" ? "text-2xl" : "text-xl",
            )}
          >
            {scope === "all" ? "Dashboard" : `${projectName ?? "Project"} statistics`}
          </h1>
          {stats ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {formatPeriod(stats.period.starts_at, stats.period.ends_at)}
              <span aria-hidden className="size-1 rounded-full bg-border" />
              {stats.period.timezone}
              {loading ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  <LoaderCircle className="size-3 animate-spin" />
                  Updating
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <DashboardFilters
          range={range}
          category={category}
          loading={loading}
          onRangeChange={setRange}
          onCategoryChange={setCategory}
        />
      </header>

      {error && stats ? (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error} The last loaded values remain visible.</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-8 items-center gap-1.5 self-start rounded-md px-2 font-medium hover:bg-destructive/10 sm:self-auto"
          >
            <RotateCcw className="size-3.5" />
            Try again
          </button>
        </div>
      ) : null}

      {!stats && loading ? (
        <DashboardSkeleton />
      ) : !stats && error ? (
        <DashboardError message={error} onRetry={() => void load()} />
      ) : stats ? (
        <DashboardContent stats={stats} scope={scope} />
      ) : null}
    </div>
  );
}

function DashboardFilters({
  range,
  category,
  loading,
  onRangeChange,
  onCategoryChange,
}: {
  range: DashboardRange;
  category: TaskCategory | "";
  loading: boolean;
  onRangeChange: (range: DashboardRange) => void;
  onCategoryChange: (category: TaskCategory | "") => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="max-w-full overflow-x-auto rounded-md border border-border bg-muted p-0.5">
        <div className="flex min-w-max" role="group" aria-label="Dashboard period">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              disabled={loading && range === option.value}
              onClick={() => onRangeChange(option.value)}
              className={cn(
                "min-h-7 rounded px-2.5 text-xs font-medium transition-colors",
                range === option.value
                  ? "bg-card text-foreground shadow-notion"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <select
        value={category}
        aria-label="Category filter"
        onChange={(event) =>
          onCategoryChange(event.target.value as TaskCategory | "")
        }
        className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
      >
        <option value="">All categories</option>
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DashboardContent({
  stats,
  scope,
}: {
  stats: DashboardStats;
  scope: "all" | "project";
}) {
  const openTasks = stats.summary.todo_tasks + stats.summary.in_progress_tasks;
  const previousOpen =
    stats.previous_summary.todo_tasks + stats.previous_summary.in_progress_tasks;
  const isEmpty = stats.summary.total_tasks === 0;

  const cards = [
    {
      label: "Completed",
      value: formatNumber(stats.summary.done_tasks),
      detail: `${formatNumber(stats.summary.total_tasks)} total in period`,
      icon: CheckCircle2,
      trend: stats.trends.done_tasks,
      positiveUp: true,
    },
    {
      label: "Completion rate",
      value: formatPercentage(stats.summary.completion_rate),
      detail: "Done ÷ all tasks",
      icon: Gauge,
      trend: stats.trends.completion_rate,
      positiveUp: true,
    },
    {
      label: "Completed time",
      value: formatDuration(stats.summary.completed_planned_minutes),
      detail: `${formatDuration(stats.summary.planned_minutes)} planned`,
      icon: Clock3,
      trend: stats.trends.completed_planned_minutes,
      positiveUp: true,
    },
    {
      label: "Open tasks",
      value: formatNumber(openTasks),
      detail: `${formatNumber(stats.summary.in_progress_tasks)} in progress`,
      icon: CircleDashed,
      trend: buildTrend(openTasks, previousOpen),
      positiveUp: false,
      neutral: true,
    },
  ];

  return (
    <div className="mt-5 space-y-4">
      {isEmpty ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted px-3.5 py-3 text-sm text-muted-foreground">
          <BarChart3 className="mt-0.5 size-4 shrink-0" />
          <p>
            No tasks match this period and category yet. Your dashboard will
            update as soon as work is planned.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Performance summary">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Panel>
          <PanelHeader
            title="Completion over time"
            description="Completed tasks vs. everything planned in each interval."
          />
          <ActivityChart stats={stats} />
        </Panel>
        <Panel>
          <PanelHeader
            title="Status"
            description="What is waiting, active, and done."
          />
          <StatusDistribution stats={stats} />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Categories"
            description="Where tasks and completed time are concentrated."
          />
          <CategoryBreakdown stats={stats} />
        </Panel>
        <Panel>
          {scope === "all" ? (
            <>
              <PanelHeader
                title="Project progress"
                description="Done tasks ÷ all tasks in the selected period."
              />
              <ProjectProgress stats={stats} />
            </>
          ) : (
            <>
              <PanelHeader
                title="Progress snapshot"
                description="A focused summary for this project and period."
              />
              <ProjectSnapshot stats={stats} />
            </>
          )}
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  positiveUp,
  neutral = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CheckCircle2;
  trend: DashboardTrend;
  positiveUp: boolean;
  neutral?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-notion">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" strokeWidth={1.8} />
          {label}
        </p>
        <TrendBadge trend={trend} positiveUp={positiveUp} neutral={neutral} />
      </div>
      <p className="mt-3 text-[26px] font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function TrendBadge({
  trend,
  positiveUp,
  neutral,
}: {
  trend: DashboardTrend;
  positiveUp: boolean;
  neutral: boolean;
}) {
  const direction = trend.direction;
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;
  const isPositive = positiveUp
    ? direction === "up" || direction === "new"
    : direction === "down";
  const isNegative = positiveUp ? direction === "down" : direction === "up";
  const label =
    direction === "new"
      ? "New"
      : trend.change_percent === null
        ? "–"
        : direction === "flat"
          ? "0%"
          : `${Math.abs(trend.change_percent).toFixed(0)}%`;

  return (
    <span
      title="Compared with the immediately preceding equivalent period"
      className={cn(
        "inline-flex min-h-5 items-center gap-0.5 rounded px-1.5 text-[11px] font-medium",
        neutral || (!isPositive && !isNegative)
          ? "bg-[#f1f0ef] text-[#787774]"
          : isPositive
            ? "bg-[#dbeddb] text-[#448361]"
            : "bg-[#fdebec] text-[#d44c47]",
      )}
    >
      <Icon className="size-3" />
      {label}
      <span className="sr-only"> compared with the previous period</span>
    </span>
  );
}

function ActivityChart({ stats }: { stats: DashboardStats }) {
  const items = stats.series;
  if (!items.some((item) => item.total_tasks > 0)) {
    return <CompactEmpty label="No task activity to chart for this selection." />;
  }

  const width = Math.max(520, items.length * 38 + 64);
  const height = 232;
  const plotTop = 18;
  const plotHeight = 142;
  const baseline = plotTop + plotHeight;
  const maxValue = Math.max(1, ...items.map((item) => item.total_tasks));
  const step = (width - 72) / Math.max(items.length, 1);
  const barWidth = Math.min(20, step * 0.58);
  const labelEvery = items.length > 16 ? Math.ceil(items.length / 8) : 1;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto pb-1">
        <svg
          role="img"
          aria-label="Task activity chart showing total and completed tasks"
          viewBox={`0 0 ${width} ${height}`}
          className="h-[232px] min-w-[520px]"
          style={{ width }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = baseline - plotHeight * ratio;
            return (
              <g key={ratio}>
                <line
                  x1="42"
                  x2={width - 16}
                  y1={y}
                  y2={y}
                  stroke="#efefed"
                  strokeWidth="1"
                />
                <text
                  x="32"
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9b9a97"
                >
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            );
          })}
          {items.map((item, index) => {
            const x = 48 + index * step + (step - barWidth) / 2;
            const totalHeight = (item.total_tasks / maxValue) * plotHeight;
            const doneHeight = (item.done_tasks / maxValue) * plotHeight;
            const showLabel = index % labelEvery === 0 || index === items.length - 1;
            return (
              <g key={`${item.starts_at}-${index}`}>
                <title>{`${item.label}: ${item.done_tasks} completed of ${item.total_tasks}; ${formatDuration(item.completed_planned_minutes)} completed planned time`}</title>
                <rect
                  x={x}
                  y={baseline - totalHeight}
                  width={barWidth}
                  height={Math.max(totalHeight, 2)}
                  rx="3"
                  fill="#e9e9e7"
                />
                <rect
                  x={x}
                  y={baseline - doneHeight}
                  width={barWidth}
                  height={doneHeight}
                  rx="3"
                  fill="#2383e2"
                />
                {showLabel ? (
                  <text
                    x={x + barWidth / 2}
                    y={baseline + 24}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9b9a97"
                  >
                    {shortChartLabel(item.label)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[#2383e2]" /> Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[#e9e9e7]" /> Total
          </span>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {formatDuration(stats.summary.completed_planned_minutes)} completed planned time
        </p>
      </div>
    </div>
  );
}

function StatusDistribution({ stats }: { stats: DashboardStats }) {
  const values = (["todo", "in_progress", "done"] as TaskStatus[]).map(
    (status) =>
      stats.status_distribution.find((item) => item.status === status) ?? {
        status,
        count: 0,
        percentage: 0,
      },
  );
  const todoEnd = values[0].percentage;
  const progressEnd = todoEnd + values[1].percentage;
  const background = stats.summary.total_tasks
    ? `conic-gradient(${STATUS_COLORS.todo} 0 ${todoEnd}%, ${STATUS_COLORS.in_progress} ${todoEnd}% ${progressEnd}%, ${STATUS_COLORS.done} ${progressEnd}% 100%)`
    : "#f1f0ef";

  return (
    <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
      <div
        className="relative flex size-36 shrink-0 items-center justify-center rounded-full"
        style={{ background }}
        aria-label={`${stats.summary.done_tasks} of ${stats.summary.total_tasks} tasks done`}
      >
        <div className="flex size-[100px] flex-col items-center justify-center rounded-full bg-card shadow-[inset_0_0_0_1px_#efefed]">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {formatPercentage(stats.summary.completion_rate)}
          </span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            complete
          </span>
        </div>
      </div>
      <div className="w-full space-y-2">
        {values.map((item) => (
          <div
            key={item.status}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[item.status] }}
            />
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
              {STATUS_LABELS[item.status]}
            </span>
            <span className="text-sm font-semibold text-foreground">{item.count}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">
              {formatPercentage(item.percentage)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBreakdown({ stats }: { stats: DashboardStats }) {
  const items = stats.category_breakdown;
  if (!items.length) {
    return <CompactEmpty label="No category data for this selection." />;
  }
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className="mt-4 max-h-[420px] space-y-4 overflow-y-auto pr-1">
      {items.map((item) => (
        <div key={item.category}>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <TaskCategoryIcon category={item.category} className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {categoryLabel(item.category)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {item.done_count} done · {formatDuration(item.completed_planned_minutes)} completed
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {item.count} task{item.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-[#2383e2] transition-[width] duration-500"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectProgress({ stats }: { stats: DashboardStats }) {
  if (!stats.project_progress.length) {
    return <CompactEmpty label="No project-linked tasks in this selection." />;
  }
  return (
    <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
      {stats.project_progress.map((project) => (
        <Link
          key={project.project_id}
          href={`/projects/${project.project_id}/statistics`}
          className="group block rounded-md border border-border p-3 transition hover:bg-muted"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {project.name}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {formatPercentage(project.completion_rate)}
            </span>
            <ArrowRight className="size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(100, project.completion_rate)}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span>
              {project.completed_tasks} of {project.total_tasks} done
            </span>
            <span>{formatDuration(project.completed_planned_minutes)} completed</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProjectSnapshot({ stats }: { stats: DashboardStats }) {
  const open = stats.summary.todo_tasks + stats.summary.in_progress_tasks;
  return (
    <div className="mt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {formatPercentage(stats.summary.completion_rate)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">period completion</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-[#2383e2] transition-[width] duration-500"
          style={{ width: `${Math.min(100, stats.summary.completion_rate)}%` }}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <SnapshotCell label="Completed" value={stats.summary.done_tasks.toString()} />
        <SnapshotCell label="Open" value={open.toString()} />
        <SnapshotCell
          label="Planned effort"
          value={formatDuration(stats.summary.planned_minutes)}
        />
        <SnapshotCell
          label="Completed time"
          value={formatDuration(stats.summary.completed_planned_minutes)}
        />
      </div>
    </div>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-notion sm:p-5">
      {children}
    </article>
  );
}

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function CompactEmpty({ label }: { label: string }) {
  return (
    <div className="mt-4 flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted px-4 text-center">
      <FolderKanban className="size-6 text-muted-foreground/60" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-5 animate-pulse space-y-4" aria-label="Loading dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-lg border border-border bg-card p-4">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-5 h-7 w-20 rounded bg-secondary" />
            <div className="mt-2 h-3 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.65fr_0.75fr]">
        <div className="h-[360px] rounded-lg border border-border bg-card" />
        <div className="h-[360px] rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-lg border border-border bg-card px-6 text-center">
      <BarChart3 className="size-7 text-muted-foreground/60" />
      <h2 className="mt-4 text-base font-semibold">Dashboard unavailable</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-5">
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

function buildTrend(current: number, previous: number): DashboardTrend {
  if (previous === 0) {
    return {
      current,
      previous,
      change_percent: current === 0 ? 0 : null,
      direction: current === 0 ? "flat" : "new",
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    change_percent: change,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return "Selected period";
  }
  const format = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: startDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
  return `${format.format(startDate)} – ${format.format(endDate)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) return `${safeMinutes}m`;
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function categoryLabel(category: TaskCategory): string {
  return CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

function shortChartLabel(label: string): string {
  return label.length > 8 ? label.slice(0, 8) : label;
}
