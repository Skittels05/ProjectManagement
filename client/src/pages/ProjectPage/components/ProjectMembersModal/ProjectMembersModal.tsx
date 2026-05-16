import type { FormEvent } from "react";
import { useI18n } from "../../../../shared/i18n";
import { MembersTable, type MembersTableProps } from "../MembersTable/MembersTable";
import { ProjectInviteForm } from "../ProjectInviteForm/ProjectInviteForm";
import "./ProjectMembersModal.css";

type ProjectMembersModalProps = MembersTableProps & {
  isOpen: boolean;
  onClose: () => void;
  canManageTeam: boolean;
  inviteEmail: string;
  inviteRole: string;
  inviteBusy: boolean;
  inviteError: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInviteSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ProjectMembersModal({
  isOpen,
  onClose,
  canManageTeam,
  inviteEmail,
  inviteRole,
  inviteBusy,
  inviteError,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSubmit,
  ...tableProps
}: ProjectMembersModalProps) {
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop project-members-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card project-members-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-members-modal-title"
      >
        <div className="modal-header">
          <h2 id="project-members-modal-title" className="modal-title">
            {t("project.teamModalTitle")}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("dashboard.close")}>
            ×
          </button>
        </div>
        <p className="modal-subtitle muted">{t("project.teamModalSubtitle")}</p>

        {canManageTeam ? (
          <div className="project-members-modal-invite">
            <p className="eyebrow project-members-invite-label">{t("project.invite")}</p>
            <ProjectInviteForm
              embedded
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              inviteBusy={inviteBusy}
              inviteError={inviteError}
              roleSuggestions={tableProps.roleSuggestions}
              onInviteEmailChange={onInviteEmailChange}
              onInviteRoleChange={onInviteRoleChange}
              onSubmit={onInviteSubmit}
            />
          </div>
        ) : null}

        <div className="project-members-modal-body">
          <MembersTable {...tableProps} />
        </div>
      </div>
    </div>
  );
}
