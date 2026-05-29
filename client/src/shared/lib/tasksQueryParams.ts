import { TASK_LIST_PAGE_SIZE, type TaskListQuery } from "./taskListQuery";

export type TasksViewMode = "list" | "kanban";

export type TasksApiQueryParams = {
  projectId: string;
  sprintFilter?: "backlog" | string;
  search?: string;
  sort?: TaskListQuery["sortBy"];
  status?: TaskListQuery["statusFilter"];
  assignee?: TaskListQuery["assigneeFilter"];
  role?: TaskListQuery["roleFilter"];
  rootsOnly?: boolean;
  parentTaskId?: string;
  limit?: number;
  offset?: number;
};

export function buildTasksQueryParams(
  projectId: string,
  sprintFilter: "backlog" | string,
  taskListQuery: TaskListQuery,
  tasksView: TasksViewMode,
  taskListPage = 1,
): TasksApiQueryParams {
  const kanban = tasksView === "kanban";
  const page = Math.max(1, taskListPage);
  return {
    projectId,
    sprintFilter,
    search: taskListQuery.search.trim() || undefined,
    sort: taskListQuery.sortBy,
    status: kanban ? "all" : taskListQuery.statusFilter,
    assignee: taskListQuery.assigneeFilter,
    role: taskListQuery.roleFilter === "all" ? undefined : taskListQuery.roleFilter,
    rootsOnly: kanban,
    limit: kanban ? 500 : TASK_LIST_PAGE_SIZE,
    offset: kanban ? 0 : (page - 1) * TASK_LIST_PAGE_SIZE,
  };
}
