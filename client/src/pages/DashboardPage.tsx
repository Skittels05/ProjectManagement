import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <section className="page dashboard-page">
      <div className="hero-card">
        <p className="eyebrow">Dashboard stub</p>
        <h2>Welcome, {user?.fullName ?? user?.email}</h2>
        <p className="muted">
          The authentication layer is ready. Next iterations can add projects, sprint
          planning, backlog management and analytics on top of this protected area.
        </p>
      </div>

      <div className="feature-grid">
        <article className="feature-card">
          <h3>Projects</h3>
          <p>Create workspaces, invite members and manage roles.</p>
        </article>
        <article className="feature-card">
          <h3>Sprints</h3>
          <p>Plan iterations, estimate in story points and track sprint scope.</p>
        </article>
        <article className="feature-card">
          <h3>Analytics</h3>
          <p>Generate burndown, time reports and planning accuracy insights.</p>
        </article>
      </div>
    </section>
  );
}
