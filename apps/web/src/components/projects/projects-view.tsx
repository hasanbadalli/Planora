"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
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
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-7 sm:py-10 xl:px-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70867a]">
            Organized by outcome
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
            Projects
          </h1>
          <p className="mt-2 text-sm text-[#6e7d76]">
            Use a consistent color to recognize project work everywhere.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="h-11 rounded-xl bg-[#173b35] px-4 text-white"
        >
          <Plus />
          New project
        </Button>
      </div>
      {loading ? (
        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-[#77857f]">
          <LoaderCircle className="animate-spin" />
          Loading projects...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-[#efd5d0] bg-white p-6 text-center text-sm text-[#984840]">
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
        <div className="mt-8 rounded-[22px] border border-dashed border-[#d8e0d6] bg-white px-6 py-16 text-center">
          <Layers3 className="mx-auto size-9 text-[#72867c]" />
          <h2 className="mt-5 text-lg font-semibold">
            Create your first project
          </h2>
          <p className="mt-2 text-sm text-[#77847e]">
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
          <section className="mt-10">
            <div className="flex items-center gap-2">
              <Archive className="size-4 text-[#75837c]" />
              <h2 className="text-sm font-semibold text-[#50635b]">
                Archived projects
              </h2>
              <span className="rounded-full bg-[#e9eee7] px-2 py-0.5 text-[10px] font-semibold text-[#6f7d77]">
                {archived.length}
              </span>
            </div>
            {archived.length ? (
              <ProjectGrid
                projects={archived}
                onEdit={(project) => {
                  setEditing(project);
                  setOpen(true);
                }}
                compact
              />
            ) : (
              <p className="mt-3 text-xs text-[#89948f]">
                Archived projects will appear here.
              </p>
            )}
          </section>
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
      className={`${compact ? "mt-3" : "mt-8"} grid gap-4 sm:grid-cols-2 xl:grid-cols-3`}
    >
      {projects.map((project) => (
        <article
          key={project.id}
          className="group relative overflow-hidden rounded-[22px] border border-[#dfe5dc] bg-white p-5 shadow-[0_7px_24px_rgba(36,55,47,0.04)]"
        >
          <span
            className="absolute inset-y-0 left-0 w-1.5"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex items-start justify-between">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <button
              onClick={() => onEdit(project)}
              className="flex size-8 items-center justify-center rounded-lg text-[#88938e] hover:bg-[#edf1ec] hover:text-[#40584f]"
              aria-label={`Edit ${project.name}`}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <Link href={`/projects/${project.id}`} className="mt-7 block">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#213b35]">
              {project.name}
            </h2>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#74817b]">
              {project.description || "No description yet."}
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-[#edf0ec] pt-4">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  color: project.color,
                  backgroundColor: `${project.color}16`,
                }}
              >
                {project.status}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#496158]">
                Open <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
