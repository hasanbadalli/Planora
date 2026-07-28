"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Layers3,
  LoaderCircle,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, Project, getProjects } from "@/lib/api";

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await getProjects());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Projects could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  function saved(project: Project) {
    setProjects((current) =>
      current.some((item) => item.id === project.id)
        ? current.map((item) => (item.id === project.id ? project : item))
        : [...current, project],
    );
  }
  const active = projects.filter((project) => project.status !== "archived");
  const archived = projects.filter((project) => project.status === "archived");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} active {active.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus />
          New project
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" />
          Loading projects...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
          <div>
            <Button
              variant="outline"
              onClick={() => void load()}
              className="mt-4"
            >
              Try again
            </Button>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted px-6 py-16 text-center">
          <Layers3 className="mx-auto size-8 text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">
            Create your first project
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects connect daily action with longer-term direction.
          </p>
        </div>
      ) : (
        <>
          <ProjectGrid
            projects={active}
            onEdit={(project) => {
              setEditing(project);
              setOpen(true);
            }}
          />
          {archived.length ? (
            <section className="mt-10">
              <div className="flex items-center gap-2">
                <Archive className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Archived
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {archived.length}
                </span>
              </div>
              <ProjectGrid
                projects={archived}
                onEdit={(project) => {
                  setEditing(project);
                  setOpen(true);
                }}
                compact
              />
            </section>
          ) : null}
        </>
      )}
      <ProjectFormDialog
        open={open}
        onOpenChange={setOpen}
        project={editing}
        onSaved={saved}
        onDeleted={(projectId) =>
          setProjects((items) => items.filter((item) => item.id !== projectId))
        }
      />
    </div>
  );
}

const STATUS_TAGS: Record<Project["status"], string> = {
  active: "bg-[#dbeddb] text-[#448361]",
  paused: "bg-[#fdecc8] text-[#9f6b23]",
  completed: "bg-[#e7f3f8] text-[#2b6a9b]",
  archived: "bg-[#f1f0ef] text-[#787774]",
};

function ProjectGrid({
  projects,
  onEdit,
  compact = false,
}: {
  projects: Project[];
  onEdit: (project: Project) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "mt-3" : "mt-6"} grid gap-3 sm:grid-cols-2 xl:grid-cols-3`}
    >
      {projects.map((project) => (
        <article
          key={project.id}
          className="group relative rounded-lg border border-border bg-card p-4 shadow-notion transition-shadow hover:shadow-notion-lg"
        >
          <div className="flex items-center justify-between">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <button
              onClick={() => onEdit(project)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Edit ${project.name}`}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <Link href={`/projects/${project.id}`} className="mt-3 block">
            <h2 className="text-base font-semibold text-foreground">
              {project.name}
            </h2>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
              {project.description || "No description yet."}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TAGS[project.status]}`}
              >
                {project.status.replace("_", " ")}
              </span>
              <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                Open →
              </span>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
