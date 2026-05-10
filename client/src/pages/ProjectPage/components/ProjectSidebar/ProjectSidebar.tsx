import type { SprintDto } from "../../../../store/types/sprints.types";
import "./ProjectSidebar.css";

export type IterationScope = "backlog" | string;

function formatShortDate(value: string): string {
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ProjectSidebarProps = {
  sprints: SprintDto[];
  selectedScope: IterationScope;
  onSelectScope: (scope: IterationScope) => void;
  canManageSprints: boolean;
  onNewSprint: () => void;
  onEditSprint: (sprint: SprintDto) => void;
  onDeleteSprint: (sprint: SprintDto) => void;
  deletingSprintId: string | null;
  onDrawerClose?: () => void;
};

export function ProjectSidebar({
  sprints,
  selectedScope,
  onSelectScope,
  canManageSprints,
  onNewSprint,
  onEditSprint,
  onDeleteSprint,
  deletingSprintId,
  onDrawerClose,
}: ProjectSidebarProps) {
  const selectedSprint =
    selectedScope !== "backlog" ? sprints.find((s) => s.id === selectedScope) ?? null : null;

  return (
    <aside
      id="project-workspace-panel"
      className="project-sidebar-rail"
      aria-label="Iteration workspace"
    >
      <div className="project-sidebar-heading">
        <div className="project-sidebar-heading-text">
          <p className="project-sidebar-title eyebrow">Workspace</p>
          <p className="muted small-meta project-sidebar-sub">
            Choose backlog or a sprint. Tasks below follow this scope.
          </p>
        </div>
        {onDrawerClose ? (
          <button
            type="button"
            className="project-sidebar-drawer-close"
            onClick={onDrawerClose}
            aria-label="Close workspace panel"
          >
            ×
          </button>
        ) : null}
      </div>

      {canManageSprints ? (
        <button type="button" className="primary-button project-sidebar-new-sprint" onClick={onNewSprint}>
          New sprint
        </button>
      ) : null}

      <nav className="project-sidebar-nav">
        <button
          type="button"
          className={`sidebar-scope-btn ${selectedScope === "backlog" ? "sidebar-scope-btn-active" : ""}`}
          onClick={() => onSelectScope("backlog")}
        >
          <span className="sidebar-scope-name">Backlog</span>
          <span className="muted sidebar-scope-hint">Tasks without a sprint</span>
        </button>

        {sprints.map((sprint) => (
          <button
            key={sprint.id}
            type="button"
            className={`sidebar-scope-btn ${selectedScope === sprint.id ? "sidebar-scope-btn-active" : ""}`}
            onClick={() => onSelectScope(sprint.id)}
          >
            <span className="sidebar-scope-name">{sprint.name}</span>
            <span className="muted sidebar-scope-hint">
              {formatShortDate(sprint.startsAt)} — {formatShortDate(sprint.endsAt)} · {sprint.status}
            </span>
          </button>
        ))}
      </nav>

      {canManageSprints && selectedSprint ? (
        <div className="project-sidebar-sprint-actions">
          <button type="button" className="secondary-button" onClick={() => onEditSprint(selectedSprint)}>
            Edit sprint
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={deletingSprintId === selectedSprint.id}
            onClick={() => onDeleteSprint(selectedSprint)}
          >
            {deletingSprintId === selectedSprint.id ? "Removing…" : "Delete sprint"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
