import { useMemo, useState } from "react";
import {
  useDeleteTaskMutation,
  useGetTasksQuery,
} from "../../../../store/api/tasksApi";
import type { ProjectMemberDto } from "../../../../store/types/projects.types";
import type { TaskDto } from "../../../../store/types/tasks.types";
import {
  applyTaskListQuery,
  flattenTaskHierarchy,
  type TaskListQuery,
} from "../../../../shared/lib/taskListQuery";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { subtaskCountLabel, taskStatusLabel, useI18n } from "../../../../shared/i18n";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { AddTaskButton } from "../AddTaskButton/AddTaskButton";
import "./ProjectTasksSection.css";

function statusClass(status: string): string {
  if (status === "done") return "task-status task-status-done";
  if (status === "in_progress") return "task-status task-status-in_progress";
  return "task-status task-status-todo";
}

export type ProjectTasksSectionProps = {
  projectId: string;
  iterationScope: "backlog" | string;
  iterationLabel: string;
  members: ProjectMemberDto[];
  taskListQuery: TaskListQuery;
  onEditTask: (task: TaskDto) => void;
  onAddTask: () => void;
};

export function ProjectTasksSection({
  projectId,
  iterationScope,
  iterationLabel,
  members,
  taskListQuery,
  onEditTask,
  onAddTask,
}: ProjectTasksSectionProps) {
  const { t } = useI18n();
  const sprintFilter = iterationScope === "backlog" ? "backlog" : iterationScope;

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useGetTasksQuery({ projectId, sprintFilter });

  const visibleRows = useMemo(() => {
    const filtered = applyTaskListQuery(tasks, taskListQuery, members);
    return flattenTaskHierarchy(filtered);
  }, [tasks, taskListQuery, members]);

  const tasksErrMsg = tasksError ? getRtkQueryErrorMessage(tasksError) : null;

  const [deleteTask] = useDeleteTaskMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(task: TaskDto) {
    if (!window.confirm(t("project.deleteTaskConfirm", { title: task.title }))) {
      return;
    }
    setDeletingId(task.id);
    try {
      await deleteTask({ projectId, taskId: task.id }).unwrap();
    } catch (err) {
      window.alert(getRtkQueryErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const panelTitle = t("project.tasksTitle", { scope: iterationLabel });

  return (
    <div className="project-tasks-section">
      <ProjectPanel title={panelTitle} headerAction={<AddTaskButton onClick={onAddTask} />}>
        <p className="muted tasks-scope-note">
          {t("project.tasksScope")} <strong>{iterationLabel}</strong>. {t("project.tasksNote")}
          {iterationScope === "backlog" ? ` ${t("project.backlogNote")}` : null}
        </p>

        {tasksLoading ? <p className="muted">{t("project.loadingTasks")}</p> : null}
        {tasksErrMsg ? <p className="form-error">{tasksErrMsg}</p> : null}
        {!tasksLoading && tasks.length === 0 ? (
          <p className="muted">{t("project.noTasksYet")}</p>
        ) : null}
        {!tasksLoading && tasks.length > 0 && visibleRows.length === 0 ? (
          <p className="muted">{t("project.noTasksMatch")}</p>
        ) : null}

        {visibleRows.length > 0 ? (
          <div className="task-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("project.titleCol")}</th>
                  <th>{t("project.status")}</th>
                  <th>{t("project.sp")}</th>
                  <th>{t("project.assignee")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ task, depth }) => (
                  <tr key={task.id} className={depth === 1 ? "task-row-subtask" : undefined}>
                    <td>
                      <div className={depth === 1 ? "task-title-indent" : undefined}>
                        <strong>{task.title}</strong>
                        {depth === 0 && task.subtaskCount > 0 ? (
                          <span className="muted small-meta task-subtask-badge">
                            {subtaskCountLabel(t, task.subtaskCount)}
                          </span>
                        ) : null}
                        {depth === 1 && task.parentTitle ? (
                          <span className="muted small-meta"> ↳ {task.parentTitle}</span>
                        ) : null}
                      </div>
                      {task.description ? (
                        <div className="muted small-meta">{task.description.slice(0, 120)}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className={statusClass(task.status)}>{taskStatusLabel(t, task.status)}</span>
                    </td>
                    <td className="muted">{task.storyPoints ?? t("project.dash")}</td>
                    <td className="muted">
                      {task.assignee?.fullName ?? task.assignee?.email ?? t("project.dash")}
                    </td>
                    <td>
                      <div className="task-actions">
                        <button type="button" onClick={() => onEditTask(task)}>
                          {t("project.edit")}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deletingId === task.id}
                          onClick={() => void handleDelete(task)}
                        >
                          {deletingId === task.id ? t("project.dash") : t("project.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ProjectPanel>
    </div>
  );
}