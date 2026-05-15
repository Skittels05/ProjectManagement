import { type FormEvent, useEffect, useState } from "react";
import { useCreateTaskMutation, useUpdateTaskMutation } from "../../../../store/api/tasksApi";
import type { ProjectMemberDto } from "../../../../store/types/projects.types";
import type { SprintDto } from "../../../../store/types/sprints.types";
import type { CreateTaskBody, TaskDto, TaskStatus, UpdateTaskBody } from "../../../../store/types/tasks.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { TaskAttachmentsPanel } from "./TaskAttachmentsPanel";
import { TaskCommentsPanel } from "./TaskCommentsPanel";
import "../ProjectTasksSection/ProjectTasksSection.css";
import "./TaskModalEngagement.css";

type TaskModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  projectId: string;
  members: ProjectMemberDto[];
  sprints: SprintDto[];
  task: TaskDto | null;
  defaultSprintId?: string | null;
  onClose: () => void;
};

const SP_OPTIONS = ["", "1", "2", "3", "5", "8", "13"] as const;

export function TaskModal({
  isOpen,
  mode,
  projectId,
  members,
  sprints,
  task,
  defaultSprintId = null,
  onClose,
}: TaskModalProps) {
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [storyPoints, setStoryPoints] = useState("");
  const [priority, setPriority] = useState("0");
  const [sprintChoice, setSprintChoice] = useState<string>("");
  const [assigneeChoice, setAssigneeChoice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSaving(false);
      return;
    }
    if (mode === "edit" && task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setStoryPoints(task.storyPoints != null ? String(task.storyPoints) : "");
      setPriority(String(task.priority));
      setSprintChoice(task.sprintId ?? "");
      setAssigneeChoice(task.assigneeId ?? "");
      return;
    }
    setTitle("");
    setDescription("");
    setStatus("todo");
    setStoryPoints("");
    setPriority("0");
    setSprintChoice(defaultSprintId ?? "");
    setAssigneeChoice("");
  }, [isOpen, mode, task, defaultSprintId]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const descTrim = description.trim();
    const priorityNum = Number.parseInt(priority, 10);
    const sp =
      storyPoints === ""
        ? null
        : Number.parseInt(storyPoints, 10);

    try {
      if (mode === "create") {
        const body: CreateTaskBody = {
          title: title.trim(),
          status,
          priority: Number.isNaN(priorityNum) ? 0 : priorityNum,
          sprintId: sprintChoice === "" ? null : sprintChoice,
          assigneeId: assigneeChoice === "" ? null : assigneeChoice,
          storyPoints: sp,
        };
        if (descTrim !== "") {
          body.description = descTrim;
        }
        await createTask({ projectId, body }).unwrap();
        onClose();
        return;
      }

      if (!task) {
        return;
      }

      const body: UpdateTaskBody = {
        title: title.trim(),
        description: descTrim === "" ? null : descTrim,
        status,
        priority: Number.isNaN(priorityNum) ? 0 : priorityNum,
        sprintId: sprintChoice === "" ? null : sprintChoice,
        assigneeId: assigneeChoice === "" ? null : assigneeChoice,
        storyPoints: sp,
      };
      await updateTask({ projectId, taskId: task.id, body }).unwrap();
      onClose();
    } catch (err) {
      setError(getRtkQueryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const heading = mode === "create" ? "New task" : "Edit task";

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div className="modal-card modal-card--task" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <h2 id="task-modal-title" className="modal-title">
            {heading}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">
          Assign to backlog or a sprint, set status and optional story points.
        </p>
        <form className="project-form auth-form" onSubmit={(ev) => void handleSubmit(ev)}>
          <div className="task-modal-grid">
            <label className="full-row">
              Title
              <input
                type="text"
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                maxLength={500}
                required
                autoFocus
              />
            </label>
            <label className="full-row">
              Description <span className="muted">(optional)</span>
              <textarea value={description} onChange={(ev) => setDescription(ev.target.value)} rows={3} />
            </label>
            <label>
              Status
              <select value={status} onChange={(ev) => setStatus(ev.target.value as TaskStatus)}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              Priority
              <input
                type="number"
                min={0}
                max={1000}
                value={priority}
                onChange={(ev) => setPriority(ev.target.value)}
              />
            </label>
            <label>
              Story points <span className="muted">(optional)</span>
              <select value={storyPoints} onChange={(ev) => setStoryPoints(ev.target.value)}>
                <option value="">—</option>
                {SP_OPTIONS.filter((x) => x !== "").map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sprint
              <select value={sprintChoice} onChange={(ev) => setSprintChoice(ev.target.value)}>
                <option value="">Backlog (no sprint)</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-row">
              Assignee
              <select value={assigneeChoice} onChange={(ev) => setAssigneeChoice(ev.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create task" : "Save changes"}
            </button>
          </div>
        </form>

        {mode === "edit" && task ? (
          <div className="task-modal-engagement">
            <TaskCommentsPanel projectId={projectId} taskId={task.id} />
            <TaskAttachmentsPanel projectId={projectId} taskId={task.id} />
          </div>
        ) : (
          <p className="muted small-meta task-modal-engagement-hint">
            Save the task first to add comments and attachments.
          </p>
        )}
      </div>
    </div>
  );
}
