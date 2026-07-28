"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ApiError,
  ProjectNote,
  createProjectNote,
  updateProjectNote,
} from "@/lib/api";

export function ProjectNoteDialog({
  open,
  onOpenChange,
  projectId,
  note,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  note?: ProjectNote | null;
  onSaved: (note: ProjectNote) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const content = String(data.get("content") ?? "").trim() || null;

    if (!title) {
      setError("Add a title before saving the note.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = note
        ? await updateProjectNote(projectId, note.id, { title, content })
        : await createProjectNote(projectId, { title, content });
      onSaved(saved);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The note could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          setError(null);
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="p-6 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {note ? "Edit note" : "New project note"}
          </DialogTitle>
          <DialogDescription>
            Keep useful context, decisions, and references close to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-note-title">Title</Label>
            <Input
              id="project-note-title"
              name="title"
              defaultValue={note?.title ?? ""}
              placeholder="What is this note about?"
              maxLength={160}
              autoFocus
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-note-content">Content</Label>
            <Textarea
              id="project-note-content"
              name="content"
              defaultValue={note?.content ?? ""}
              placeholder="Capture context, links, decisions, or next questions..."
              maxLength={20_000}
              className="min-h-56 resize-y leading-6"
            />
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
             
            >
              {saving ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : null}
              {saving ? "Saving..." : "Save note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
