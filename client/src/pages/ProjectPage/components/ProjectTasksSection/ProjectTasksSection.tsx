import { useState } from "react";
import {
  useDeleteTaskMutation,
  useGetTasksQuery,
} from "../../../../store/api/tasksApi";
import type { TaskDto } from "../../../../store/types/tasks.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { AddTaskButton } from "../AddTaskButton/AddTaskButton";
import "./ProjectTasksSection.css";

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  return "To do";
}

function statusClass(status: string): string {
  if (status === "done") return "task-status task-status-done";
  if (status === "in_progress") return "task-status task-status-in_progress";
  return "task-status task-status-todo";
}

export type ProjectTasksSectionProps = {
  projectId: string;
  iterationScope: "backlog" | string;
  iterationLabel: string;
  onEditTask: (task: TaskDto) => void;
  onAddTask: () => void;
};

export function ProjectTasksSection({
  projectId,
  iterationScope,
  iterationLabel,
  onEditTask,
  onAddTask,
}: ProjectTasksSectionProps) {
  const sprintFilter = iterationScope === "backlog" ? "backlog" : iterationScope;

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useGetTasksQuery({ projectId, sprintFilter });

  const tasksErrMsg = tasksError ? getRtkQueryErrorMessage(tasksError) : null;

  const [deleteTask] = useDeleteTaskMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(task: TaskDto) {
    if (!window.confirm(`Delete task “${task.title}”?`)) {
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

  const panelTitle = `Tasks — ${iterationLabel}`;

  return (
    <div className="project-tasks-section">
      <ProjectPanel title={panelTitle} headerAction={<AddTaskButton onClick={onAddTask} />}>
        <p className="muted tasks-scope-note">
          Current scope: <strong>{iterationLabel}</strong>. Press <strong>+</strong> to add a task. Edit or delete in
          the list.
          {iterationScope === "backlog"
            ? " New items stay in the backlog until you assign a sprint in the editor."
            : null}
        </p>

        {tasksLoading ? <p className="muted">Loading tasks…</p> : null}
        {tasksErrMsg ? <p className="form-error">{tasksErrMsg}</p> : null}
        {!tasksLoading && tasks.length === 0 ? (
          <p className="muted">No tasks in this view yet.</p>
        ) : null}

        {tasks.length > 0 ? (
          <div className="task-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>SP</th>
                  <th>Assignee</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description ? (
                        <div className="muted small-meta">{task.description.slice(0, 120)}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
                    </td>
                    <td className="muted">{task.storyPoints ?? "—"}</td>
                    <td className="muted">{task.assignee?.fullName ?? task.assignee?.email ?? "—"}</td>
                    <td>
                      <div className="task-actions">
                        <button type="button" onClick={() => onEditTask(task)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={deletingId === task.id}
                          onClick={() => void handleDelete(task)}
                        >
                          {deletingId === task.id ? "…" : "Delete"}
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
