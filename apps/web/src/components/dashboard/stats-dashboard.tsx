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
  Layers3,
  ListFilter,
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
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "3_months", label: "Last 3 months" },
  { value: "6_months", label: "Last 6 months" },
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

const STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; soft: string }
> = {
  todo: { label: "Todo", color: "#8a9992", soft: "#eef1ee" },
  in_progress: {
    label: "In Progress",
    color: "#d29a3a",
    soft: "#fbf2df",
  },
  done: { label: "Done", color: "#4f7c68", soft: "#e8f0eb" },
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
        scope === "all"
          ? "mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10"
          : "py-2",
      )}
    >
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70867a]">
            {scope === "all" ? "Performance overview" : "Project analytics"}
          </p>
          <h1
            className={cn(
              "mt-2 font-semibold tracking-[-0.05em] text-[#172d2a]",
              scope === "all" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
            )}
          >
            {scope === "all" ? "Dashboard" : `${projectName ?? "Project"} statistics`}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6e7d76]">
            {scope === "all"
              ? "See how planned work turns into progress across your workspace."
              : "The same performance view, focused only on this project."}
          </p>
        </div>
        <DashboardFilters
          range={range}
          category={category}
          loading={loading}
          onRangeChange={setRange}
          onCategoryChange={setCategory}
        />
      </header>

      {stats ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7b8882]">
          <span>{formatPeriod(stats.period.starts_at, stats.period.ends_at)}</span>
          <span aria-hidden className="size-1 rounded-full bg-[#b9c2bc]" />
          <span>{stats.period.timezone}</span>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#4f6b60]">
              <LoaderCircle className="size-3.5 animate-spin" />
              Updating
            </span>
          ) : null}
        </div>
      ) : null}

      {error && stats ? (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-3 rounded-xl border border-[#ecd1cb] bg-[#fff8f6] px-4 py-3 text-sm text-[#91483f] sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error} The last loaded values remain visible.</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2.5 font-semibold hover:bg-[#f8e9e5] sm:self-auto"
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
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78877f]">
          Period
        </span>
        <div className="max-w-full overflow-x-auto rounded-xl border border-[#dce3da] bg-white p-1">
          <div className="flex min-w-max" role="group" aria-label="Dashboard period">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={range === option.value}
                disabled={loading && range === option.value}
                onClick={() => onRangeChange(option.value)}
                className={cn(
                  "min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors",
                  range === option.value
                    ? "bg-[#1f403a] text-white shadow-sm"
                    : "text-[#6e7b75] hover:bg-[#f0f3ee] hover:text-[#29483f]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <label className="block shrink-0">
        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78877f]">
          <ListFilter className="size-3.5" />
          Category
        </span>
        <select
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as TaskCategory | "")
          }
          className="h-11 w-full min-w-44 rounded-xl border border-[#dce3da] bg-white px-3 text-sm font-semibold text-[#344e46] outline-none transition focus:border-[#789487] focus:ring-2 focus:ring-[#789487]/20 sm:w-auto"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
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
      label: "Completed tasks",
      value: formatNumber(stats.summary.done_tasks),
      detail: `${formatNumber(stats.summary.total_tasks)} total in this period`,
      icon: CheckCircle2,
      trend: stats.trends.done_tasks,
      positiveUp: true,
    },
    {
      label: "Completion rate",
      value: formatPercentage(stats.summary.completion_rate),
      detail: "Done ÷ all tasks in this period",
      icon: Gauge,
      trend: stats.trends.completion_rate,
      positiveUp: true,
    },
    {
      label: "Completed planned time",
      value: formatDuration(stats.summary.completed_planned_minutes),
      detail: `${formatDuration(stats.summary.planned_minutes)} planned effort`,
      icon: Clock3,
      trend: stats.trends.completed_planned_minutes,
      positiveUp: true,
    },
    {
      label: "Open tasks",
      value: formatNumber(openTasks),
      detail: `${formatNumber(stats.summary.in_progress_tasks)} currently in progress`,
      icon: CircleDashed,
      trend: buildTrend(openTasks, previousOpen),
      positiveUp: false,
      neutral: true,
    },
  ];

  return (
    <div className="mt-6 space-y-5">
      {isEmpty ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#dce5da] bg-[#f9fbf7] px-4 py-3.5 text-sm text-[#5e7068]">
          <BarChart3 className="mt-0.5 size-4 shrink-0 text-[#66806f]" />
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Panel>
          <PanelHeader
            eyebrow="Activity"
            title="Task completion over time"
            description="Completed tasks compared with everything planned in each interval."
          />
          <ActivityChart stats={stats} />
        </Panel>
        <Panel>
          <PanelHeader
            eyebrow="Workflow"
            title="Status distribution"
            description="A compact view of what is waiting, active, and done."
          />
          <StatusDistribution stats={stats} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            eyebrow="Focus mix"
            title="Categories"
            description="Where tasks and completed planned time are concentrated."
          />
          <CategoryBreakdown stats={stats} />
        </Panel>
        <Panel>
          {scope === "all" ? (
            <>
              <PanelHeader
                eyebrow="Portfolio"
                title="Project progress"
                description="Done tasks divided by all tasks in the selected period."
              />
              <ProjectProgress stats={stats} />
            </>
          ) : (
            <>
              <PanelHeader
                eyebrow="Project pulse"
                title="Progress snapshot"
                description="A focused summary for the selected project and period."
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
    <article className="rounded-[20px] border border-[#dfe5dc] bg-white p-5 shadow-[0_8px_28px_rgba(35,53,46,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf2ea] text-[#4e6e61]">
          <Icon className="size-[18px]" />
        </span>
        <TrendBadge trend={trend} positiveUp={positiveUp} neutral={neutral} />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#77867f]">
        {label}
      </p>
      <p className="mt-2 text-[30px] font-semibold tracking-[-0.045em] text-[#1d3731]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#87938d]">{detail}</p>
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
        ? "No baseline"
        : direction === "flat"
          ? "No change"
          : `${Math.abs(trend.change_percent).toFixed(0)}%`;

  return (
    <span
      title="Compared with the immediately preceding equivalent period"
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-[10px] font-bold",
        neutral || (!isPositive && !isNegative)
          ? "bg-[#f0f2ef] text-[#68766f]"
          : isPositive
            ? "bg-[#e8f2ea] text-[#3c6c55]"
            : "bg-[#f9ece9] text-[#9a5148]",
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
    <div className="mt-5">
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
                  stroke="#e9ede8"
                  strokeWidth="1"
                />
                <text
                  x="32"
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#8a9690"
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
                  rx="5"
                  fill="#e3e9e3"
                />
                <rect
                  x={x}
                  y={baseline - doneHeight}
                  width={barWidth}
                  height={doneHeight}
                  rx="5"
                  fill="#557d69"
                />
                {showLabel ? (
                  <text
                    x={x + barWidth / 2}
                    y={baseline + 24}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#7c8983"
                  >
                    {shortChartLabel(item.label)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ec] pt-3">
        <div className="flex items-center gap-4 text-xs text-[#718079]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[#557d69]" /> Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-[#e3e9e3]" /> Total
          </span>
        </div>
        <p className="text-xs font-semibold text-[#5e7068]">
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
    ? `conic-gradient(${STATUS_META.todo.color} 0 ${todoEnd}%, ${STATUS_META.in_progress.color} ${todoEnd}% ${progressEnd}%, ${STATUS_META.done.color} ${progressEnd}% 100%)`
    : "#edf0ed";

  return (
    <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row xl:flex-col 2xl:flex-row">
      <div
        className="relative flex size-40 shrink-0 items-center justify-center rounded-full"
        style={{ background }}
        aria-label={`${stats.summary.done_tasks} of ${stats.summary.total_tasks} tasks done`}
      >
        <div className="flex size-[112px] flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_#eef1ed]">
          <span className="text-2xl font-semibold tracking-[-0.04em] text-[#213c35]">
            {formatPercentage(stats.summary.completion_rate)}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#87938d]">
            complete
          </span>
        </div>
      </div>
      <div className="w-full space-y-3">
        {values.map((item) => (
          <div
            key={item.status}
            className="flex items-center gap-3 rounded-xl border border-[#edf0ec] px-3 py-2.5"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_META[item.status].color }}
            />
            <span className="min-w-0 flex-1 text-sm font-medium text-[#52665e]">
              {STATUS_META[item.status].label}
            </span>
            <span className="text-sm font-semibold text-[#243f38]">{item.count}</span>
            <span className="w-10 text-right text-xs text-[#89958f]">
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
    <div className="mt-5 max-h-[420px] space-y-4 overflow-y-auto pr-1">
      {items.map((item) => (
        <div key={item.category}>
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#edf2ec] text-[#506e62]">
              <TaskCategoryIcon category={item.category} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#344c45]">
                {categoryLabel(item.category)}
              </p>
              <p className="text-[11px] text-[#85918b]">
                {item.done_count} done · {formatDuration(item.completed_planned_minutes)} completed
              </p>
            </div>
            <span className="text-xs font-semibold text-[#5f7169]">
              {item.count} task{item.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#edf0ec]">
            <div
              className="h-full rounded-full bg-[#6d897a] transition-[width] duration-500"
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
    <div className="mt-5 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
      {stats.project_progress.map((project) => (
        <Link
          key={project.project_id}
          href={`/projects/${project.project_id}/statistics`}
          className="group block rounded-xl border border-[#e6ebe5] p-3.5 transition hover:border-[#cbd7ce] hover:bg-[#fafbf9]"
        >
          <div className="flex items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#314a43]">
              {project.name}
            </span>
            <span className="text-xs font-semibold text-[#5b6e66]">
              {formatPercentage(project.completion_rate)}
            </span>
            <ArrowRight className="size-3.5 text-[#93a098] transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0ec]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(100, project.completion_rate)}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-[#84908a]">
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
    <div className="mt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-[-0.05em] text-[#1e3932]">
            {formatPercentage(stats.summary.completion_rate)}
          </p>
          <p className="mt-1 text-xs text-[#7d8a84]">period completion</p>
        </div>
        <Layers3 className="size-8 text-[#9caaa3]" />
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf0ec]">
        <div
          className="h-full rounded-full bg-[#557d69] transition-[width] duration-500"
          style={{ width: `${Math.min(100, stats.summary.completion_rate)}%` }}
        />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
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
    <div className="rounded-xl border border-[#e9ede8] bg-[#fafbf9] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#84918b]">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-[#304b43]">{value}</p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <article className="min-w-0 rounded-[22px] border border-[#dfe5dc] bg-white p-5 shadow-[0_8px_28px_rgba(35,53,46,0.035)] sm:p-6">
      {children}
    </article>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#789084]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-[#223d36]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-[#84908a]">{description}</p>
    </div>
  );
}

function CompactEmpty({ label }: { label: string }) {
  return (
    <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe5dd] bg-[#fafbf9] px-4 text-center">
      <FolderKanban className="size-6 text-[#9aa69f]" />
      <p className="mt-3 text-sm text-[#77847e]">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 animate-pulse space-y-5" aria-label="Loading dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 rounded-[20px] border border-[#e2e7e0] bg-white p-5">
            <div className="size-10 rounded-xl bg-[#edf1ec]" />
            <div className="mt-7 h-3 w-24 rounded bg-[#edf1ec]" />
            <div className="mt-4 h-8 w-32 rounded bg-[#e7ece7]" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_0.75fr]">
        <div className="h-[390px] rounded-[22px] border border-[#e2e7e0] bg-white" />
        <div className="h-[390px] rounded-[22px] border border-[#e2e7e0] bg-white" />
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
    <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-[22px] border border-[#ecd4ce] bg-white px-6 text-center">
      <BarChart3 className="size-8 text-[#a66a60]" />
      <h2 className="mt-4 text-lg font-semibold text-[#553a35]">
        Dashboard unavailable
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#816b66]">{message}</p>
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
