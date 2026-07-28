import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckSquare2,
  FileText,
  Lightbulb,
  Palette,
} from "lucide-react";

import type { Project } from "@/lib/api";

const destinations = [
  {
    label: "Tasks",
    description: "Plan this project's work one day at a time.",
    icon: CheckSquare2,
    suffix: "/tasks",
  },
  {
    label: "Future Plans",
    description: "Capture ideas before they become scheduled work.",
    icon: Lightbulb,
    suffix: "/future-plans",
  },
  {
    label: "Notes",
    description: "Keep decisions and useful context close to the work.",
    icon: FileText,
    suffix: "/notes",
  },
  {
    label: "Statistics",
    description: "Review progress, effort, categories, and trends.",
    icon: BarChart3,
    suffix: "/statistics",
  },
] as const;

export function ProjectOverviewSection({ project }: { project: Project }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Choose where to focus
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each area has a clear job, so plans, daily execution, context, and
            progress stay easy to find.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {destinations.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={`/projects/${project.id}${item.suffix}`}
                className="group flex min-h-36 flex-col rounded-md border border-border bg-muted p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-notion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-md"
                    style={{
                      color: project.color,
                      backgroundColor: `${project.color}16`,
                    }}
                  >
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {item.label}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="mt-1 text-xl font-semibold text-foreground">
          Project details
        </h2>

        <dl className="mt-5 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {project.status.replace("_", " ")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Palette className="size-3.5" aria-hidden />
              Project color
            </dt>
            <dd className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.color.toUpperCase()}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-xs font-medium text-muted-foreground">Created</dt>
            <dd className="text-xs font-semibold text-foreground">
              {formatDate(project.created_at)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
            <dt className="text-xs font-medium text-muted-foreground">Last updated</dt>
            <dd className="text-xs font-semibold text-foreground">
              {formatDate(project.updated_at)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 rounded-md bg-muted p-4">
          <p className="text-xs font-semibold text-foreground">Project purpose</p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {project.description ||
              "No description yet. Edit the project to document the outcome you want to achieve."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
