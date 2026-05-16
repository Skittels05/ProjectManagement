import type { ProjectMemberDto } from "../../../../store/types/projects.types";
import type {
  TaskAssigneeFilter,
  TaskListQuery,
  TaskRoleFilter,
  TaskSortOption,
  TaskStatusFilter,
} from "../../../../shared/lib/taskListQuery";
import { taskStatusLabel, useI18n } from "../../../../shared/i18n";
import "./ProjectTasksToolbar.css";

type ProjectTasksToolbarProps = {
  query: TaskListQuery;
  members: ProjectMemberDto[];
  onChange: (patch: Partial<TaskListQuery>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
};

export function ProjectTasksToolbar({
  query,
  members,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: ProjectTasksToolbarProps) {
  const { t } = useI18n();
  const roleOptions = [...new Set(members.map((m) => m.role.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const showReset =
    query.search.trim() !== "" ||
    query.statusFilter !== "all" ||
    query.assigneeFilter !== "all" ||
    query.roleFilter !== "all";

  return (
    <div className="project-tasks-toolbar">
      <div className="toolbar-field toolbar-field-grow">
        <label htmlFor="project-task-search">{t("project.searchTasks")}</label>
        <input
          id="project-task-search"
          type="search"
          value={query.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder={t("project.searchTasksPlaceholder")}
          autoComplete="off"
        />
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-sort">{t("dashboard.sort")}</label>
        <select
          id="project-task-sort"
          value={query.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as TaskSortOption })}
        >
          <option value="board">{t("project.sortBoard")}</option>
          <option value="updated_desc">{t("project.sortUpdatedDesc")}</option>
          <option value="updated_asc">{t("project.sortUpdatedAsc")}</option>
          <option value="title_asc">{t("project.sortTitleAsc")}</option>
          <option value="title_desc">{t("project.sortTitleDesc")}</option>
          <option value="priority_desc">{t("project.sortPriorityDesc")}</option>
          <option value="priority_asc">{t("project.sortPriorityAsc")}</option>
          <option value="story_points_desc">{t("project.sortSpDesc")}</option>
          <option value="story_points_asc">{t("project.sortSpAsc")}</option>
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-status">{t("project.status")}</label>
        <select
          id="project-task-status"
          value={query.statusFilter}
          onChange={(e) => onChange({ statusFilter: e.target.value as TaskStatusFilter })}
        >
          <option value="all">{t("project.allStatuses")}</option>
          <option value="todo">{taskStatusLabel(t, "todo")}</option>
          <option value="in_progress">{taskStatusLabel(t, "in_progress")}</option>
          <option value="done">{taskStatusLabel(t, "done")}</option>
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-assignee">{t("project.assignee")}</label>
        <select
          id="project-task-assignee"
          value={query.assigneeFilter}
          onChange={(e) => onChange({ assigneeFilter: e.target.value as TaskAssigneeFilter })}
        >
          <option value="all">{t("project.anyone")}</option>
          <option value="unassigned">{t("project.unassigned")}</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.fullName || m.email}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-role">{t("project.memberRole")}</label>
        <select
          id="project-task-role"
          value={query.roleFilter}
          onChange={(e) => onChange({ roleFilter: e.target.value as TaskRoleFilter })}
        >
          <option value="all">{t("project.anyRole")}</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {showReset ? (
        <div className="project-tasks-toolbar-actions">
          <button type="button" className="secondary-button" onClick={onReset}>
            {t("project.clearFilters")}
          </button>
        </div>
      ) : null}

      <p className="muted project-tasks-toolbar-meta">
        {t("project.showingTasks", { shown: resultCount, total: totalCount })}
      </p>
    </div>
  );
}
