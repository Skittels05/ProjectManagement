import { type FormEvent, useEffect, useState } from "react";
import { useDeleteProjectMutation, useUpdateProjectMutation } from "../../../../store/api/projectsApi";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import "../../../DashboardPage/components/CreateProjectModal/CreateProjectModal.css";
import "./EditProjectModal.css";

type EditProjectModalProps = {
  isOpen: boolean;
  project: ProjectDto;
  onClose: () => void;
  onDeleted: () => void;
};

export function EditProjectModal({ isOpen, project, onClose, onDeleted }: EditProjectModalProps) {
  const [updateProject, { isLoading: updateLoading }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleteLoading }] = useDeleteProjectMutation();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [wipTodo, setWipTodo] = useState("");
  const [wipInProgress, setWipInProgress] = useState("");
  const [wipDone, setWipDone] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const busy = updateLoading || deleteLoading;

  useEffect(() => {
    if (!isOpen) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setWipTodo(project.wipLimitTodo != null ? String(project.wipLimitTodo) : "");
    setWipInProgress(project.wipLimitInProgress != null ? String(project.wipLimitInProgress) : "");
    setWipDone(project.wipLimitDone != null ? String(project.wipLimitDone) : "");
    setSaveError(null);
    setDeleteError(null);
  }, [
    isOpen,
    project.id,
    project.name,
    project.description,
    project.wipLimitTodo,
    project.wipLimitInProgress,
    project.wipLimitDone,
  ]);

  function parseWipInput(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isNaN(n) ? null : n;
  }

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, busy]);

  if (!isOpen) {
    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    try {
      await updateProject({
        projectId: project.id,
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
        wipLimitTodo: parseWipInput(wipTodo),
        wipLimitInProgress: parseWipInput(wipInProgress),
        wipLimitDone: parseWipInput(wipDone),
      }).unwrap();
      onClose();
    } catch (e) {
      setSaveError(getRtkQueryErrorMessage(e));
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    const confirmed = window.confirm(
      `Delete project "${project.name}"? All sprints, tasks, and team data will be removed permanently.`,
    );
    if (!confirmed) return;

    try {
      await deleteProject(project.id).unwrap();
      onClose();
      onDeleted();
    } catch (e) {
      setDeleteError(getRtkQueryErrorMessage(e));
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (!busy && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-project-title">
        <div className="modal-header">
          <h2 id="edit-project-title" className="modal-title">
            Project settings
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">Update the workspace name and description.</p>
        <form className="project-form auth-form" onSubmit={(e) => void handleSave(e)} style={{ marginTop: 0 }}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product workspace"
              maxLength={255}
              required
              autoFocus
              disabled={busy}
            />
          </label>
          <label>
            Description <span className="muted">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary for the team"
              rows={3}
              disabled={busy}
            />
          </label>
          <fieldset className="edit-project-wip">
            <legend>Kanban WIP limits</legend>
            <p className="muted small-meta">Leave empty for no limit. Applies to top-level cards per column.</p>
            <div className="edit-project-wip-grid">
              <label>
                To do
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipTodo}
                  onChange={(e) => setWipTodo(e.target.value)}
                  placeholder="No limit"
                  disabled={busy}
                />
              </label>
              <label>
                In progress
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipInProgress}
                  onChange={(e) => setWipInProgress(e.target.value)}
                  placeholder="No limit"
                  disabled={busy}
                />
              </label>
              <label>
                Done
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipDone}
                  onChange={(e) => setWipDone(e.target.value)}
                  placeholder="No limit"
                  disabled={busy}
                />
              </label>
            </div>
          </fieldset>
          {saveError ? <p className="form-error">{saveError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              {updateLoading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <section className="edit-project-danger" aria-labelledby="edit-project-danger-title">
          <h3 id="edit-project-danger-title">Danger zone</h3>
          <p className="muted small-meta">
            Permanently delete this project and all related sprints, tasks, and activity.
          </p>
          {deleteError ? <p className="form-error">{deleteError}</p> : null}
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={() => void handleDelete()}
          >
            {deleteLoading ? "Deleting…" : "Delete project"}
          </button>
        </section>
      </div>
    </div>
  );
}