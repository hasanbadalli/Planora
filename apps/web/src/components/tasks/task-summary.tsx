import { CheckCircle2, Circle, ListChecks, TimerReset } from "lucide-react";

import type { Task } from "@/lib/api";

export function TaskSummary({ tasks }: { tasks: Task[] }) {
  const items = [
    { label: "Total", value: tasks.length, icon: ListChecks, tone: "bg-[#eef2eb] text-[#476057]" },
    { label: "Todo", value: tasks.filter((task) => task.status === "todo").length, icon: Circle, tone: "bg-slate-100 text-slate-600" },
    { label: "In Progress", value: tasks.filter((task) => task.status === "in_progress").length, icon: TimerReset, tone: "bg-amber-50 text-amber-700" },
    { label: "Done", value: tasks.filter((task) => task.status === "done").length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
  ];
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map(({ label, value, icon: Icon, tone }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-[#e0e6de] bg-white px-3 py-3"><div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></div><div><p className="text-lg font-semibold leading-none text-[#213a34]">{value}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7b8882]">{label}</p></div></div>)}</div>;
}
