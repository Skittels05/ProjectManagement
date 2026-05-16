import type { IterationScope } from "../../pages/ProjectPage/components/ProjectSidebar/ProjectSidebar";
import type { TasksViewMode } from "../../pages/ProjectPage/ProjectPage";
import {
  DEFAULT_TASK_LIST_QUERY,
  type TaskAssigneeFilter,
  type TaskListQuery,
  type TaskRoleFilter,
  type TaskSortOption,
  type TaskStatusFilter,
} from "./taskListQuery";
import { isUuidV4 } from "./uuid";

const TASK_SORT_OPTIONS: TaskSortOption[] = [
  "board",
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
  "priority_desc",
  "priority_asc",
  "story_points_desc",
  "story_points_asc",
];

const TASK_STATUS_FILTERS: TaskStatusFilter[] = ["all", "todo", "in_progress", "done"];

function parseTasksView(raw: string | null): TasksViewMode {
  return raw === "kanban" ? "kanban" : "list";
}

function parseSort(raw: string | null): TaskSortOption {
  if (raw && TASK_SORT_OPTIONS.includes(raw as TaskSortOption)) {
    return raw as TaskSortOption;
  }
  return DEFAULT_TASK_LIST_QUERY.sortBy;
}

function parseStatusFilter(raw: string | null): TaskStatusFilter {
  if (raw && TASK_STATUS_FILTERS.includes(raw as TaskStatusFilter)) {
    return raw as TaskStatusFilter;
  }
  return "all";
}

function parseAssigneeFilter(raw: string | null): TaskAssigneeFilter {
  if (raw === "unassigned" || raw === "all") return raw;
  if (raw && isUuidV4(raw)) return raw;
  return "all";
}

function parseRoleFilter(raw: string | null): TaskRoleFilter {
  if (!raw || raw === "all") return "all";
  return raw;
}

export function parseIterationScopeFromParams(
  params: URLSearchParams,
  sprintIds: string[],
  sprintsResolved: boolean,
): IterationScope {
  const raw = params.get("scope");
  if (!raw || raw === "backlog") return "backlog";
  if (!isUuidV4(raw)) return "backlog";
  // Keep URL scope until sprints are loaded — avoid resetting to backlog on first paint.
  if (!sprintsResolved) return raw;
  return sprintIds.includes(raw) ? raw : "backlog";
}

export function parseProjectPageState(
  params: URLSearchParams,
  sprintIds: string[],
  sprintsResolved: boolean,
): {
  iterationScope: IterationScope;
  tasksView: TasksViewMode;
  taskListQuery: TaskListQuery;
} {
  return {
    iterationScope: parseIterationScopeFromParams(params, sprintIds, sprintsResolved),
    tasksView: parseTasksView(params.get("view")),
    taskListQuery: {
      search: params.get("q") ?? "",
      sortBy: parseSort(params.get("sort")),
      statusFilter: parseStatusFilter(params.get("status")),
      assigneeFilter: parseAssigneeFilter(params.get("assignee")),
      roleFilter: parseRoleFilter(params.get("role")),
    },
  };
}

export function buildProjectPageSearchParams(
  iterationScope: IterationScope,
  tasksView: TasksViewMode,
  taskListQuery: TaskListQuery,
): URLSearchParams {
  const next = new URLSearchParams();

  if (iterationScope !== "backlog") {
    next.set("scope", iterationScope);
  }
  if (tasksView === "kanban") {
    next.set("view", "kanban");
  }

  const q = taskListQuery.search.trim();
  if (q) next.set("q", q);
  if (taskListQuery.sortBy !== DEFAULT_TASK_LIST_QUERY.sortBy) {
    next.set("sort", taskListQuery.sortBy);
  }
  if (taskListQuery.statusFilter !== "all") {
    next.set("status", taskListQuery.statusFilter);
  }
  if (taskListQuery.assigneeFilter !== "all") {
    next.set("assignee", taskListQuery.assigneeFilter);
  }
  if (taskListQuery.roleFilter !== "all") {
    next.set("role", taskListQuery.roleFilter);
  }

  return next;
}

export function projectPageSearchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString();
}
