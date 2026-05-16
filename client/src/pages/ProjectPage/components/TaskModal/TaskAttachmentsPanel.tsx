import { useRef, useState } from "react";
import {
  downloadTaskAttachment,
  useDeleteTaskAttachmentMutation,
  useGetTaskAttachmentsQuery,
  useUploadTaskAttachmentMutation,
} from "../../../../store/api/taskEngagementApi";
import type { TaskAttachmentDto } from "../../../../store/types/taskEngagement.types";
import { isImageAttachment } from "../../../../shared/lib/attachments";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import { useI18n } from "../../../../shared/i18n";
import { TaskAttachmentImagePreview } from "./TaskAttachmentImagePreview";

type TaskAttachmentsPanelProps = {
  projectId: string;
  taskId: string;
};

function formatBytes(bytes: number | null, dash: string): string {
  if (bytes == null || bytes <= 0) return dash;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type AttachmentRowProps = {
  attachment: TaskAttachmentDto;
  projectId: string;
  taskId: string;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
  downloadLabel: string;
  removeLabel: string;
  dash: string;
};

function AttachmentRow({
  attachment,
  projectId,
  taskId,
  downloading,
  onDownload,
  onDelete,
  downloadLabel,
  removeLabel,
  dash,
}: AttachmentRowProps) {
  const isImage = isImageAttachment(attachment.mimeType, attachment.originalFilename);

  return (
    <li className={`task-attachment-item${isImage ? " task-attachment-item--image" : ""}`}>
      {isImage ? (
        <TaskAttachmentImagePreview
          projectId={projectId}
          taskId={taskId}
          attachmentId={attachment.id}
          alt={attachment.originalFilename}
        />
      ) : null}
      <div className="task-attachment-row">
        <div className="task-attachment-info">
          <span className="task-attachment-name">{attachment.originalFilename}</span>
          <span className="muted small-meta">
            {formatBytes(attachment.sizeBytes, dash)}
            {attachment.uploader ? ` · ${attachment.uploader.fullName}` : ""}
          </span>
        </div>
        <div className="task-attachment-actions">
          <button type="button" disabled={downloading} onClick={onDownload}>
            {downloading ? dash : downloadLabel}
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            {removeLabel}
          </button>
        </div>
      </div>
    </li>
  );
}

export function TaskAttachmentsPanel({ projectId, taskId }: TaskAttachmentsPanelProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [], isLoading, error } = useGetTaskAttachmentsQuery({ projectId, taskId });
  const [upload, { isLoading: uploading }] = useUploadTaskAttachmentMutation();
  const [deleteAttachment] = useDeleteTaskAttachmentMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setActionError(null);
    try {
      await upload({ projectId, taskId, file }).unwrap();
    } catch (err) {
      setActionError(getRtkQueryErrorMessage(err));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDownload(attachmentId: string, filename: string) {
    setDownloadingId(attachmentId);
    setActionError(null);
    try {
      await downloadTaskAttachment(projectId, taskId, attachmentId, filename);
    } catch (err) {
      setActionError(getRtkQueryErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(attachmentId: string, filename: string) {
    if (!window.confirm(t("project.removeAttachmentConfirm", { name: filename }))) return;
    setActionError(null);
    try {
      await deleteAttachment({ projectId, taskId, attachmentId }).unwrap();
    } catch (err) {
      setActionError(getRtkQueryErrorMessage(err));
    }
  }

  const listError = error ? getRtkQueryErrorMessage(error) : null;

  return (
    <section className="task-engagement-panel" aria-labelledby="task-attachments-heading">
      <h3 id="task-attachments-heading">{t("project.attachments")}</h3>
      <p className="muted small-meta">{t("project.attachmentsHint")}</p>

      {isLoading ? <p className="muted">{t("project.loadingAttachments")}</p> : null}
      {listError ? <p className="form-error">{listError}</p> : null}
      {actionError ? <p className="form-error">{actionError}</p> : null}

      <ul className="task-attachment-list">
        {attachments.map((a) => (
          <AttachmentRow
            key={a.id}
            attachment={a}
            projectId={projectId}
            taskId={taskId}
            downloading={downloadingId === a.id}
            onDownload={() => void handleDownload(a.id, a.originalFilename)}
            onDelete={() => void handleDelete(a.id, a.originalFilename)}
            downloadLabel={t("project.download")}
            removeLabel={t("project.remove")}
            dash={t("project.dash")}
          />
        ))}
      </ul>

      {!isLoading && attachments.length === 0 ? <p className="muted">{t("project.noAttachments")}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        className="task-attachment-input"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        disabled={uploading}
        onChange={(e) => void handleFileChange(e.target.files?.[0])}
      />
      <button
        type="button"
        className="secondary-button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? t("project.uploading") : t("project.uploadFile")}
      </button>
    </section>
  );
}
