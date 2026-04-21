import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../../store";
import { deleteSprint } from "../../../../store/thunks/projectsThunks";
import type { SprintDto } from "../../../../store/types/sprints.types";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { SprintModal } from "../SprintModal/SprintModal";
import "./ProjectSprintsSection.css";

function formatDisplayDate(value: string): string {
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return value;
  }
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
}

function statusClass(status: string): string {
  if (status === "active") return "sprint-status sprint-status-active";
  if (status === "completed") return "sprint-status sprint-status-completed";
  return "sprint-status sprint-status-planned";
}

type ProjectSprintsSectionProps = {
  projectId: string;
  canManageSprints: boolean;
};

export function ProjectSprintsSection({ projectId, canManageSprints }: ProjectSprintsSectionProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { sprints, sprintsLoading, sprintsError } = useSelector((state: RootState) => state.projects);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingSprint, setEditingSprint] = useState<SprintDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setModalMode("create");
    setEditingSprint(null);
    setModalOpen(true);
  }

  function openEdit(sprint: SprintDto) {
    setModalMode("edit");
    setEditingSprint(sprint);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSprint(null);
  }

  async function handleDelete(sprint: SprintDto) {
    if (!window.confirm(`Delete sprint “${sprint.name}”? Tasks will move back to the backlog (unassigned).`)) {
      return;
    }
    setDeletingId(sprint.id);
    const result = await dispatch(deleteSprint({ projectId, sprintId: sprint.id }));
    setDeletingId(null);
    if (deleteSprint.rejected.match(result)) {
      window.alert(result.payload ?? "Could not delete sprint");
    }
  }

  return (
    <div className="sprints-section">
      <ProjectPanel title="Sprints">
        {canManageSprints ? (
          <div className="sprints-toolbar">
            <button type="button" className="primary-button" onClick={openCreate}>
              New sprint
            </button>
          </div>
        ) : null}
        {sprintsLoading ? <p className="muted">Loading sprints…</p> : null}
        {sprintsError ? <p className="form-error">{sprintsError}</p> : null}
        {!sprintsLoading && sprints.length === 0 ? (
          <p className="muted">No sprints yet.{canManageSprints ? " Create one to plan an iteration." : null}</p>
        ) : null}
        {sprints.length > 0 ? (
          <div className="sprint-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Goal</th>
                  {canManageSprints ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {sprints.map((sprint) => (
                  <tr key={sprint.id}>
                    <td>
                      <strong>{sprint.name}</strong>
                    </td>
                    <td className="muted">
                      {formatDisplayDate(sprint.startsAt)} — {formatDisplayDate(sprint.endsAt)}
                    </td>
                    <td>
                      <span className={statusClass(sprint.status)}>{sprint.status}</span>
                    </td>
                    <td className="sprint-goal-cell">{sprint.goal ?? "—"}</td>
                    {canManageSprints ? (
                      <td>
                        <div className="sprint-actions">
                          <button type="button" onClick={() => openEdit(sprint)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={deletingId === sprint.id}
                            onClick={() => void handleDelete(sprint)}
                          >
                            {deletingId === sprint.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ProjectPanel>

      <SprintModal
        isOpen={modalOpen}
        mode={modalMode}
        projectId={projectId}
        sprint={editingSprint}
        onClose={closeModal}
      />
    </div>
  );
}
