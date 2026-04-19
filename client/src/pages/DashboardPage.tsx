import { type FormEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import type { AppDispatch, RootState } from "../app/store";
import { createProject, fetchProjects } from "../features/projects/model/projectsThunks";

export function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { list, listLoading, listError, createLoading, createError } = useSelector(
    (state: RootState) => state.projects,
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void dispatch(fetchProjects());
  }, [dispatch]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await dispatch(createProject({ name, description: description || undefined }));

    if (createProject.fulfilled.match(result)) {
      setName("");
      setDescription("");
    }
  }

  return (
    <section className="page dashboard-page">
      <div className="hero-card">
        <p className="eyebrow">Dashboard</p>
        <h2>Welcome, {user?.fullName ?? user?.email}</h2>
        <p className="muted">Create a project to start planning sprints and backlog.</p>
      </div>

      <div className="project-panel">
        <h3 className="panel-title">New project</h3>
        <form className="project-form auth-form" onSubmit={handleCreate}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product workspace"
              maxLength={255}
              required
            />
          </label>
          <label>
            Description <span className="muted">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary for the team"
              rows={3}
            />
          </label>
          {createError ? <p className="form-error">{createError}</p> : null}
          <button type="submit" disabled={createLoading}>
            {createLoading ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>

      <div className="project-panel">
        <h3 className="panel-title">Your projects</h3>
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
      </div>
    </section>
  );
}
