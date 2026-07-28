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
    <section className="rounded-[22px] border border-[#dce3da] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74847b]">
            Later, not lost
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#233d36]">
            Future Plans
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74817b]">
            Keep promising ideas visible without forcing them onto today&apos;s schedule.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          disabled={project.status === "archived"}
          className="min-h-11 rounded-xl bg-[#173b35] text-white"
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
                "inline-flex min-h-11 min-w-max items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]",
                active
                  ? "border-[#b9c9bc] bg-[#eaf0e9] text-[#2d5147]"
                  : "border-[#e0e6df] bg-[#fbfcfa] text-[#718078] hover:bg-white",
              )}
            >
              {item.label}
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[#cfe0d3] bg-[#f1f8f1] px-4 py-3 text-sm text-[#356044]"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#77857f]">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading future plans...
        </div>
      ) : visiblePlans.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlans.map((plan) => (
            <article
              key={plan.id}
              className="group flex min-h-48 flex-col rounded-2xl border border-[#e0e6df] bg-[#fbfcfa] p-4 transition-all hover:border-[#ccd7ce] hover:bg-white hover:shadow-[0_10px_28px_rgba(40,60,51,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]",
                    plan.status === "completed"
                      ? "bg-[#e5f3e8] text-[#3f6d4b]"
                      : plan.status === "in_progress"
                        ? "bg-[#fff1d8] text-[#8a641f]"
                        : "bg-[#e9eef4] text-[#52677b]",
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
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#7e8b85] transition-colors hover:bg-[#eef2ed] hover:text-[#34564c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]"
                >
                  <Edit3 className="size-4" aria-hidden />
                </button>
              </div>
              <h3 className="mt-3 break-words text-base font-semibold text-[#29423b]">
                {plan.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#7b8882]">
                {plan.description || "No details added yet."}
              </p>
              <div className="mt-auto pt-4">
                {plan.target_date ? (
                  <p className="flex items-center gap-1.5 border-t border-[#e9ede8] pt-3 text-[10px] font-semibold text-[#7e8c85]">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Target {formatTargetDate(plan.target_date)}
                  </p>
                ) : (
                  <p className="border-t border-[#e9ede8] pt-3 text-[10px] font-medium text-[#919c97]">
                    No target date
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dce3da] bg-[#fbfcfa] px-5 py-14 text-center">
          <Lightbulb className="mx-auto size-7 text-[#83928a]" aria-hidden />
          <h3 className="mt-4 text-base font-semibold text-[#304a43]">
            {plans.length ? "No plans match this filter" : "No future plans yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#7d8a84]">
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
