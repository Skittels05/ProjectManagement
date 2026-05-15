import type { ProjectMemberDto } from "../../store/types/projects.types";
import type { TaskDto, TaskStatus } from "../../store/types/tasks.types";
import { sortTasksByBoard } from "./kanban";

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

function memberRoleByUserId(members: ProjectMemberDto[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    map.set(m.userId, m.role);
  }
  return map;
}

function taskMatchesSearch(task: TaskDto, needle: string): boolean {
  const title = task.title.toLowerCase();
  const desc = (task.description ?? "").toLowerCase();
  const assigneeName = (task.assignee?.fullName ?? "").toLowerCase();
  const assigneeEmail = (task.assignee?.email ?? "").toLowerCase();
  return (
    title.includes(needle) ||
    desc.includes(needle) ||
    assigneeName.includes(needle) ||
    assigneeEmail.includes(needle)
  );
}

export function filterTasks(
  tasks: TaskDto[],
  query: TaskListQuery,
  members: ProjectMemberDto[],
): TaskDto[] {
  const needle = query.search.trim().toLowerCase();
  const rolesByUser = memberRoleByUserId(members);

  return tasks.filter((task) => {
    if (needle && !taskMatchesSearch(task, needle)) {
      return false;
    }

    if (query.statusFilter !== "all" && task.status !== query.statusFilter) {
      return false;
    }

    if (query.assigneeFilter === "unassigned") {
      if (task.assigneeId != null) return false;
    } else if (query.assigneeFilter !== "all") {
      if (task.assigneeId !== query.assigneeFilter) return false;
    }

    if (query.roleFilter !== "all") {
      if (!task.assigneeId) return false;
      const role = rolesByUser.get(task.assigneeId) ?? "";
      if (role.trim().toLowerCase() !== query.roleFilter.trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

function compareStoryPoints(a: TaskDto, b: TaskDto, dir: 1 | -1): number {
  const av = a.storyPoints;
  const bv = b.storyPoints;
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return (av - bv) * dir;
}

export function sortTasks(tasks: TaskDto[], sortBy: TaskSortOption): TaskDto[] {
  if (sortBy === "board") {
    return sortTasksByBoard(tasks);
  }

  const copy = [...tasks];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "updated_asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case "title_asc":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      case "title_desc":
        return b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
      case "priority_desc":
        return b.priority - a.priority;
      case "priority_asc":
        return a.priority - b.priority;
      case "story_points_desc":
        return compareStoryPoints(a, b, -1);
      case "story_points_asc":
        return compareStoryPoints(a, b, 1);
      case "updated_desc":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
  return copy;
}

export function applyTaskListQuery(
  tasks: TaskDto[],
  query: TaskListQuery,
  members: ProjectMemberDto[],
): TaskDto[] {
  return sortTasks(filterTasks(tasks, query, members), query.sortBy);
}

export function hasActiveTaskFilters(query: TaskListQuery): boolean {
  return (
    query.search.trim() !== "" ||
    query.statusFilter !== "all" ||
    query.assigneeFilter !== "all" ||
    query.roleFilter !== "all"
  );
}

/** Kanban columns represent status — do not hide tasks by status filter while on the board. */
export function filterTasksForKanbanBoard(
  tasks: TaskDto[],
  query: TaskListQuery,
  members: ProjectMemberDto[],
): TaskDto[] {
  return filterTasks(tasks, { ...query, statusFilter: "all" }, members);
}

export function groupFilteredKanbanTasks(
  tasks: TaskDto[],
  query: TaskListQuery,
  members: ProjectMemberDto[],
): Record<TaskStatus, TaskDto[]> {
  const filtered = filterTasksForKanbanBoard(tasks, query, members);
  const grouped: Record<TaskStatus, TaskDto[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };
  for (const status of KANBAN_STATUSES) {
    const col = filtered.filter((t) => t.status === status);
    grouped[status] = sortTasks(col, query.sortBy);
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
