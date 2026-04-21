import { type FormEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../../store";
import { createProject } from "../../../../store/thunks/projectsThunks";
import "./CreateProjectModal.css";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { createLoading, createError } = useSelector((state: RootState) => state.projects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
    }
  }, [isOpen]);

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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await dispatch(createProject({ name, description: description || undefined }));

    if (createProject.fulfilled.match(result)) {
      onClose();
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
        <div className="modal-header">
          <h2 id="create-project-title" className="modal-title">
            New project
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">Add a workspace for your team. You can edit details later.</p>
        <form className="project-form auth-form" onSubmit={(e) => void handleCreate(e)} style={{ marginTop: 0 }}>
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
            />
          </label>
          <label>
            Description <span className="muted">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary for the team"
              rows={3}
            />
          </label>
          {createError ? <p className="form-error">{createError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={createLoading}>
              Cancel
            </button>
            <button type="submit" disabled={createLoading}>
              {createLoading ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
