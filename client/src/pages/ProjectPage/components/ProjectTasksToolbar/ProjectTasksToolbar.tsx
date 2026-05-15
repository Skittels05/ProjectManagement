import type { ProjectMemberDto } from "../../../../store/types/projects.types";
import type {
  TaskAssigneeFilter,
  TaskListQuery,
  TaskRoleFilter,
  TaskSortOption,
  TaskStatusFilter,
} from "../../../../shared/lib/taskListQuery";
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
        <label htmlFor="project-task-search">Search</label>
        <input
          id="project-task-search"
          type="search"
          value={query.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Title, description, assignee…"
          autoComplete="off"
        />
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-sort">Sort</label>
        <select
          id="project-task-sort"
          value={query.sortBy}
          onChange={(e) => onChange({ sortBy: e.target.value as TaskSortOption })}
        >
          <option value="board">Board order</option>
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Oldest update first</option>
          <option value="title_asc">Title A–Z</option>
          <option value="title_desc">Title Z–A</option>
          <option value="priority_desc">Priority high → low</option>
          <option value="priority_asc">Priority low → high</option>
          <option value="story_points_desc">Story points high → low</option>
          <option value="story_points_asc">Story points low → high</option>
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-status">Status</label>
        <select
          id="project-task-status"
          value={query.statusFilter}
          onChange={(e) => onChange({ statusFilter: e.target.value as TaskStatusFilter })}
        >
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-assignee">Assignee</label>
        <select
          id="project-task-assignee"
          value={query.assigneeFilter}
          onChange={(e) => onChange({ assigneeFilter: e.target.value as TaskAssigneeFilter })}
        >
          <option value="all">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.fullName || m.email}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-field">
        <label htmlFor="project-task-role">Member role</label>
        <select
          id="project-task-role"
          value={query.roleFilter}
          onChange={(e) => onChange({ roleFilter: e.target.value as TaskRoleFilter })}
        >
          <option value="all">Any role</option>
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
            Clear filters
          </button>
        </div>
      ) : null}

      <p className="muted project-tasks-toolbar-meta">
        Showing {resultCount} of {totalCount} task{totalCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
