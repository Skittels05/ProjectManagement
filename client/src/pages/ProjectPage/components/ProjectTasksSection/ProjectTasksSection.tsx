import { useMemo, useState } from "react";
import {
  useDeleteTaskMutation,
  useGetTasksQuery,
} from "../../../../store/api/tasksApi";
import type { TaskDto } from "../../../../store/types/tasks.types";
import { flattenTaskHierarchy, hasActiveTaskFilters } from "../../../../shared/lib/taskListQuery";
import type { GetTasksArg } from "../../../../store/api/tasksApi";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useToast } from "../../../../components/Toast/toastContext";
import { subtaskCountLabel, taskStatusLabel, useI18n } from "../../../../shared/i18n";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { Preloader } from "../../../../components/Preloader/Preloader";
import { AddTaskButton } from "../AddTaskButton/AddTaskButton";
import "./ProjectTasksSection.css";

function statusClass(status: string): string {
  if (status === "done") return "task-status task-status-done";
  if (status === "in_progress") return "task-status task-status-in_progress";
  return "task-status task-status-todo";
}

export type ProjectTasksSectionProps = {
  projectId: string;
  tasksQueryArg: GetTasksArg;
  iterationLabel: string;
  onEditTask: (task: TaskDto) => void;
  onAddTask: () => void;
};

export function ProjectTasksSection({
  projectId,
  tasksQueryArg,
  iterationLabel,
  onEditTask,
  onAddTask,
}: ProjectTasksSectionProps) {
  const { t } = useI18n();
  const toast = useToast();

  const {
    data: tasksPage,
    isLoading: tasksLoading,
    error: tasksError,
  } = useGetTasksQuery(tasksQueryArg);

  const tasks = tasksPage?.tasks ?? [];
  const visibleRows = useMemo(() => flattenTaskHierarchy(tasks), [tasks]);

  const listQuery = useMemo(
    () => ({
      search: tasksQueryArg.search ?? "",
      sortBy: tasksQueryArg.sort ?? "board",
      statusFilter: tasksQueryArg.status ?? "all",
      assigneeFilter: tasksQueryArg.assignee ?? "all",
      roleFilter: tasksQueryArg.role ?? "all",
    }),
    [tasksQueryArg],
  );
  const isBacklogScope = tasksQueryArg.sprintFilter === "backlog";

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
      toast.success(t("toast.taskDeleted"));
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
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
          {isBacklogScope ? ` ${t("project.backlogNote")}` : null}
        </p>

        {tasksLoading ? <Preloader size="sm" label={t("project.loadingTasks")} /> : null}
        {tasksErrMsg ? <p className="form-error">{tasksErrMsg}</p> : null}
        {!tasksLoading && tasks.length === 0 ? (
          <p className="muted">
            {hasActiveTaskFilters(listQuery) ? t("project.noTasksMatch") : t("project.noTasksYet")}
          </p>
        ) : null}

        {visibleRows.length > 0 ? (
          <div className="task-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("project.titleCol")}</th>
                  <th>{t("project.status")}</th>
                  <th>{t("project.sp")}</th>
                  <th>{t("project.priority")}</th>
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
                    <td data-label={t("project.status")}>
                      <span className={statusClass(task.status)}>{taskStatusLabel(t, task.status)}</span>
                    </td>
                    <td className="muted" data-label={t("project.sp")}>
                      {task.storyPoints ?? t("project.dash")}
                    </td>
                    <td className="muted" data-label={t("project.priority")}>
                      {task.priority}
                    </td>
                    <td className="muted" data-label={t("project.assignee")}>
                      {task.assignee?.fullName ?? task.assignee?.email ?? t("project.dash")}
                    </td>
                    <td data-label={t("project.actionsCol")}>
                      <div className="task-actions">
                        <button
                          type="button"
                          className="task-action-link"
                          onClick={() => onEditTask(task)}
                        >
                          {t("project.edit")}
                        </button>
                        <button
                          type="button"
                          className="link-danger"
                          disabled={deletingId === task.id}
                          onClick={() => void handleDelete(task)}
                        >
                          {deletingId === task.id ? t("project.removing") : t("project.delete")}
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