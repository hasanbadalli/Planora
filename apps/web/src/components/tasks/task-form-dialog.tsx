/* eslint-disable react-hooks/set-state-in-effect -- Reset transient form state when a controlled dialog opens. */
"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  FolderPlus,
  GripVertical,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";

import { TaskCategoryIcon } from "@/components/tasks/task-category-icon";
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
  Task,
  TaskCategory,
  TaskDifficulty,
  TaskStatus,
  createProject,
  createTask,
  updateTask,
} from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: "coding", label: "Coding" },
  { value: "reading", label: "Reading" },
  { value: "meeting", label: "Meeting" },
  { value: "study", label: "Study" },
  { value: "planning", label: "Planning" },
  { value: "personal", label: "Personal" },
  { value: "exercise", label: "Exercise" },
  { value: "other", label: "Other" },
];

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onProjectsChange: (projects: Project[]) => void;
  selectedDate: string;
  task?: Task | null;
  defaultProjectId?: string;
  onSaved: (task: Task) => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  projects,
  onProjectsChange,
  selectedDate,
  task,
  defaultProjectId,
  onSaved,
}: TaskFormDialogProps) {
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<TaskCategory[]>(["other"]);
  const [addProject, setAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categorySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) return;
    setProjectIds(
      task?.project_ids?.length
        ? task.project_ids
        : task?.project_id
          ? [task.project_id]
          : defaultProjectId
            ? [defaultProjectId]
            : [],
    );
    setCategoryOrder(
      task?.categories?.length
        ? task.categories
        : [task?.category ?? "other"],
    );
    setAddProject(false);
    setNewProjectName("");
    setEstimatedMinutes(task?.estimated_minutes?.toString() ?? "");
    setError(null);
  }, [open, task, defaultProjectId]);

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : current.length < 8
          ? [...current, projectId]
          : current,
    );
  }

  function addCategory(category: TaskCategory) {
    setCategoryOrder((current) =>
      current.includes(category) ? current : [...current, category],
    );
  }

  function removeCategory(category: TaskCategory) {
    setCategoryOrder((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item !== category),
    );
  }

  function reorderCategories(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    setCategoryOrder((current) => {
      const from = current.indexOf(event.active.id as TaskCategory);
      const to = current.indexOf(event.over?.id as TaskCategory);
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      let resolvedProjectIds = projectIds;
      if (addProject) {
        if (!newProjectName.trim()) {
          throw new Error("Enter a name for the new project.");
        }
        const created = await createProject({ name: newProjectName.trim() });
        onProjectsChange([...projects, created]);
        resolvedProjectIds = [...projectIds, created.id];
      }
      const date = String(data.get("date"));
      const startTime = String(data.get("start_time"));
      const endTime = String(data.get("end_time"));
      const start = new Date(`${date}T${startTime}:00`);
      const end = new Date(`${date}T${endTime}:00`);
      if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
        throw new Error("Enter a valid date and time.");
      }
      if (end <= start) throw new Error("End time must be after start time.");

      const payload = {
        title: String(data.get("title")).trim(),
        description: String(data.get("description") || "").trim() || null,
        project_ids: resolvedProjectIds,
        categories: categoryOrder,
        difficulty: (String(data.get("difficulty") || "") ||
          null) as TaskDifficulty | null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        weekly_repeat: data.get("weekly_repeat") === "on",
        status: String(data.get("status") || "todo") as TaskStatus,
        estimated_minutes: estimatedMinutes
          ? Number(estimatedMinutes)
          : null,
      };
      const saved = task
        ? await updateTask(task.id, payload)
        : await createTask(payload);
      onSaved(saved);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The task could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const startDate = task ? new Date(task.starts_at) : null;
  const endDate = task ? new Date(task.ends_at) : null;
  const unselectedCategories = TASK_CATEGORIES.filter(
    (category) => !categoryOrder.includes(category.value),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto p-5 sm:max-w-[640px] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#172f2b]">
            {task ? "Edit task" : "Add task"}
          </DialogTitle>
          <DialogDescription>
            {task?.weekly_repeat
              ? "Changes apply to the whole weekly series."
              : "Plan the work, then connect it to the contexts that matter."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Task title" htmlFor="task-title">
            <Input
              id="task-title"
              name="title"
              defaultValue={task?.title ?? ""}
              placeholder="What do you want to accomplish?"
              maxLength={200}
              required
              className="h-11"
            />
          </Field>

          <Field label="Projects (optional)" htmlFor="project-options">
            <div
              id="project-options"
              className="rounded-xl border border-[#dfe6de] bg-[#fafbf8] p-3"
            >
              <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                {projects.map((project) => {
                  const selected = projectIds.includes(project.id);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleProject(project.id)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                        selected
                          ? "border-[#789487] bg-white text-[#24443b] shadow-sm"
                          : "border-transparent text-[#68766f] hover:border-[#dce4dc] hover:bg-white",
                      )}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {project.name}
                      </span>
                      {selected ? (
                        <Check className="size-4 shrink-0 text-[#315a4d]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e7ebe5] pt-3">
                <p className="text-xs text-[#7a8781]">
                  {projectIds.length
                    ? `${projectIds.length} project${projectIds.length === 1 ? "" : "s"} selected`
                    : "This task is not tied to a project."}
                </p>
                <button
                  type="button"
                  onClick={() => setAddProject((value) => !value)}
                  className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[#315a4d] transition hover:bg-[#edf3eb]"
                >
                  <FolderPlus className="size-4" />
                  Add new project
                </button>
              </div>
            </div>
          </Field>

          {addProject ? (
            <div className="rounded-xl border border-[#dfe6da] bg-[#f6f8f3] p-4">
              <Label htmlFor="new-project" className="flex items-center gap-2">
                <Plus className="size-4" />
                New project name
              </Label>
              <Input
                id="new-project"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="e.g. Client website"
                maxLength={80}
                className="mt-2 h-10 bg-white"
              />
              <p className="mt-2 text-xs text-[#7b8781]">
                The new project will be assigned alongside your current choices.
              </p>
            </div>
          ) : null}

          <Field label="Categories" htmlFor="category-order">
            <div
              id="category-order"
              className="rounded-xl border border-[#dfe6de] bg-[#fafbf8] p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-[#738079]">
                  Drag to reorder. The first category sets the task icon.
                </p>
                <span className="shrink-0 rounded-full bg-[#e9f0e7] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#46675c]">
                  {categoryOrder.length}/8
                </span>
              </div>
              <DndContext
                sensors={categorySensors}
                collisionDetection={closestCenter}
                onDragEnd={reorderCategories}
              >
                <SortableContext
                  items={categoryOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {categoryOrder.map((category, index) => (
                      <SortableCategory
                        key={category}
                        category={category}
                        primary={index === 0}
                        removable={categoryOrder.length > 1}
                        onRemove={() => removeCategory(category)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {unselectedCategories.length ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e7ebe5] pt-3">
                  {unselectedCategories.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => addCategory(category.value)}
                      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-[#e0e5df] bg-white px-2.5 text-xs font-semibold text-[#64736c] transition hover:border-[#9db0a6] hover:text-[#315a4d]"
                    >
                      <Plus className="size-3.5" />
                      <TaskCategoryIcon
                        category={category.value}
                        className="size-3.5"
                      />
                      {category.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="task-date">
              <Input
                id="task-date"
                name="date"
                type="date"
                defaultValue={startDate ? dateKey(startDate) : selectedDate}
                required
                className="h-11"
              />
            </Field>
            <Field label="Starts" htmlFor="start-time">
              <Input
                id="start-time"
                name="start_time"
                type="time"
                defaultValue={startDate ? localTime(startDate) : "09:00"}
                required
                className="h-11"
              />
            </Field>
            <Field label="Ends" htmlFor="end-time">
              <Input
                id="end-time"
                name="end_time"
                type="time"
                defaultValue={endDate ? localTime(endDate) : "10:00"}
                required
                className="h-11"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="task-status">
              <select
                id="task-status"
                name="status"
                defaultValue={task?.status ?? "todo"}
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </Field>
            <Field label="Difficulty (optional)" htmlFor="task-difficulty">
              <select
                id="task-difficulty"
                name="difficulty"
                defaultValue={task?.difficulty ?? ""}
                className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
              >
                <option value="">Not set</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Estimated effort" htmlFor="estimated-minutes">
              <div className="relative">
                <Input
                  id="estimated-minutes"
                  name="estimated_minutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10080}
                  step={5}
                  value={estimatedMinutes}
                  onChange={(event) => setEstimatedMinutes(event.target.value)}
                  placeholder="e.g. 45"
                  className="h-11 pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#7a8781]">
                  minutes
                </span>
              </div>
            </Field>
          </div>

          <div className="-mt-2 flex flex-wrap items-center gap-2" aria-label="Estimated effort presets">
            <span className="mr-1 text-xs text-[#7a8781]">Quick estimate</span>
            {[15, 30, 45, 60, 90, 120].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setEstimatedMinutes(String(minutes))}
                className={cn(
                  "min-h-8 rounded-lg border px-2.5 text-xs font-semibold transition",
                  estimatedMinutes === String(minutes)
                    ? "border-[#789487] bg-[#eaf0e8] text-[#294d43]"
                    : "border-[#e0e5df] bg-white text-[#6f7c76] hover:border-[#aab9b1]",
                )}
              >
                {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
              </button>
            ))}
            {estimatedMinutes ? (
              <button
                type="button"
                onClick={() => setEstimatedMinutes("")}
                className="min-h-8 rounded-lg px-2 text-xs font-semibold text-[#7b8781] hover:bg-[#f0f3ef]"
              >
                Clear
              </button>
            ) : null}
          </div>

          <Field label="Notes (optional)" htmlFor="task-description">
            <Textarea
              id="task-description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Add useful context..."
              maxLength={4000}
              className="min-h-20"
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e0e6de] p-4">
            <input
              type="checkbox"
              name="weekly_repeat"
              defaultChecked={task?.weekly_repeat ?? false}
              className="mt-0.5 size-4 accent-[#315a4d]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#263f39]">
                Repeat every week
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#75817c]">
                The task appears on the same weekday and time. Occurrences are
                calculated on demand.
              </span>
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#efd2cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#99443d]"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter className="-mx-5 -mb-5 px-5 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#173b35] text-white hover:bg-[#245047]"
            >
              {saving ? <LoaderCircle className="animate-spin" /> : null}
              {saving ? "Saving..." : task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SortableCategory({
  category,
  primary,
  removable,
  onRemove,
}: {
  category: TaskCategory;
  primary: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category });
  const label =
    TASK_CATEGORIES.find((item) => item.value === category)?.label ?? category;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border bg-white px-2 py-1.5 shadow-sm",
        primary ? "border-[#8da69a]" : "border-[#e0e5df]",
        isDragging && "relative z-20 scale-[1.01] shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${label}`}
        className="flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-md text-[#8b9791] hover:bg-[#f0f3ef] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#edf2ec] text-[#4f6b60]">
        <TaskCategoryIcon category={category} className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#344b44]">
        {label}
      </span>
      {primary ? (
        <span className="rounded-full bg-[#e8f0e6] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#416459]">
          Task icon
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        disabled={!removable}
        onClick={onRemove}
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#89958f] transition hover:bg-[#f7ecea] hover:text-[#9c4f49] disabled:invisible"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function localTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
