import { baseApi } from "./baseApi";
import type { ProjectDto, RemoveMemberResult } from "../types/projects.types";

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectDto[], void>({
      query: () => ({ url: "/projects", method: "get" }),
      transformResponse: (response: { projects: ProjectDto[] }) => response.projects,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Project" as const, id })),
              { type: "Project" as const, id: "LIST" },
            ]
          : [{ type: "Project" as const, id: "LIST" }],
    }),
    getProject: build.query<ProjectDto, string>({
      query: (projectId) => ({ url: `/projects/${projectId}`, method: "get" }),
      transformResponse: (response: { project: ProjectDto }) => response.project,
      providesTags: (_result, _err, projectId) => [{ type: "Project" as const, id: projectId }],
    }),
    createProject: build.mutation<ProjectDto, { name: string; description?: string }>({
      query: (body) => ({ url: "/projects", method: "post", data: body }),
      transformResponse: (response: { project: ProjectDto }) => response.project,
      invalidatesTags: [{ type: "Project", id: "LIST" }],
    }),
    addProjectMember: build.mutation<
      ProjectDto,
      { projectId: string; email: string; role: string }
    >({
      query: ({ projectId, email, role }) => ({
        url: `/projects/${projectId}/members`,
        method: "post",
        data: { email, role },
      }),
      transformResponse: (response: { project: ProjectDto }) => response.project,
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
    updateProjectMemberRole: build.mutation<
      ProjectDto,
      { projectId: string; userId: string; role: string }
    >({
      query: ({ projectId, userId, role }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: "patch",
        data: { role },
      }),
      transformResponse: (response: { project: ProjectDto }) => response.project,
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
    removeProjectMember: build.mutation<
      RemoveMemberResult,
      { projectId: string; userId: string }
    >({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: "delete",
      }),
      transformResponse: (response: { left?: boolean; project?: ProjectDto }): RemoveMemberResult => {
        if (response.left) {
          return { left: true };
        }
        if (response.project) {
          return { project: response.project };
        }
        throw new Error("Unexpected response");
      },
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useAddProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
  useRemoveProjectMemberMutation,
} = projectsApi;
