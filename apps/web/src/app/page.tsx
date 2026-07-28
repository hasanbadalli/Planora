import Link from "next/link";
import { ArrowRight, CalendarDays, Layers3, Repeat2 } from "lucide-react";

import { Brand } from "@/components/brand";

const features = [
  {
    icon: CalendarDays,
    title: "Week at a glance",
    text: "A calm weekly calendar with an hour-by-hour day view.",
  },
  {
    icon: Layers3,
    title: "Projects with context",
    text: "Tasks, notes, and future plans stay close to the work.",
  },
  {
    icon: Repeat2,
    title: "Weekly routines",
    text: "Set a recurring task once and it shows up when it should.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5">
        <Brand />
        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Plan your day.{" "}
          <span className="relative inline-block">
            See your week.
            <Squiggle className="absolute -bottom-2 left-0 w-full text-primary" />
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-muted-foreground">
          Planora keeps your calendar, tasks, and projects in one quiet
          workspace — so every day has direction.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start planning
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-border bg-card px-5 text-sm font-medium hover:bg-accent"
          >
            Log in
          </Link>
        </div>

        <WeekPreview />
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-4xl gap-8 px-5 py-14 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-left">
              <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-foreground">
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 text-xs text-muted-foreground">
          <Brand compact />
          <p>© 2026 Planora</p>
        </div>
      </footer>
    </main>
  );
}

/* Hand-drawn underline accent. */
function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 12"
      fill="none"
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d="M3 8.5C40 3.5 76 3 110 5.5C148 8.3 184 8 217 4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WeekPreview() {
  const days = [
    { label: "Mon", date: 27, tasks: [] },
    { label: "Tue", date: 28, tasks: [{ time: "09:00", title: "Focus coding", color: "#337EA9" }] },
    { label: "Wed", date: 29, tasks: [{ time: "14:00", title: "Project review", color: "#448361" }] },
    { label: "Thu", date: 30, tasks: [] },
    { label: "Fri", date: 31, tasks: [{ time: "10:30", title: "Read & reflect", color: "#9065B0" }] },
  ];
  return (
    <div className="mt-14 overflow-hidden rounded-lg border border-border bg-card text-left shadow-notion-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">This week</p>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          July 27 – 31
        </span>
      </div>
      <div className="grid grid-cols-5 divide-x divide-border">
        {days.map((day) => (
          <div key={day.label} className="min-h-44 p-2 sm:min-h-52">
            <p className="text-center text-[10px] font-medium uppercase text-muted-foreground">
              {day.label}
            </p>
            <p className="mt-0.5 text-center text-sm font-semibold">{day.date}</p>
            {day.tasks.map((task) => (
              <div
                key={task.title}
                className="mt-3 rounded-md border-l-2 bg-muted p-1.5"
                style={{ borderLeftColor: task.color }}
              >
                <p className="text-[9px] font-medium text-muted-foreground">
                  {task.time}
                </p>
                <p className="mt-0.5 text-[10px] font-medium leading-3.5 sm:text-[11px]">
                  {task.title}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
