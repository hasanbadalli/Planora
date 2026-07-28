import type { TaskStatus } from "@/lib/api";

export const TASK_STATUSES: { value: TaskStatus; label: string; shortLabel: string }[] = [
  { value: "todo", label: "To do", shortLabel: "To do" },
  { value: "in_progress", label: "In progress", shortLabel: "In progress" },
  { value: "done", label: "Done", shortLabel: "Done" },
];

/* Notion-style tag colors: quiet gray / blue / green pills. */
export const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "border-transparent bg-[#f1f0ef] text-[#787774]",
  in_progress: "border-transparent bg-[#e7f3f8] text-[#2b6a9b]",
  done: "border-transparent bg-[#dbeddb] text-[#448361]",
};

/* Solid dot / chart colors matching the tag palette. */
export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#9b9a97",
  in_progress: "#337ea9",
  done: "#448361",
};

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUSES.find((item) => item.value === status)?.label ?? status;
}
