import { CheckCircle2, Circle, ListChecks, TimerReset } from "lucide-react";

import type { Task } from "@/lib/api";

export function TaskSummary({ tasks }: { tasks: Task[] }) {
  const items = [
    { label: "Total", value: tasks.length, icon: ListChecks, tone: "text-foreground" },
    { label: "To do", value: tasks.filter((task) => task.status === "todo").length, icon: Circle, tone: "text-[#787774]" },
    { label: "In progress", value: tasks.filter((task) => task.status === "in_progress").length, icon: TimerReset, tone: "text-[#337ea9]" },
    { label: "Done", value: tasks.filter((task) => task.status === "done").length, icon: CheckCircle2, tone: "text-[#448361]" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 shadow-notion"
        >
          <Icon className={`size-4 shrink-0 ${tone}`} strokeWidth={1.8} />
          <p className="text-sm text-muted-foreground">
            <span className="mr-1.5 font-semibold text-foreground">{value}</span>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
