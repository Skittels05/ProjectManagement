import type { TaskListQuery } from "./taskListQuery";

export type TasksViewMode = "list" | "kanban";

export type TasksApiQueryParams = {
  projectId: string;
  sprintFilter: "backlog" | string;
  search?: string;
  sort?: TaskListQuery["sortBy"];
  status?: TaskListQuery["statusFilter"];
  assignee?: TaskListQuery["assigneeFilter"];
  role?: TaskListQuery["roleFilter"];
  rootsOnly?: boolean;
};

export function buildTasksQueryParams(
  projectId: string,
  sprintFilter: "backlog" | string,
  taskListQuery: TaskListQuery,
  tasksView: TasksViewMode,
): TasksApiQueryParams {
  const kanban = tasksView === "kanban";
  return {
    projectId,
    sprintFilter,
    search: taskListQuery.search.trim() || undefined,
    sort: taskListQuery.sortBy,
    status: kanban ? "all" : taskListQuery.statusFilter,
    assignee: taskListQuery.assigneeFilter,
    role: taskListQuery.roleFilter === "all" ? undefined : taskListQuery.roleFilter,
    rootsOnly: kanban,
  };
}
