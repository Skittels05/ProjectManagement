import { baseApi } from "./baseApi";
import type { ProjectDto, RemoveMemberResult } from "../types/projects.types";
import type { ProjectFilterOption, ProjectSortOption } from "../../pages/DashboardPage/components/DashboardProjectsToolbar/DashboardProjectsToolbar";

export type GetProjectsQuery = {
  search?: string;
  sort?: ProjectSortOption;
  filter?: ProjectFilterOption;
};

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<ProjectDto[], GetProjectsQuery>({
      query: ({ search, sort, filter } = {}) => ({
        url: "/projects",
        method: "get",
        params: {
          ...(search?.trim() ? { search: search.trim() } : {}),
          ...(sort ? { sort } : {}),
          ...(filter && filter !== "all" ? { filter } : {}),
        },
      }),
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
    updateProject: build.mutation<
      ProjectDto,
      {
        projectId: string;
        name?: string;
        description?: string | null;
        wipLimitTodo?: number | null;
        wipLimitInProgress?: number | null;
        wipLimitDone?: number | null;
      }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}`,
        method: "patch",
        data: body,
      }),
      transformResponse: (response: { project: ProjectDto }) => response.project,
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
      ],
    }),
    deleteProject: build.mutation<{ ok: true }, string>({
      query: (projectId) => ({ url: `/projects/${projectId}`, method: "delete" }),
      invalidatesTags: (_result, _err, projectId) => [
        { type: "Project", id: projectId },
        { type: "Project", id: "LIST" },
        { type: "Sprint", id: projectId },
        { type: "Task", id: projectId },
      ],
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
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAddProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
  useRemoveProjectMemberMutation,
} = projectsApi;
