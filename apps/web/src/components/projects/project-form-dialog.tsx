/* eslint-disable react-hooks/set-state-in-effect -- Reset transient dialog state when its record changes. */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Archive, LoaderCircle, Trash2 } from "lucide-react";

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
  Project,
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/api";
import { PROJECT_COLORS } from "@/lib/project-colors";
import { cn } from "@/lib/utils";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSaved: (project: Project) => void;
  onDeleted?: (projectId: string) => void;
}

function getPaletteColor(color?: string | null): string {
  return PROJECT_COLORS.some((item) => item.value === color)
    ? (color as string)
    : PROJECT_COLORS[0].value;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
  onDeleted,
}: ProjectFormDialogProps) {
  const [color, setColor] = useState(getPaletteColor(project?.color));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setColor(getPaletteColor(project?.color));
    setConfirmDelete(false);
    setError(null);
  }, [open, project]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name")).trim(),
      description: String(data.get("description") || "").trim() || null,
      color,
      ...(project
        ? { status: String(data.get("status")) as Project["status"] }
        : {}),
    };
    try {
      const saved = project
        ? await updateProject(project.id, payload)
        : await createProject(payload);
      onSaved(saved);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The project could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProject(project.id);
      onDeleted?.(project.id);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The project could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-6 sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {project ? "Edit project" : "New project"}
          </DialogTitle>
          <DialogDescription>
            Choose a recognizable color and keep the purpose easy to scan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              name="name"
              defaultValue={project?.name ?? ""}
              placeholder="e.g. Product launch"
              maxLength={80}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              name="description"
              defaultValue={project?.description ?? ""}
              placeholder="What is this project for?"
              maxLength={2000}
              className="min-h-24"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Project color</legend>
            <p className="mt-1 text-xs text-[#7b8882]">
              Use the same color across project and task views.
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {PROJECT_COLORS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setColor(item.value)}
                  aria-label={`${item.name} project color`}
                  aria-pressed={color === item.value}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border-2 bg-white transition",
                    color === item.value
                      ? "border-[#173b35] shadow-sm"
                      : "border-transparent hover:border-[#cdd7cf]",
                  )}
                >
                  <span
                    className="size-7 rounded-lg"
                    style={{ backgroundColor: item.value }}
                  />
                </button>
              ))}
            </div>
          </fieldset>
          {project ? (
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <select
                id="project-status"
                name="status"
                defaultValue={project.status}
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              <p className="flex items-center gap-1.5 text-xs text-[#7d8983]">
                <Archive className="size-3.5" />
                Archived projects remain editable but are separated from active
                work.
              </p>
            </div>
          ) : null}
          {project && confirmDelete ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Delete this project?
              </p>
              <p className="mt-1 text-xs leading-5 text-red-700">
                Tasks will be kept without a project. Future plans inside this
                project will be removed.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep project
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => void remove()}
                >
                  {saving ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                  Delete permanently
                </Button>
              </div>
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#efd2cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#99443d]"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="-mx-6 -mb-6 items-center px-6">
            {project && !confirmDelete ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto text-red-700 hover:bg-red-50 hover:text-red-800"
              >
                <Trash2 />
                Delete
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || confirmDelete}
              className="bg-[#173b35] text-white"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              {saving ? "Saving..." : "Save project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
