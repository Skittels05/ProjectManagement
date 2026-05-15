import { useEffect, useState } from "react";
import { fetchTaskAttachmentBlob } from "../../../../store/api/taskEngagementApi";

type TaskAttachmentImagePreviewProps = {
  projectId: string;
  taskId: string;
  attachmentId: string;
  alt: string;
};

export function TaskAttachmentImagePreview({
  projectId,
  taskId,
  attachmentId,
  alt,
}: TaskAttachmentImagePreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const blob = await fetchTaskAttachmentBlob(projectId, taskId, attachmentId);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    setSrc(null);
    setFailed(false);
    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, taskId, attachmentId]);

  if (failed) {
    return <p className="muted small-meta">Preview unavailable</p>;
  }

  if (!src) {
    return <p className="muted small-meta task-attachment-preview-loading">Loading preview…</p>;
  }

  return (
    <a
      className="task-attachment-preview-link"
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      title="Open full size"
    >
      <img src={src} alt={alt} className="task-attachment-preview" loading="lazy" />
    </a>
  );
}
