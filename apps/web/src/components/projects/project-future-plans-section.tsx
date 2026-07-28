"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Edit3, Lightbulb, LoaderCircle, Plus } from "lucide-react";

import { FuturePlanDialog } from "@/components/projects/future-plan-dialog";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  FuturePlan,
  Project,
  getFuturePlans,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type PlanFilter = "all" | FuturePlan["status"];

const filters: Array<{ value: PlanFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function ProjectFuturePlansSection({ project }: { project: Project }) {
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuturePlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await getFuturePlans(project.id));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Future plans could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const visiblePlans = useMemo(
    () =>
      filter === "all"
        ? plans
        : plans.filter((plan) => plan.status === filter),
    [filter, plans],
  );

  function savedPlan(value: FuturePlan) {
    setPlans((items) =>
      items.some((item) => item.id === value.id)
        ? items.map((item) => (item.id === value.id ? value : item))
        : [...items, value],
    );
    setMessage(editing ? "Future plan updated." : "Future plan created.");
    setEditing(null);
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Future Plans
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep promising ideas visible without forcing them onto today&apos;s schedule.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={project.status === "archived"}
        >
          <Plus aria-hidden />
          Add future plan
        </Button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => {
          const count =
            item.value === "all"
              ? plans.length
              : plans.filter((plan) => plan.status === item.value).length;
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-11 min-w-max items-center gap-2 rounded-md border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground hover:bg-card",
              )}
            >
              {item.label}
              <span className="rounded-full bg-card/80 px-1.5 py-0.5 text-[9px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-[#d3e5d4] bg-[#edf3ec] px-3.5 py-2.5 text-sm text-[#448361]"
        >
          {message}
        </p>
      ) : null}

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
          Loading future plans...
        </div>
      ) : visiblePlans.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlans.map((plan) => (
            <article
              key={plan.id}
              className="group flex min-h-48 flex-col rounded-md border border-border bg-muted p-4 transition-all hover:border-border hover:bg-card hover:shadow-notion"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-medium",
                    plan.status === "completed"
                      ? "bg-[#dbeddb] text-[#448361]"
                      : plan.status === "in_progress"
                        ? "bg-[#e7f3f8] text-[#2b6a9b]"
                        : "bg-[#f1f0ef] text-[#787774]",
                  )}
                >
                  {plan.status.replace("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(plan);
                    setMessage(null);
                    setOpen(true);
                  }}
                  aria-label={`Edit ${plan.title}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Edit3 className="size-4" aria-hidden />
                </button>
              </div>
              <h3 className="mt-3 break-words text-base font-semibold text-foreground">
                {plan.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {plan.description || "No details added yet."}
              </p>
              <div className="mt-auto pt-4">
                {plan.target_date ? (
                  <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[10px] font-medium text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Target {formatTargetDate(plan.target_date)}
                  </p>
                ) : (
                  <p className="border-t border-border pt-3 text-[10px] font-medium text-muted-foreground">
                    No target date
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-border bg-muted px-5 py-14 text-center">
          <Lightbulb className="mx-auto size-7 text-muted-foreground" aria-hidden />
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {plans.length ? "No plans match this filter" : "No future plans yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {plans.length
              ? "Choose another status to see the rest of your plans."
              : "Capture an idea now and turn it into scheduled work when the time is right."}
          </p>
        </div>
      )}

      <FuturePlanDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditing(null);
        }}
        projectId={project.id}
        plan={editing}
        onSaved={savedPlan}
      />
    </section>
  );
}

function formatTargetDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
