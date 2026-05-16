import { baseApi } from "./baseApi";
import type { TasksApiQueryParams } from "../../shared/lib/tasksQueryParams";
import type { CreateTaskBody, TaskDto, TaskStatus, UpdateTaskBody } from "../types/tasks.types";

function taskListTag(projectId: string) {
  return { type: "Task" as const, id: `LIST-${projectId}` };
}

export type GetTasksArg = TasksApiQueryParams;

function tasksQueryParams(arg: GetTasksArg): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  if (arg.sprintFilter && arg.sprintFilter !== "all") {
    params.sprintId = arg.sprintFilter === "backlog" ? "backlog" : arg.sprintFilter;
  }
  if (arg.search) params.search = arg.search;
  if (arg.sort) params.sort = arg.sort;
  if (arg.status && arg.status !== "all") params.status = arg.status;
  if (arg.assignee && arg.assignee !== "all") params.assignee = arg.assignee;
  if (arg.role) params.role = arg.role;
  if (arg.rootsOnly) params.rootsOnly = "true";
  return params;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query<TaskDto[], GetTasksArg>({
      query: (arg) => ({
        url: `/projects/${arg.projectId}/tasks`,
        method: "get",
        params: tasksQueryParams(arg),
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
    reorderKanbanColumn: build.mutation<
      TaskDto,
      { projectId: string; taskId: string; status: TaskStatus; orderedTaskIds: string[] }
    >({
      query: ({ projectId, taskId, status, orderedTaskIds }) => ({
        url: `/projects/${projectId}/tasks/kanban-order`,
        method: "patch",
        data: { taskId, status, orderedTaskIds },
      }),
      transformResponse: (response: { task: TaskDto }) => response.task,
      async onQueryStarted(
        { projectId, taskId, status, orderedTaskIds },
        { dispatch, queryFulfilled, getState },
      ) {
        const patches: { undo: () => void }[] = [];
        const positionById = new Map(
          orderedTaskIds.map((id, index) => [id, index * 10] as const),
        );
        const cachedArgs = tasksApi.util.selectCachedArgsForQuery(getState(), "getTasks");

        for (const args of cachedArgs) {
          if (args.projectId !== projectId) continue;
          const patch = dispatch(
            tasksApi.util.updateQueryData("getTasks", args, (draft) => {
              for (const id of orderedTaskIds) {
                const task = draft.find((t) => t.id === id);
                if (!task) continue;
                const pos = positionById.get(id);
                if (pos !== undefined) task.boardPosition = pos;
                if (id === taskId) task.status = status;
              }
            }),
          );
          patches.push(patch);
        }

        try {
          await queryFulfilled;
        } catch {
          for (const p of patches) p.undo();
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

export const {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useReorderKanbanColumnMutation,
  useDeleteTaskMutation,
} = tasksApi;
