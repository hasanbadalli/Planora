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
    <section className="rounded-[22px] border border-[#dce3da] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#74847b]">
            Project knowledge
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#233d36]">
            Notes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74817b]">
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
          className="min-h-11 rounded-xl bg-[#173b35] text-white"
        >
          <Plus aria-hidden />
          Add note
        </Button>
      </div>

      <div className="relative mt-5 max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#87938d]"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search project notes"
          aria-label="Search project notes"
          className="h-11 rounded-xl pl-10"
        />
      </div>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[#cfe0d3] bg-[#f1f8f1] px-4 py-3 text-sm text-[#356044]"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#77857f]">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Loading notes...
        </div>
      ) : visibleNotes.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleNotes.map((note) => (
            <article
              key={note.id}
              className="group flex min-h-56 flex-col rounded-2xl border border-[#e0e6df] bg-[#fbfcfa] p-4 transition-all hover:border-[#ccd7ce] hover:bg-white hover:shadow-[0_10px_28px_rgba(40,60,51,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
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
                    className="flex size-11 items-center justify-center rounded-xl text-[#7e8b85] transition-colors hover:bg-[#eef2ed] hover:text-[#34564c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58786b]"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeNote(note)}
                    disabled={deletingId === note.id}
                    aria-label={`Delete ${note.title}`}
                    className="flex size-11 items-center justify-center rounded-xl text-[#8b8580] transition-colors hover:bg-[#fff1ef] hover:text-[#a3453d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a85c54] disabled:opacity-50"
                  >
                    {deletingId === note.id ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              <h3 className="mt-4 break-words text-base font-semibold text-[#29423b]">
                {note.title}
              </h3>
              <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-[#75827c]">
                {note.content || "No content added yet."}
              </p>
              <p className="mt-auto border-t border-[#e9ede8] pt-3 text-[10px] font-medium text-[#8c9892]">
                Updated {formatUpdatedDate(note.updated_at)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dce3da] bg-[#fbfcfa] px-5 py-14 text-center">
          <FileText className="mx-auto size-7 text-[#83928a]" aria-hidden />
          <h3 className="mt-4 text-base font-semibold text-[#304a43]">
            {notes.length ? "No notes match your search" : "No notes yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#7d8a84]">
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
