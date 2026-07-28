import { Project, Task, TaskCategory } from "@/lib/api";

export function taskProjectIds(task: Task): string[] {
  return task.project_ids?.length
    ? task.project_ids
    : task.project_id
      ? [task.project_id]
      : [];
}

export function taskCategories(task: Task): TaskCategory[] {
  return task.categories?.length ? task.categories : [task.category ?? "other"];
}

export function primaryTaskCategory(task: Task): TaskCategory {
  return taskCategories(task)[0];
}

export function taskProjects(task: Task, projects: Project[]): Project[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return taskProjectIds(task)
    .map((projectId) => byId.get(projectId))
    .filter((project): project is Project => Boolean(project));
}
