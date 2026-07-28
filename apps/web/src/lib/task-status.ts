import type { TaskStatus } from "@/lib/api";

export const TASK_STATUSES: { value: TaskStatus; label: string; shortLabel: string }[] = [
  { value: "todo", label: "Todo", shortLabel: "Todo" },
  { value: "in_progress", label: "In Progress", shortLabel: "In progress" },
  { value: "done", label: "Done", shortLabel: "Done" },
];

export const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "border-slate-200 bg-slate-50 text-slate-600",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status;
}
