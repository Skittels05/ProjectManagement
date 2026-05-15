import type { ProjectDto } from "../../store/types/projects.types";
import type { TaskStatus } from "../../store/types/tasks.types";

export type ProjectWipLimits = Pick<
  ProjectDto,
  "wipLimitTodo" | "wipLimitInProgress" | "wipLimitDone"
>;

export function wipLimitForStatus(limits: ProjectWipLimits, status: TaskStatus): number | null {
  switch (status) {
    case "todo":
      return limits.wipLimitTodo;
    case "in_progress":
      return limits.wipLimitInProgress;
    case "done":
      return limits.wipLimitDone;
    default:
      return null;
  }
}

export function formatWipCount(count: number, limit: number | null): string {
  if (limit == null) return String(count);
  return `${count} / ${limit}`;
}

export function isWipLimitExceeded(count: number, limit: number | null): boolean {
  return limit != null && count > limit;
}
