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
import { TaskAttachmentImagePreview } from "./TaskAttachmentImagePreview";

type TaskAttachmentsPanelProps = {
  projectId: string;
  taskId: string;
};

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
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
};

function AttachmentRow({
  attachment,
  projectId,
  taskId,
  downloading,
  onDownload,
  onDelete,
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
            {formatBytes(attachment.sizeBytes)}
            {attachment.uploader ? ` · ${attachment.uploader.fullName}` : ""}
          </span>
        </div>
        <div className="task-attachment-actions">
          <button type="button" disabled={downloading} onClick={onDownload}>
            {downloading ? "…" : "Download"}
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function TaskAttachmentsPanel({ projectId, taskId }: TaskAttachmentsPanelProps) {
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
    if (!window.confirm(`Remove "${filename}"?`)) return;
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
      <h3 id="task-attachments-heading">Attachments</h3>
      <p className="muted small-meta">Images are shown inline. Max file size 10 MB.</p>

      {isLoading ? <p className="muted">Loading attachments…</p> : null}
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
          />
        ))}
      </ul>

      {!isLoading && attachments.length === 0 ? <p className="muted">No files attached yet.</p> : null}

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
        {uploading ? "Uploading…" : "Upload file"}
      </button>
    </section>
  );
}
