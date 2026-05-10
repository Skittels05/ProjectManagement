import { baseApi } from "./baseApi";
import type { CreateTaskBody, TaskDto, UpdateTaskBody } from "../types/tasks.types";

function taskListTag(projectId: string) {
  return { type: "Task" as const, id: `LIST-${projectId}` };
}

export type GetTasksArg = {
  projectId: string;
  sprintFilter?: "all" | "backlog" | string;
};

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query<TaskDto[], GetTasksArg>({
      query: ({ projectId, sprintFilter = "all" }) => ({
        url: `/projects/${projectId}/tasks`,
        method: "get",
        params:
          sprintFilter === "all" || sprintFilter === undefined
            ? {}
            : { sprintId: sprintFilter === "backlog" ? "backlog" : sprintFilter },
      }),
      transformResponse: (response: { tasks: TaskDto[] }) => response.tasks,
      providesTags: (_result, _err, { projectId }) => [taskListTag(projectId)],
    }),
    createTask: build.mutation<TaskDto, { projectId: string; body: CreateTaskBody }>({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/tasks`,
        method: "post",
        data: body,
      }),
      transformResponse: (response: { task: TaskDto }) => response.task,
      invalidatesTags: (_result, _err, { projectId }) => [taskListTag(projectId)],
    }),
    updateTask: build.mutation<
      TaskDto,
      { projectId: string; taskId: string; body: UpdateTaskBody }
    >({
      query: ({ projectId, taskId, body }) => ({
        url: `/projects/${projectId}/tasks/${taskId}`,
        method: "patch",
        data: body,
      }),
      transformResponse: (response: { task: TaskDto }) => response.task,
      invalidatesTags: (_result, _err, { projectId }) => [taskListTag(projectId)],
    }),
    deleteTask: build.mutation<void, { projectId: string; taskId: string }>({
      query: ({ projectId, taskId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}`,
        method: "delete",
      }),
      invalidatesTags: (_result, _err, { projectId }) => [taskListTag(projectId)],
    }),
  }),
});

export const { useGetTasksQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } =
  tasksApi;
