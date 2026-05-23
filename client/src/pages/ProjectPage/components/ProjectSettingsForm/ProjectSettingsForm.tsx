import { type FormEvent, useEffect, useState } from "react";
import { useDeleteProjectMutation, useUpdateProjectMutation } from "../../../../store/api/projectsApi";
import type { ProjectDto } from "../../../../store/types/projects.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useConfirm } from "../../../../components/ConfirmDialog/confirmContext";
import { useToast } from "../../../../components/Toast/toastContext";
import { useI18n } from "../../../../shared/i18n";
import "../../../DashboardPage/components/CreateProjectModal/CreateProjectModal.css";
import "../EditProjectModal/EditProjectModal.css";

type ProjectSettingsFormProps = {
  project: ProjectDto;
  onDeleted: () => void;
};

function parseWipInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

export function ProjectSettingsForm({ project, onDeleted }: ProjectSettingsFormProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { confirm } = useConfirm();
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
    setName(project.name);
    setDescription(project.description ?? "");
    setWipTodo(project.wipLimitTodo != null ? String(project.wipLimitTodo) : "");
    setWipInProgress(project.wipLimitInProgress != null ? String(project.wipLimitInProgress) : "");
    setWipDone(project.wipLimitDone != null ? String(project.wipLimitDone) : "");
    setSaveError(null);
    setDeleteError(null);
  }, [
    project.id,
    project.name,
    project.description,
    project.wipLimitTodo,
    project.wipLimitInProgress,
    project.wipLimitDone,
  ]);

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
      toast.success(t("toast.projectSaved"));
    } catch (e) {
      setSaveError(getRtkQueryErrorMessage(e));
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    const confirmed = await confirm({
      message: t("project.deleteProjectConfirm", { name: project.name }),
      variant: "danger",
      confirmLabel: t("project.delete"),
    });
    if (!confirmed) return;

    try {
      await deleteProject(project.id).unwrap();
      toast.success(t("toast.projectDeleted"));
      onDeleted();
    } catch (e) {
      setDeleteError(getRtkQueryErrorMessage(e));
    }
  }

  return (
    <>
      <form className="project-form auth-form project-settings-form" onSubmit={(e) => void handleSave(e)}>
        <label>
          {t("dashboard.name")}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("dashboard.namePlaceholder")}
            maxLength={255}
            required
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
        <button type="submit" disabled={busy}>
          {updateLoading ? t("project.saving") : t("project.saveChanges")}
        </button>
      </form>

      <section className="edit-project-danger" aria-labelledby="edit-project-danger-title">
        <h3 id="edit-project-danger-title">{t("project.dangerZone")}</h3>
        <p className="muted small-meta">{t("project.deleteProjectHint")}</p>
        {deleteError ? <p className="form-error">{deleteError}</p> : null}
        <button type="button" className="danger-button" disabled={busy} onClick={() => void handleDelete()}>
          {deleteLoading ? t("project.deleting") : t("project.deleteProject")}
        </button>
      </section>
    </>
  );
}
