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
      <section className="rounded-[22px] border border-[#dce3da] bg-white p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74847b]">
            Project workspace
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#233d36]">
            Choose where to focus
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74817b]">
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
                className="group flex min-h-36 flex-col rounded-2xl border border-[#e0e6df] bg-[#fbfcfa] p-4 transition-all hover:-translate-y-0.5 hover:border-[#cbd7cd] hover:bg-white hover:shadow-[0_10px_28px_rgba(40,60,51,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{
                      color: project.color,
                      backgroundColor: `${project.color}16`,
                    }}
                  >
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <ArrowUpRight
                    className="size-4 text-[#91a099] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#29423b]">
                  {item.label}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#7b8882]">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="rounded-[22px] border border-[#dce3da] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74847b]">
          At a glance
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#29423b]">
          Project details
        </h2>

        <dl className="mt-5 divide-y divide-[#edf0ec]">
          <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
            <dt className="text-xs font-medium text-[#7b8882]">Status</dt>
            <dd className="rounded-full bg-[#eef2ed] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5f7168]">
              {project.status.replace("_", " ")}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="flex items-center gap-2 text-xs font-medium text-[#7b8882]">
              <Palette className="size-3.5" aria-hidden />
              Project color
            </dt>
            <dd className="flex items-center gap-2 text-xs font-semibold text-[#425b52]">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              {project.color.toUpperCase()}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-xs font-medium text-[#7b8882]">Created</dt>
            <dd className="text-xs font-semibold text-[#425b52]">
              {formatDate(project.created_at)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
            <dt className="text-xs font-medium text-[#7b8882]">Last updated</dt>
            <dd className="text-xs font-semibold text-[#425b52]">
              {formatDate(project.updated_at)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 rounded-2xl bg-[#f4f7f2] p-4">
          <p className="text-xs font-semibold text-[#425b52]">Project purpose</p>
          <p className="mt-1.5 text-xs leading-5 text-[#75827c]">
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
