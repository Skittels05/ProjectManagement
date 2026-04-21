import { http } from "../shared/api/http";
import type { ProjectDto, ProjectRole, RemoveMemberResult } from "../store/types/projects.types";

export async function fetchProjects(): Promise<ProjectDto[]> {
  const { data } = await http.get<{ projects: ProjectDto[] }>("/projects");
  return data.projects;
}

export async function fetchProjectById(id: string): Promise<ProjectDto> {
  const { data } = await http.get<{ project: ProjectDto }>(`/projects/${id}`);
  return data.project;
}

export async function createProject(payload: {
  name: string;
  description?: string;
}): Promise<ProjectDto> {
  const { data } = await http.post<{ project: ProjectDto }>("/projects", payload);
  return data.project;
}

export async function addProjectMember(
  projectId: string,
  body: { email: string; role: "member" | "manager" },
): Promise<ProjectDto> {
  const { data } = await http.post<{ project: ProjectDto }>(`/projects/${projectId}/members`, body);
  return data.project;
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<ProjectDto> {
  const { data } = await http.patch<{ project: ProjectDto }>(
    `/projects/${projectId}/members/${userId}`,
    { role },
  );
  return data.project;
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<RemoveMemberResult> {
  const { data } = await http.delete<{ left?: boolean; project?: ProjectDto }>(
    `/projects/${projectId}/members/${userId}`,
  );
  if (data.left) {
    return { left: true };
  }
  if (data.project) {
    return { project: data.project };
  }
  throw new Error("Unexpected response");
}
