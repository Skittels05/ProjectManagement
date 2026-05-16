import type { SprintDto, SprintStatus } from "../../../../store/types/sprints.types";
import { useI18n } from "../../../../shared/i18n";
import { useAppSelector } from "../../../../store/hooks";
import "./ProjectSidebar.css";

export type IterationScope = "backlog" | string;

function formatShortDate(value: string, dateLocale: string): string {
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
  });
}

function sprintStatusLabel(t: (key: string) => string, status: SprintStatus): string {
  if (status === "active") return t("project.sprintActive");
  if (status === "completed") return t("project.sprintCompleted");
  return t("project.sprintPlanned");
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
  const { t } = useI18n();
  const locale = useAppSelector((s) => s.settings.locale);
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  const selectedSprint =
    selectedScope !== "backlog" ? sprints.find((s) => s.id === selectedScope) ?? null : null;

  return (
    <aside
      id="project-workspace-panel"
      className="project-sidebar-rail"
      aria-label={t("project.workspace")}
    >
      <div className="project-sidebar-heading">
        <div className="project-sidebar-heading-text">
          <p className="project-sidebar-title eyebrow">{t("project.sidebarEyebrow")}</p>
          <p className="muted small-meta project-sidebar-sub">{t("project.sidebarHint")}</p>
        </div>
        {onDrawerClose ? (
          <button
            type="button"
            className="project-sidebar-drawer-close"
            onClick={onDrawerClose}
            aria-label={t("project.closePanel")}
          >
            ×
          </button>
        ) : null}
      </div>

      {canManageSprints ? (
        <button type="button" className="primary-button project-sidebar-new-sprint" onClick={onNewSprint}>
          {t("project.newSprint")}
        </button>
      ) : null}

      <nav className="project-sidebar-nav">
        <button
          type="button"
          className={`sidebar-scope-btn ${selectedScope === "backlog" ? "sidebar-scope-btn-active" : ""}`}
          onClick={() => onSelectScope("backlog")}
        >
          <span className="sidebar-scope-name">{t("project.backlog")}</span>
          <span className="muted sidebar-scope-hint">{t("project.backlogHint")}</span>
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
              {formatShortDate(sprint.startsAt, dateLocale)} — {formatShortDate(sprint.endsAt, dateLocale)} ·{" "}
              {sprintStatusLabel(t, sprint.status)}
            </span>
          </button>
        ))}
      </nav>

      {canManageSprints && selectedSprint ? (
        <div className="project-sidebar-sprint-actions">
          <button type="button" className="secondary-button" onClick={() => onEditSprint(selectedSprint)}>
            {t("project.editSprint")}
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={deletingSprintId === selectedSprint.id}
            onClick={() => onDeleteSprint(selectedSprint)}
          >
            {deletingSprintId === selectedSprint.id ? t("project.removing") : t("project.deleteSprint")}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
