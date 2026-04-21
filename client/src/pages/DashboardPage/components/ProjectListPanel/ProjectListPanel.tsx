import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { RootState } from "../../../../store";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import "./ProjectListPanel.css";

export function ProjectListPanel() {
  const { list, listLoading, listError } = useSelector((state: RootState) => state.projects);

  return (
    <ProjectPanel title="Your projects">
      {listLoading ? <p className="muted">Loading projects…</p> : null}
      {listError ? <p className="form-error">{listError}</p> : null}
      {!listLoading && list.length === 0 ? (
        <p className="muted">No projects yet. Create one above.</p>
      ) : null}
      <ul className="project-list">
        {list.map((project) => (
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
