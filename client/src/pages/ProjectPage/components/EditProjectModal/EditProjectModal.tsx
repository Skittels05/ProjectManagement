import { type FormEvent, useEffect, useState } from "react";
import { useDeleteProjectMutation, useUpdateProjectMutation } from "../../../../store/api/projectsApi";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useI18n } from "../../../../shared/i18n";
import "../../../DashboardPage/components/CreateProjectModal/CreateProjectModal.css";
import "./EditProjectModal.css";

type EditProjectModalProps = {
  isOpen: boolean;
  project: ProjectDto;
  onClose: () => void;
  onDeleted: () => void;
};

export function EditProjectModal({ isOpen, project, onClose, onDeleted }: EditProjectModalProps) {
  const { t } = useI18n();
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
    const confirmed = window.confirm(t("project.deleteProjectConfirm", { name: project.name }));
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
            {t("project.settingsTitle")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label={t("dashboard.close")}
          >
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">{t("project.settingsSubtitle")}</p>
        <form className="project-form auth-form" onSubmit={(e) => void handleSave(e)} style={{ marginTop: 0 }}>
          <label>
            {t("dashboard.name")}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dashboard.namePlaceholder")}
              maxLength={255}
              required
              autoFocus
              disabled={busy}
            />
          </label>
          <label>
            {t("dashboard.descriptionOptional")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dashboard.descriptionPlaceholder")}
              rows={3}
              disabled={busy}
            />
          </label>
          <fieldset className="edit-project-wip">
            <legend>{t("project.wipLegend")}</legend>
            <p className="muted small-meta">{t("project.wipHint")}</p>
            <div className="edit-project-wip-grid">
              <label>
                {t("project.wipTodo")}
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipTodo}
                  onChange={(e) => setWipTodo(e.target.value)}
                  placeholder={t("project.noLimit")}
                  disabled={busy}
                />
              </label>
              <label>
                {t("project.wipInProgress")}
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipInProgress}
                  onChange={(e) => setWipInProgress(e.target.value)}
                  placeholder={t("project.noLimit")}
                  disabled={busy}
                />
              </label>
              <label>
                {t("project.wipDone")}
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={wipDone}
                  onChange={(e) => setWipDone(e.target.value)}
                  placeholder={t("project.noLimit")}
                  disabled={busy}
                />
              </label>
            </div>
          </fieldset>
          {saveError ? <p className="form-error">{saveError}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
              {t("dashboard.cancel")}
            </button>
            <button type="submit" disabled={busy}>
              {updateLoading ? t("project.saving") : t("project.saveChanges")}
            </button>
          </div>
        </form>

        <section className="edit-project-danger" aria-labelledby="edit-project-danger-title">
          <h3 id="edit-project-danger-title">{t("project.dangerZone")}</h3>
          <p className="muted small-meta">{t("project.deleteProjectHint")}</p>
          {deleteError ? <p className="form-error">{deleteError}</p> : null}
          <button
            type="button"
            className="danger-button"
            disabled={busy}
            onClick={() => void handleDelete()}
          >
            {deleteLoading ? t("project.deleting") : t("project.deleteProject")}
          </button>
        </section>
      </div>
    </div>
  );
}