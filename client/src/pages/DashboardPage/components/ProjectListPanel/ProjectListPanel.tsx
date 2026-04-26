import { Link } from "react-router-dom";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import "./ProjectListPanel.css";

type ProjectListPanelProps = {
  projects: ProjectDto[];
  isLoading: boolean;
  error: FetchBaseQueryError | SerializedError | undefined;
  emptyMessage: string;
};

export function ProjectListPanel({ projects, isLoading, error, emptyMessage }: ProjectListPanelProps) {
  const errorMessage = error ? getRtkQueryErrorMessage(error) : null;

  return (
    <ProjectPanel title="My projects">
      {isLoading ? <p className="muted">Loading projects…</p> : null}
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {!isLoading && projects.length === 0 ? <p className="muted">{emptyMessage}</p> : null}
      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/projects/${project.id}`} className="project-card">
              <span className="project-card-title">{project.name}</span>
              {project.description ? (
                <span className="project-card-desc">{project.description}</span>
              ) : (
                <span className="project-card-desc muted">No description</span>
              )}
              <span className="project-card-meta muted">Role: {project.role ?? "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ProjectPanel>
  );
}
