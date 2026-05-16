import type { TaskDto, TaskStatus } from "../../store/types/tasks.types";

const KANBAN_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export type TaskSortOption =
  | "board"
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "priority_desc"
  | "priority_asc"
  | "story_points_desc"
  | "story_points_asc";

export type TaskStatusFilter = "all" | TaskStatus;
export type TaskAssigneeFilter = "all" | "unassigned" | string;
export type TaskRoleFilter = "all" | string;

export type TaskListQuery = {
  search: string;
  sortBy: TaskSortOption;
  statusFilter: TaskStatusFilter;
  assigneeFilter: TaskAssigneeFilter;
  roleFilter: TaskRoleFilter;
};

export const DEFAULT_TASK_LIST_QUERY: TaskListQuery = {
  search: "",
  sortBy: "board",
  statusFilter: "all",
  assigneeFilter: "all",
  roleFilter: "all",
};

export function hasActiveTaskFilters(query: TaskListQuery): boolean {
  return (
    query.search.trim() !== "" ||
    query.statusFilter !== "all" ||
    query.assigneeFilter !== "all" ||
    query.roleFilter !== "all"
  );
}

export type TaskTreeRow = { task: TaskDto; depth: 0 | 1 };

export function flattenTaskHierarchy(tasks: TaskDto[]): TaskTreeRow[] {
  const byParent = new Map<string | null, TaskDto[]>();
  for (const task of tasks) {
    const key = task.parentTaskId;
    const list = byParent.get(key) ?? [];
    list.push(task);
    byParent.set(key, list);
  }

  const rows: TaskTreeRow[] = [];
  const roots = byParent.get(null) ?? [];

  for (const root of roots) {
    rows.push({ task: root, depth: 0 });
    const children = byParent.get(root.id) ?? [];
    for (const child of children) {
      rows.push({ task: child, depth: 1 });
    }
  }

  const listed = new Set(rows.map((r) => r.task.id));
  for (const task of tasks) {
    if (!listed.has(task.id)) {
      rows.push({ task, depth: task.parentTaskId ? 1 : 0 });
    }
  }

  return rows;
}

/** Group server-filtered kanban roots (already sorted) into columns. */
export function groupKanbanTasksFromServer(tasks: TaskDto[]): Record<TaskStatus, TaskDto[]> {
  const grouped: Record<TaskStatus, TaskDto[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };
  for (const task of tasks) {
    if (KANBAN_STATUSES.includes(task.status)) {
      grouped[task.status].push(task);
    }
  }
  return grouped;
}

export function columnIdsFromGrouped(grouped: Record<TaskStatus, TaskDto[]>): Record<TaskStatus, string[]> {
  return {
    todo: grouped.todo.map((t) => t.id),
    in_progress: grouped.in_progress.map((t) => t.id),
    done: grouped.done.map((t) => t.id),
  };
}
