import { useEffect } from "react";
import type { ConfirmOptions } from "./confirmContext";
import { useI18n } from "../../shared/i18n";

type PendingConfirm = ConfirmOptions & {
  id: string;
  resolve: (confirmed: boolean) => void;
};

type ConfirmDialogViewportProps = {
  pending: PendingConfirm | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialogViewport({ pending, onConfirm, onCancel }: ConfirmDialogViewportProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!pending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pending, onCancel]);

  if (!pending) {
    return null;
  }

  const title = pending.title ?? t("confirm.title");
  const confirmLabel = pending.confirmLabel ?? t("confirm.confirm");
  const cancelLabel = pending.cancelLabel ?? t("confirm.cancel");
  const confirmClass =
    pending.variant === "danger" ? "danger-button confirm-dialog-confirm" : "confirm-dialog-confirm";

  return (
    <div
      className="modal-backdrop confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-card confirm-dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" className="modal-title">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog-message muted">
          {pending.message}
        </p>
        <div className="modal-actions confirm-dialog-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
