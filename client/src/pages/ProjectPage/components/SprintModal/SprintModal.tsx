import { type FormEvent, useEffect, useState } from "react";
import { useCreateSprintMutation, useUpdateSprintMutation } from "../../../../store/api/sprintsApi";
import type { SprintDto, SprintStatus } from "../../../../store/types/sprints.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import "./SprintModal.css";

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDates(): { startsAt: string; endsAt: string } {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return { startsAt: toYmdLocal(start), endsAt: toYmdLocal(end) };
}

function dateInputValue(value: string): string {
  return String(value).slice(0, 10);
}

type SprintModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  projectId: string;
  sprint: SprintDto | null;
  onClose: () => void;
};

export function SprintModal({ isOpen, mode, projectId, sprint, onClose }: SprintModalProps) {
  const [createSprint] = useCreateSprintMutation();
  const [updateSprint] = useUpdateSprintMutation();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<SprintStatus>("planned");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSaving(false);
      return;
    }
    if (mode === "edit" && sprint) {
      setName(sprint.name);
      setGoal(sprint.goal ?? "");
      setStartsAt(dateInputValue(sprint.startsAt));
      setEndsAt(dateInputValue(sprint.endsAt));
      setStatus(sprint.status);
      return;
    }
    const d = defaultDates();
    setName("");
    setGoal("");
    setStartsAt(d.startsAt);
    setEndsAt(d.endsAt);
    setStatus("planned");
  }, [isOpen, mode, sprint]);

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
    const goalTrim = goal.trim();
    const goalPayload = goalTrim === "" ? null : goalTrim;

    try {
      if (mode === "create") {
        await createSprint({
          projectId,
          body: {
            name: name.trim(),
            goal: goalPayload,
            startsAt,
            endsAt,
            status,
          },
        }).unwrap();
        onClose();
        return;
      }

      if (!sprint) {
        return;
      }

      await updateSprint({
        projectId,
        sprintId: sprint.id,
        body: {
          name: name.trim(),
          goal: goalPayload,
          startsAt,
          endsAt,
          status,
        },
      }).unwrap();
      onClose();
    } catch (err) {
      setError(getRtkQueryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "New sprint" : "Edit sprint";

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card sprint-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprint-modal-title"
      >
        <div className="modal-header">
          <h2 id="sprint-modal-title" className="modal-title">
            {title}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">Set dates and status. Only one sprint can be active at a time.</p>
        <form className="project-form auth-form sprint-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="sprint-modal-grid">
            <label className="full-row">
              Name
              <input
                type="text"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                maxLength={255}
                required
                autoFocus
              />
            </label>
            <label className="full-row">
              Goal <span className="muted">(optional)</span>
              <textarea value={goal} onChange={(ev) => setGoal(ev.target.value)} rows={2} maxLength={20000} />
            </label>
            <label>
              Start
              <input type="date" value={startsAt} onChange={(ev) => setStartsAt(ev.target.value)} required />
            </label>
            <label>
              End
              <input type="date" value={endsAt} onChange={(ev) => setEndsAt(ev.target.value)} required />
            </label>
            <label className="full-row">
              Status
              <select value={status} onChange={(ev) => setStatus(ev.target.value as SprintStatus)}>
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create sprint" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
