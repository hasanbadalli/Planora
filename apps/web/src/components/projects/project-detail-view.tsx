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
      <div className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <LayoutDashboard className="size-5" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Project unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "This project could not be found or you no longer have access."}
        </p>
        <Link
          href="/projects"
          className="mt-5 inline-flex min-h-9 items-center text-sm font-medium text-primary"
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All projects
      </Link>

      <header className="relative mt-3 overflow-hidden rounded-lg border border-border bg-card shadow-notion">
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex flex-col gap-4 px-4 pb-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pb-5 sm:pt-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {project.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="mt-2.5 break-words text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.description ||
                "Add a description to make this project's purpose clear."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setProjectOpen(true)}
            className="shrink-0 self-start"
          >
            <Edit3 aria-hidden />
            Edit project
          </Button>
        </div>

        <nav
          aria-label="Project workspace"
          className="overflow-x-auto border-t border-border bg-muted px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max min-w-full gap-0.5 py-1.5">
            {projectSections.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/projects/${project.id}${item.suffix}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-card text-foreground shadow-notion"
                      : "text-muted-foreground hover:text-foreground",
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
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <main className="mt-4">
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
