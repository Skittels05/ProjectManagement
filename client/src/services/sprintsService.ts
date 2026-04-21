import { http } from "../shared/api/http";
import type { CreateSprintBody, SprintDto, UpdateSprintBody } from "../store/types/sprints.types";

export async function fetchSprints(projectId: string): Promise<SprintDto[]> {
  const { data } = await http.get<{ sprints: SprintDto[] }>(`/projects/${projectId}/sprints`);
  return data.sprints;
}

export async function createSprint(projectId: string, body: CreateSprintBody): Promise<SprintDto> {
  const { data } = await http.post<{ sprint: SprintDto }>(`/projects/${projectId}/sprints`, body);
  return data.sprint;
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  body: UpdateSprintBody,
): Promise<SprintDto> {
  const { data } = await http.patch<{ sprint: SprintDto }>(
    `/projects/${projectId}/sprints/${sprintId}`,
    body,
  );
  return data.sprint;
}

export async function deleteSprint(projectId: string, sprintId: string): Promise<void> {
  await http.delete(`/projects/${projectId}/sprints/${sprintId}`);
}
