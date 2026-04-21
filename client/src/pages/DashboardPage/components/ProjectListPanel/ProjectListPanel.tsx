import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../../../store";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import "./ProjectListPanel.css";

type ProjectListPanelProps = {
  projects: ProjectDto[];
  emptyMessage: string;
};

export function ProjectListPanel({ projects, emptyMessage }: ProjectListPanelProps) {
  const { listLoading, listError } = useSelector((state: RootState) => state.projects);

  return (
    <ProjectPanel title="My projects">
      {listLoading ? <p className="muted">Loading projects…</p> : null}
      {listError ? <p className="form-error">{listError}</p> : null}
      {!listLoading && projects.length === 0 ? <p className="muted">{emptyMessage}</p> : null}
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
