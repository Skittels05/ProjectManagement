import { Link } from "react-router-dom";
import { loadProjectNavPath } from "../../../../shared/lib/projectNavStorage";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useI18n } from "../../../../shared/i18n";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import "./ProjectListPanel.css";

type ProjectListPanelProps = {
  projects: ProjectDto[];
  isLoading: boolean;
  error: FetchBaseQueryError | SerializedError | undefined;
  emptyMessage: string;
};

export function ProjectListPanel({ projects, isLoading, error, emptyMessage }: ProjectListPanelProps) {
  const { t } = useI18n();
  const errorMessage = error ? getRtkQueryErrorMessage(error) : null;

  return (
    <ProjectPanel title={t("dashboard.myProjects")}>
      {isLoading ? <p className="muted">{t("dashboard.loadingProjects")}</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {!isLoading && projects.length === 0 ? <p className="muted">{emptyMessage}</p> : null}
      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={loadProjectNavPath(project.id)} className="project-card">
              <span className="project-card-title">{project.name}</span>
              {project.description ? (
                <span className="project-card-desc">{project.description}</span>
              ) : (
                <span className="project-card-desc muted">{t("dashboard.noDescription")}</span>
              )}
              <span className="project-card-meta muted">
                {t("dashboard.role", { role: project.role ?? t("project.dash") })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ProjectPanel>
  );
}
