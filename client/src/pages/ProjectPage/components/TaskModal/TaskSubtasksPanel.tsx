import { type FormEvent, useState } from "react";
import { useCreateTaskMutation } from "../../../../store/api/tasksApi";
import type { TaskDto, TaskStatus } from "../../../../store/types/tasks.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { taskStatusLabel, useI18n } from "../../../../shared/i18n";

type TaskSubtasksPanelProps = {
  projectId: string;
  parentTask: TaskDto;
  subtasks: TaskDto[];
  onEditSubtask: (task: TaskDto) => void;
};

export function TaskSubtasksPanel({
  projectId,
  parentTask,
  subtasks,
  onEditSubtask,
}: TaskSubtasksPanelProps) {
  const { t } = useI18n();
  const [createTask] = useCreateTaskMutation();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      await createTask({
        projectId,
        body: {
          title: trimmed,
          status,
          parentTaskId: parentTask.id,
          sprintId: parentTask.sprintId,
        },
      }).unwrap();
      setTitle("");
      setStatus("todo");
    } catch (err) {
      setError(getRtkQueryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="task-subtasks-panel" aria-labelledby="task-subtasks-heading">
      <h3 id="task-subtasks-heading" className="task-subtasks-heading">
        {t("project.subtasks")}
      </h3>
      {subtasks.length === 0 ? (
        <p className="muted small-meta">{t("project.noSubtasks")}</p>
      ) : (
        <ul className="task-subtasks-list">
          {subtasks.map((st) => (
            <li key={st.id}>
              <button type="button" className="task-subtask-link" onClick={() => onEditSubtask(st)}>
                {st.title}
              </button>
              <span className="muted small-meta">{taskStatusLabel(t, st.status)}</span>
            </li>
          ))}
        </ul>
      )}
      <form className="task-subtask-add" onSubmit={(e) => void handleAdd(e)}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("project.newSubtaskPlaceholder")}
          maxLength={500}
          disabled={saving}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} disabled={saving}>
          <option value="todo">{taskStatusLabel(t, "todo")}</option>
          <option value="in_progress">{taskStatusLabel(t, "in_progress")}</option>
          <option value="done">{taskStatusLabel(t, "done")}</option>
        </select>
        <button type="submit" disabled={saving || title.trim() === ""}>
          {saving ? t("project.adding") : t("project.add")}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
