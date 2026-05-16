import { type FormEvent, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store";
import {
  useCreateTaskTimeLogMutation,
  useDeleteTaskTimeLogMutation,
  useGetTaskTimeLogsQuery,
  useUpdateTaskTimeLogMutation,
} from "../../../../store/api/taskEngagementApi";
import type { TaskTimeLogDto } from "../../../../store/types/taskEngagement.types";
import {
  formatDurationMinutes,
  parseDurationInput,
  splitDurationMinutes,
  toDatetimeLocalValue,
} from "../../../../shared/lib/duration";
import { sameUserId } from "../../../../shared/lib/uuid";
import { formatLocaleDateTime } from "../../../../shared/lib/formatDate";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useI18n } from "../../../../shared/i18n";
import { useAppSelector } from "../../../../store/hooks";

type TaskTimeLogsPanelProps = { projectId: string; taskId: string };

export function TaskTimeLogsPanel({ projectId, taskId }: TaskTimeLogsPanelProps) {
  const { t } = useI18n();
  const locale = useAppSelector((s) => s.settings.locale);
  const { user } = useSelector((state: RootState) => state.auth);
  const { data, isLoading, error } = useGetTaskTimeLogsQuery({ projectId, taskId });
  const [createLog, { isLoading: creating }] = useCreateTaskTimeLogMutation();
  const [updateLog, { isLoading: updating }] = useUpdateTaskTimeLogMutation();
  const [deleteLog] = useDeleteTaskTimeLogMutation();

  const logs = data?.logs ?? [];
  const totalMinutes = data?.totalMinutes ?? 0;

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [loggedAt, setLoggedAt] = useState(() => toDatetimeLocalValue(new Date()));
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editLoggedAt, setEditLoggedAt] = useState("");

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const total = parseDurationInput(hours, minutes);
    if (total == null) {
      setFormError(t("project.durationError"));
      return;
    }
    setFormError(null);
    try {
      await createLog({
        projectId,
        taskId,
        minutes: total,
        note: note.trim() === "" ? null : note.trim(),
        loggedAt: new Date(loggedAt).toISOString(),
      }).unwrap();
      setHours("");
      setMinutes("30");
      setNote("");
      setLoggedAt(toDatetimeLocalValue(new Date()));
    } catch (err) {
      setFormError(getRtkQueryErrorMessage(err));
    }
  }

  async function saveEdit(timeLogId: string) {
    const total = parseDurationInput(editHours, editMinutes);
    if (total == null) {
      setFormError(t("project.durationInvalid"));
      return;
    }
    try {
      await updateLog({
        projectId,
        taskId,
        timeLogId,
        minutes: total,
        note: editNote.trim() === "" ? null : editNote.trim(),
        loggedAt: new Date(editLoggedAt).toISOString(),
      }).unwrap();
      setEditingId(null);
      setFormError(null);
    } catch (err) {
      setFormError(getRtkQueryErrorMessage(err));
    }
  }

  return (
    <section className="task-engagement-panel">
      <div className="task-time-summary">
        <h3>{t("project.timeLogged")}</h3>
        <span className="task-time-total">
          {t("project.timeTotal", { duration: formatDurationMinutes(totalMinutes) })}
        </span>
      </div>
      {isLoading ? <p className="muted">{t("project.loadingTasks")}</p> : null}
      {error ? <p className="form-error">{getRtkQueryErrorMessage(error)}</p> : null}
      <ul className="task-time-log-list">
        {logs.map((log) => (
          <TimeLogRow
            key={log.id}
            log={log}
            isOwn={sameUserId(log.userId, user?.id)}
            isEditing={editingId === log.id}
            editHours={editHours}
            editMinutes={editMinutes}
            editNote={editNote}
            editLoggedAt={editLoggedAt}
            updating={updating}
            onEdit={() => {
              const parts = splitDurationMinutes(log.minutes);
              setEditingId(log.id);
              setEditHours(parts.hours);
              setEditMinutes(parts.minutes);
              setEditNote(log.note ?? "");
              setEditLoggedAt(toDatetimeLocalValue(new Date(log.loggedAt)));
            }}
            onEditHoursChange={setEditHours}
            onEditMinutesChange={setEditMinutes}
            onEditNoteChange={setEditNote}
            onEditLoggedAtChange={setEditLoggedAt}
            onSave={() => void saveEdit(log.id)}
            onCancel={() => {
              setEditingId(null);
              setFormError(null);
            }}
            locale={locale}
            onDelete={async () => {
              if (!window.confirm(t("project.deleteTimeConfirm"))) return;
              try {
                await deleteLog({ projectId, taskId, timeLogId: log.id }).unwrap();
              } catch (err) {
                window.alert(getRtkQueryErrorMessage(err));
              }
            }}
          />
        ))}
      </ul>
      {!isLoading && logs.length === 0 ? <p className="muted">{t("project.noTimeLogged")}</p> : null}
      <form className="task-time-log-form" onSubmit={(e) => void handleAdd(e)}>
        <div className="task-time-log-form-row">
          <label>
            {t("project.hours")}
            <input
              type="number"
              min={0}
              max={24}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="0"
              disabled={creating}
            />
          </label>
          <label>
            {t("project.minutes")}
            <input
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              disabled={creating}
            />
          </label>
          <label>
            {t("project.when")}
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              disabled={creating}
            />
          </label>
        </div>
        <label className="full-row">
          {t("project.noteOptional")}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("project.timeNotePlaceholder")}
            maxLength={2000}
            disabled={creating}
          />
        </label>
        {formError ? <p className="form-error">{formError}</p> : null}
        <button type="submit" disabled={creating}>
          {creating ? t("project.saving") : t("project.logTime")}
        </button>
      </form>
    </section>
  );
}

function TimeLogRow(props: {
  log: TaskTimeLogDto;
  isOwn: boolean;
  isEditing: boolean;
  editHours: string;
  editMinutes: string;
  editNote: string;
  editLoggedAt: string;
  updating: boolean;
  locale: string;
  onEdit: () => void;
  onEditHoursChange: (v: string) => void;
  onEditMinutesChange: (v: string) => void;
  onEditNoteChange: (v: string) => void;
  onEditLoggedAtChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { log, isOwn, isEditing, updating, locale } = props;
  const who = log.user?.fullName ?? log.user?.email ?? t("project.user");
  const when = formatLocaleDateTime(log.loggedAt, locale);

  return (
    <li className="task-time-log-item">
      <div className="task-comment-meta">
        <strong>{formatDurationMinutes(log.minutes)}</strong>
        <span className="muted small-meta">
          {who} · {when}
        </span>
      </div>
      {isEditing ? (
        <>
          <div className="task-time-log-form-row">
            <label>
              {t("project.hours")}
              <input
                type="number"
                min={0}
                max={24}
                value={props.editHours}
                onChange={(e) => props.onEditHoursChange(e.target.value)}
              />
            </label>
            <label>
              {t("project.minutes")}
              <input
                type="number"
                min={0}
                max={59}
                value={props.editMinutes}
                onChange={(e) => props.onEditMinutesChange(e.target.value)}
              />
            </label>
            <label>
              {t("project.when")}
              <input
                type="datetime-local"
                value={props.editLoggedAt}
                onChange={(e) => props.onEditLoggedAtChange(e.target.value)}
              />
            </label>
          </div>
          <input
            type="text"
            value={props.editNote}
            onChange={(e) => props.onEditNoteChange(e.target.value)}
            placeholder={t("project.noteOptional")}
          />
          <TimeLogActions saving={updating} onSave={props.onSave} onCancel={props.onCancel} />
        </>
      ) : (
        <>
          {log.note ? <p className="task-time-log-note">{log.note}</p> : null}
          {isOwn ? (
            <TimeLogActions saving={false} onSave={props.onEdit} onCancel={props.onDelete} editMode />
          ) : null}
        </>
      )}
    </li>
  );
}

function TimeLogActions(props: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  editMode?: boolean;
}) {
  const { t } = useI18n();

  if (props.editMode) {
    return (
      <div className="task-comment-actions">
        <button type="button" onClick={props.onSave}>
          {t("project.edit")}
        </button>
        <button type="button" className="danger" onClick={props.onCancel}>
          {t("project.delete")}
        </button>
        </div>
    );
  }
  return (
    <div className="task-comment-actions">
      <button type="button" disabled={props.saving} onClick={props.onSave}>
        {t("project.saveChanges")}
      </button>
      <button type="button" className="secondary-button" disabled={props.saving} onClick={props.onCancel}>
        {t("dashboard.cancel")}
      </button>
    </div>
  );
}
