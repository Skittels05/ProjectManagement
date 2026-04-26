import { baseApi } from "./baseApi";
import type { CreateSprintBody, SprintDto, UpdateSprintBody } from "../types/sprints.types";

function sprintListTag(projectId: string) {
  return { type: "Sprint" as const, id: `LIST-${projectId}` };
}

export const sprintsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSprints: build.query<SprintDto[], string>({
      query: (projectId) => ({ url: `/projects/${projectId}/sprints`, method: "get" }),
      transformResponse: (response: { sprints: SprintDto[] }) => response.sprints,
      providesTags: (_result, _err, projectId) => [sprintListTag(projectId)],
    }),
    createSprint: build.mutation<SprintDto, { projectId: string; body: CreateSprintBody }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/sprints`,
        method: "post",
        data: body,
      }),
      transformResponse: (response: { sprint: SprintDto }) => response.sprint,
      invalidatesTags: (_result, _err, { projectId }) => [sprintListTag(projectId)],
    }),
    updateSprint: build.mutation<
      SprintDto,
      { projectId: string; sprintId: string; body: UpdateSprintBody }
    >({
      query: ({ projectId, sprintId, body }) => ({
        url: `/projects/${projectId}/sprints/${sprintId}`,
        method: "patch",
        data: body,
      }),
      transformResponse: (response: { sprint: SprintDto }) => response.sprint,
      invalidatesTags: (_result, _err, { projectId }) => [sprintListTag(projectId)],
    }),
    deleteSprint: build.mutation<void, { projectId: string; sprintId: string }>({
      query: ({ projectId, sprintId }) => ({
        url: `/projects/${projectId}/sprints/${sprintId}`,
        method: "delete",
      }),
      invalidatesTags: (_result, _err, { projectId }) => [sprintListTag(projectId)],
    }),
  }),
});

export const {
  useGetSprintsQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
} = sprintsApi;
