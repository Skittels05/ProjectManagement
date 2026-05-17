import { NavLink } from "react-router-dom";
import type { IterationScope } from "../ProjectSidebar/ProjectSidebar";
import type { TaskListQuery } from "../../../../shared/lib/taskListQuery";
import {
  projectAnalyticsPath,
  projectTasksPath,
  type ProjectSection,
} from "../../../../shared/lib/projectSectionNav";
import { useI18n } from "../../../../shared/i18n";
import "./ProjectSectionNav.css";

type ProjectSectionNavProps = {
  projectId: string;
  active: ProjectSection;
  iterationScope: IterationScope;
  taskListQuery: TaskListQuery;
  taskListPage: number;
};

export function ProjectSectionNav({
  projectId,
  active,
  iterationScope,
  taskListQuery,
  taskListPage,
}: ProjectSectionNavProps) {
  const { t } = useI18n();

  const tasksHref = projectTasksPath(projectId, iterationScope, "list", taskListQuery, taskListPage);
  const boardHref = projectTasksPath(projectId, iterationScope, "kanban", taskListQuery, 1);
  const analyticsHref = projectAnalyticsPath(projectId, iterationScope);

  return (
    <nav className="project-section-nav" aria-label={t("project.navSectionsLabel")}>
      <NavLink
        to={tasksHref}
        className={`project-section-nav-link${active === "tasks" ? " project-section-nav-link-active" : ""}`}
        end
      >
        {t("project.navTasks")}
      </NavLink>
      <NavLink
        to={boardHref}
        className={`project-section-nav-link${active === "board" ? " project-section-nav-link-active" : ""}`}
      >
        {t("project.navBoard")}
      </NavLink>
      <NavLink
        to={analyticsHref}
        className={`project-section-nav-link${active === "analytics" ? " project-section-nav-link-active" : ""}`}
      >
        {t("project.navAnalytics")}
      </NavLink>
    </nav>
  );
}
