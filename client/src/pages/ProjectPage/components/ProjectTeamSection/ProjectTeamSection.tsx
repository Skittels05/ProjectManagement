import type { FormEvent } from "react";
import { MembersTable, type MembersTableProps } from "../MembersTable/MembersTable";
import { ProjectInviteForm } from "../ProjectInviteForm/ProjectInviteForm";
import { useI18n } from "../../../../shared/i18n";
import "../ProjectMembersModal/ProjectMembersModal.css";
import "./ProjectTeamSection.css";

type ProjectTeamSectionProps = MembersTableProps & {
  canManageTeam: boolean;
  inviteEmail: string;
  inviteRole: string;
  inviteBusy: boolean;
  inviteError: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInviteSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ProjectTeamSection({
  canManageTeam,
  inviteEmail,
  inviteRole,
  inviteBusy,
  inviteError,
  onInviteEmailChange,
  onInviteRoleChange,
  onInviteSubmit,
  ...tableProps
}: ProjectTeamSectionProps) {
  const { t } = useI18n();

  return (
    <section id="team" className="project-team-section" aria-labelledby="project-team-title">
      <h2 id="project-team-title" className="project-team-section-title">
        {t("project.teamModalTitle")}
      </h2>
      <p className="muted project-team-section-desc">{t("project.teamModalSubtitle")}</p>

      {canManageTeam ? (
        <div className="project-members-modal-invite project-team-section-invite">
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

      <MembersTable {...tableProps} />
    </section>
  );
}
