import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import type { AppDispatch, RootState } from "../app/store";
import { clearCurrentProject } from "../features/projects/model/projectsSlice";
import { fetchProjectById } from "../features/projects/model/projectsThunks";

export function ProjectPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { projectId } = useParams<{ projectId: string }>();
  const { current, currentLoading, currentError } = useSelector((state: RootState) => state.projects);

  const id = projectId ? Number(projectId) : NaN;

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      return;
    }
    void dispatch(fetchProjectById(id));
    return () => {
      dispatch(clearCurrentProject());
    };
  }, [dispatch, id]);

  if (!Number.isInteger(id) || id < 1) {
    return (
      <section className="page project-page">
        <p className="form-error">Invalid project link.</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    );
  }

  if (currentLoading) {
    return (
      <section className="page project-page">
        <p className="muted">Loading project…</p>
      </section>
    );
  }

  if (currentError || !current) {
    return (
      <section className="page project-page">
        <p className="form-error">{currentError ?? "Project not found."}</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    );
  }

  return (
    <section className="page project-page">
      <p className="eyebrow">Project</p>
      <h2>{current.name}</h2>
      <p className="muted">
        Your role: <strong>{current.role ?? "—"}</strong>
      </p>
      {current.description ? <p className="project-description">{current.description}</p> : null}
      <p className="muted small-meta">
        Updated {new Date(current.updatedAt).toLocaleString()}
      </p>
      <Link to="/" className="back-link">
        ← All projects
      </Link>
    </section>
  );
}
