"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckSquare2,
  Edit3,
  FileText,
  Lightbulb,
  LoaderCircle,
  LayoutDashboard,
} from "lucide-react";

import { ProjectFuturePlansSection } from "@/components/projects/project-future-plans-section";
import { ProjectNotesSection } from "@/components/projects/project-notes-section";
import { ProjectOverviewSection } from "@/components/projects/project-overview-section";
import { ProjectStatisticsSection } from "@/components/projects/project-statistics-section";
import { ProjectTasksSection } from "@/components/projects/project-tasks-section";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, Project, getProject, getProjects } from "@/lib/api";
import { cn } from "@/lib/utils";

export type ProjectSection =
  | "overview"
  | "tasks"
  | "future-plans"
  | "notes"
  | "statistics";

const projectSections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, suffix: "" },
  { id: "tasks", label: "Tasks", icon: CheckSquare2, suffix: "/tasks" },
  {
    id: "future-plans",
    label: "Future Plans",
    icon: Lightbulb,
    suffix: "/future-plans",
  },
  { id: "notes", label: "Notes", icon: FileText, suffix: "/notes" },
  {
    id: "statistics",
    label: "Statistics",
    icon: BarChart3,
    suffix: "/statistics",
  },
] as const;

export function ProjectDetailView({
  projectId,
  section = "overview",
}: {
  projectId: string;
  section?: ProjectSection;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextProject, nextProjects] = await Promise.all([
        getProject(projectId),
        getProjects(),
      ]);
      setProject(nextProject);
      setProjects(nextProjects);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The project could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-[#77857f]">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eef2ed] text-[#5b7168]">
          <LayoutDashboard className="size-5" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Project unavailable</h1>
        <p className="mt-2 text-sm text-[#7a8680]">
          {error ?? "This project could not be found or you no longer have access."}
        </p>
        <Link
          href="/projects"
          className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#31564c]"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  function savedProject(value: Project) {
    setProject(value);
    setProjects((items) =>
      items.map((item) => (item.id === value.id ? value : item)),
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 sm:py-8 xl:px-10">
      <Link
        href="/projects"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#65766f] transition-colors hover:text-[#28463e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All projects
      </Link>

      <header className="relative mt-2 overflow-hidden rounded-[24px] border border-[#dce3da] bg-white shadow-[0_12px_35px_rgba(37,56,48,0.05)]">
        <span
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex flex-col gap-5 px-5 pb-5 pt-7 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:pb-6 sm:pt-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="size-3 shrink-0 rounded-full ring-4 ring-[#f2f5f1]"
                style={{ backgroundColor: project.color }}
              />
              <span className="rounded-full bg-[#eef2ed] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#66766e]">
                {project.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="mt-3 break-words text-3xl font-semibold tracking-[-0.045em] text-[#1f3731] sm:text-4xl">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e7c76]">
              {project.description ||
                "Add a description to make this project's purpose clear."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setProjectOpen(true)}
            className="min-h-11 shrink-0 self-start rounded-xl"
          >
            <Edit3 aria-hidden />
            Edit project
          </Button>
        </div>

        <nav
          aria-label="Project workspace"
          className="overflow-x-auto border-t border-[#e8ece7] bg-[#fafbf9] px-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max min-w-full gap-1 py-2">
            {projectSections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/projects/${project.id}${item.suffix}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]",
                    active
                      ? "bg-[#e8efe8] text-[#24483e] shadow-[inset_0_0_0_1px_#d2ddd3]"
                      : "text-[#718078] hover:bg-white hover:text-[#36564d]",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      <main className="mt-5">
        {section === "overview" ? (
          <ProjectOverviewSection project={project} />
        ) : null}
        {section === "tasks" ? (
          <ProjectTasksSection
            project={project}
            projects={projects}
            onProjectsChange={setProjects}
          />
        ) : null}
        {section === "future-plans" ? (
          <ProjectFuturePlansSection project={project} />
        ) : null}
        {section === "notes" ? (
          <ProjectNotesSection project={project} />
        ) : null}
        {section === "statistics" ? (
          <ProjectStatisticsSection projectId={project.id} />
        ) : null}
      </main>

      <ProjectFormDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        project={project}
        onSaved={savedProject}
        onDeleted={() => router.push("/projects")}
      />
    </div>
  );
}
