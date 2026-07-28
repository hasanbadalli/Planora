const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface ApiErrorPayload {
  detail?: { code?: string; message?: string } | Array<{ msg?: string }> | string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  timezone: string;
  created_at: string;
}

export interface AuthSession { user: AuthUser }
export interface RegisterPayload { username: string; email: string; password: string; timezone: string }
export interface LoginPayload { identifier: string; password: string }

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "paused" | "completed" | "archived";
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPayload { name: string; description?: string | null; color?: string; status?: Project["status"] }

export type TaskCategory = "coding" | "reading" | "meeting" | "study" | "planning" | "personal" | "exercise" | "other";
export type TaskDifficulty = "easy" | "medium" | "hard";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  project_ids: string[];
  categories: TaskCategory[];
  /** First project, retained for compatibility with older clients. */
  project_id: string | null;
  title: string;
  description: string | null;
  /** Primary category. Its icon represents the task. */
  category: TaskCategory;
  difficulty: TaskDifficulty | null;
  status: TaskStatus;
  starts_at: string;
  ends_at: string;
  weekly_repeat: boolean;
  occurrence_date: string;
  series_date: string;
  completed_at: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskPayload {
  title: string;
  description?: string | null;
  project_ids?: string[];
  categories: TaskCategory[];
  difficulty?: TaskDifficulty | null;
  starts_at: string;
  ends_at: string;
  weekly_repeat: boolean;
  status?: TaskStatus;
  estimated_minutes?: number | null;
}

export interface FuturePlan {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: "planned" | "in_progress" | "completed";
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FuturePlanPayload {
  title: string;
  description?: string | null;
  target_date?: string | null;
  status?: FuturePlan["status"];
}

export interface ProjectNote {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectNotePayload {
  title: string;
  content?: string | null;
}

export type DashboardRange = "week" | "month" | "3_months" | "6_months";
export type TrendDirection = "up" | "down" | "flat" | "new";

export interface DashboardTrend {
  current: number;
  previous: number;
  change_percent: number | null;
  direction: TrendDirection;
}

export interface DashboardSummary {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  completion_rate: number;
  planned_minutes: number;
  completed_planned_minutes: number;
}

export interface DashboardStats {
  scope: {
    type: "all" | "project";
    project_id: string | null;
    project_name: string | null;
  };
  range: DashboardRange;
  category_filter: TaskCategory | null;
  period: {
    starts_at: string;
    ends_at: string;
    previous_starts_at: string;
    previous_ends_at: string;
    timezone: string;
    bucket: "day" | "month";
  };
  summary: DashboardSummary;
  previous_summary: DashboardSummary;
  trends: {
    total_tasks: DashboardTrend;
    done_tasks: DashboardTrend;
    completion_rate: DashboardTrend;
    planned_minutes: DashboardTrend;
    completed_planned_minutes: DashboardTrend;
  };
  series: Array<{
    starts_at: string;
    label: string;
    total_tasks: number;
    done_tasks: number;
    completed_planned_minutes: number;
  }>;
  status_distribution: Array<{
    status: TaskStatus;
    count: number;
    percentage: number;
  }>;
  category_breakdown: Array<{
    category: TaskCategory;
    count: number;
    done_count: number;
    completed_planned_minutes: number;
    percentage: number;
  }>;
  project_progress: Array<{
    project_id: string;
    name: string;
    color: string;
    status: Project["status"];
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    planned_minutes: number;
    completed_planned_minutes: number;
  }>;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("We could not connect to the API. Check that the backend is running.", 0, "CONNECTION_ERROR");
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const detail = payload.detail;
    if (detail && !Array.isArray(detail) && typeof detail === "object") {
      throw new ApiError(detail.message ?? "The request could not be completed.", response.status, detail.code);
    }
    if (Array.isArray(detail)) {
      throw new ApiError(detail[0]?.msg ?? "Check the information you entered.", response.status, "VALIDATION_ERROR");
    }
    throw new ApiError(typeof detail === "string" ? detail : "The request could not be completed.", response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const registerUser = (payload: RegisterPayload) => apiRequest<AuthSession>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const loginUser = (payload: LoginPayload) => apiRequest<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const getCurrentUser = async (): Promise<AuthSession> => ({ user: await apiRequest<AuthUser>("/auth/me") });
export const logoutUser = () => apiRequest<void>("/auth/logout", { method: "POST" });

export const getProjects = async () => (await apiRequest<{ items: Project[] }>("/projects")).items;
export const getProject = (id: string) => apiRequest<Project>(`/projects/${id}`);
export const createProject = (payload: ProjectPayload) => apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(payload) });
export const updateProject = (id: string, payload: ProjectPayload) => apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteProject = (id: string) => apiRequest<void>(`/projects/${id}`, { method: "DELETE" });

export async function getTasks(fromAt: string, toAt: string, projectId?: string): Promise<Task[]> {
  const query = new URLSearchParams({ from_at: fromAt, to_at: toAt });
  if (projectId) query.set("project_id", projectId);
  return (await apiRequest<{ items: Task[] }>(`/tasks?${query}`)).items;
}
export const createTask = (payload: TaskPayload) => apiRequest<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) });
export const updateTask = (id: string, payload: Partial<TaskPayload> & { status?: Task["status"] }) => apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const updateTaskOccurrence = (
  id: string,
  seriesDate: string,
  payload: { scope: "occurrence" | "future"; starts_at?: string; ends_at?: string; status?: TaskStatus },
) => apiRequest<Task>(`/tasks/${id}/occurrences/${seriesDate}`, { method: "PATCH", body: JSON.stringify(payload) });

export const getFuturePlans = async (projectId: string) => (await apiRequest<{ items: FuturePlan[] }>(`/projects/${projectId}/future-plans`)).items;
export const createFuturePlan = (projectId: string, payload: FuturePlanPayload) => apiRequest<FuturePlan>(`/projects/${projectId}/future-plans`, { method: "POST", body: JSON.stringify(payload) });
export const updateFuturePlan = (projectId: string, planId: string, payload: FuturePlanPayload) => apiRequest<FuturePlan>(`/projects/${projectId}/future-plans/${planId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const getProjectNotes = async (projectId: string) =>
  (await apiRequest<{ items: ProjectNote[] }>(`/projects/${projectId}/notes`)).items;
export const createProjectNote = (projectId: string, payload: ProjectNotePayload) =>
  apiRequest<ProjectNote>(`/projects/${projectId}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updateProjectNote = (
  projectId: string,
  noteId: string,
  payload: Partial<ProjectNotePayload>,
) =>
  apiRequest<ProjectNote>(`/projects/${projectId}/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const deleteProjectNote = (projectId: string, noteId: string) =>
  apiRequest<void>(`/projects/${projectId}/notes/${noteId}`, { method: "DELETE" });

export function getDashboardStats(
  range: DashboardRange,
  category?: TaskCategory,
): Promise<DashboardStats> {
  const query = new URLSearchParams({ range });
  if (category) query.set("category", category);
  return apiRequest<DashboardStats>(`/dashboard?${query}`);
}

export function getProjectStats(
  projectId: string,
  range: DashboardRange,
  category?: TaskCategory,
): Promise<DashboardStats> {
  const query = new URLSearchParams({ range });
  if (category) query.set("category", category);
  return apiRequest<DashboardStats>(`/projects/${projectId}/statistics?${query}`);
}
