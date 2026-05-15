import { baseApi } from "./baseApi";
import type { CreateTaskBody, TaskDto, TaskStatus, UpdateTaskBody } from "../types/tasks.types";

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
      async onQueryStarted({ projectId, taskId, body }, { dispatch, queryFulfilled, getState }) {
        const patches: { undo: () => void }[] = [];
        const cachedArgs = tasksApi.util.selectCachedArgsForQuery(getState(), "getTasks");

        for (const args of cachedArgs) {
          if (args.projectId !== projectId) continue;
          const patch = dispatch(
            tasksApi.util.updateQueryData("getTasks", args, (draft) => {
              const task = draft.find((t) => t.id === taskId);
              if (!task) return;
              if (body.status !== undefined) {
                task.status = body.status as TaskStatus;
              }
              if (body.boardPosition !== undefined) {
                task.boardPosition = body.boardPosition;
              }
            }),
          );
          patches.push(patch);
        }

        try {
          await queryFulfilled;
        } catch {
          for (const patch of patches) {
            patch.undo();
          }
        }
      },
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
