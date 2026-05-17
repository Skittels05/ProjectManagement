import type { IterationScope } from "../../pages/ProjectPage/components/ProjectSidebar/ProjectSidebar";
import type { TasksViewMode } from "../../pages/ProjectPage/ProjectPage";
import type { TaskListQuery } from "./taskListQuery";
import { buildProjectPageSearchParams } from "./projectPageSearchParams";

export type ProjectSection = "tasks" | "board" | "analytics";

export function projectTasksPath(
  projectId: string,
  iterationScope: IterationScope,
  tasksView: TasksViewMode,
  taskListQuery: TaskListQuery,
  page = 1,
): string {
  const params = buildProjectPageSearchParams(iterationScope, tasksView, taskListQuery, page);
  const qs = params.toString();
  return `/projects/${projectId}${qs ? `?${qs}` : ""}`;
}

export function projectAnalyticsPath(projectId: string, iterationScope: IterationScope): string {
  if (iterationScope !== "backlog") {
    return `/projects/${projectId}/analytics?sprint=${iterationScope}&tab=sprint`;
  }
  return `/projects/${projectId}/analytics?tab=sprint`;
}
