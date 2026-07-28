"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { ProjectNoteDialog } from "@/components/projects/project-note-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  Project,
  ProjectNote,
  deleteProjectNote,
  getProjectNotes,
} from "@/lib/api";

export function ProjectNotesSection({ project }: { project: Project }) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectNote | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotes(await getProjectNotes(project.id));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Project notes could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en");
    if (!normalized) return notes;
    return notes.filter(
      (note) =>
        note.title.toLocaleLowerCase("en").includes(normalized) ||
        note.content?.toLocaleLowerCase("en").includes(normalized),
    );
  }, [notes, query]);

  function savedNote(value: ProjectNote) {
    const wasEditing = notes.some((note) => note.id === value.id);
    setNotes((items) =>
      wasEditing
        ? items.map((item) => (item.id === value.id ? value : item))
        : [value, ...items],
    );
    setMessage(wasEditing ? "Note updated." : "Note created.");
    setEditing(null);
  }

  async function removeNote(note: ProjectNote) {
    const confirmed = window.confirm(
      `Delete “${note.title}”? This note cannot be recovered.`,
    );
    if (!confirmed) return;

    setDeletingId(note.id);
    setError(null);
    setMessage(null);
    try {
      await deleteProjectNote(project.id, note.id);
      setNotes((items) => items.filter((item) => item.id !== note.id));
      setMessage("Note deleted.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The note could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Notes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Store decisions, references, and context without mixing them into tasks.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setMessage(null);
            setOpen(true);
          }}
          disabled={project.status === "archived"}
        >
          <Plus aria-hidden />
          Add note
        </Button>
      </div>

      <div className="relative mt-5 max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search project notes"
          aria-label="Search project notes"
          className="h-11 rounded-md pl-10"
        />
      </div>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-[#d3e5d4] bg-[#edf3ec] px-3.5 py-2.5 text-sm text-[#448361]"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading notes...
        </div>
      ) : visibleNotes.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleNotes.map((note) => (
            <article
              key={note.id}
              className="group flex min-h-56 flex-col rounded-md border border-border bg-muted p-4 transition-all hover:border-border hover:bg-card hover:shadow-notion"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex size-10 items-center justify-center rounded-md"
                  style={{
                    color: project.color,
                    backgroundColor: `${project.color}16`,
                  }}
                >
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(note);
                      setMessage(null);
                      setOpen(true);
                    }}
                    aria-label={`Edit ${note.title}`}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeNote(note)}
                    disabled={deletingId === note.id}
                    aria-label={`Delete ${note.title}`}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {deletingId === note.id ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              <h3 className="mt-4 break-words text-base font-semibold text-foreground">
                {note.title}
              </h3>
              <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {note.content || "No content added yet."}
              </p>
              <p className="mt-auto border-t border-border pt-3 text-[10px] font-medium text-muted-foreground">
                Updated {formatUpdatedDate(note.updated_at)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-border bg-muted px-5 py-14 text-center">
          <FileText className="mx-auto size-7 text-muted-foreground" aria-hidden />
          <h3 className="mt-4 text-base font-semibold text-foreground">
            {notes.length ? "No notes match your search" : "No notes yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            {notes.length
              ? "Try a different title or keyword."
              : "Create a note for project decisions, research, links, or useful context."}
          </p>
        </div>
      )}

      <ProjectNoteDialog
        key={editing?.id ?? "new-note"}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setEditing(null);
        }}
        projectId={project.id}
        note={editing}
        onSaved={savedNote}
      />
    </section>
  );
}

function formatUpdatedDate(value: string): string {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
