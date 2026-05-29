import { type FormEvent } from "react";
import { RoleCombobox } from "../../../../components/RoleCombobox/RoleCombobox";
import { useI18n } from "../../../../shared/i18n";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";

type ProjectInviteFormProps = {
  inviteEmail: string;
  inviteRole: string;
  inviteBusy: boolean;
  inviteError: string | null;
  roleSuggestions: string[];
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  embedded?: boolean;
};

export function ProjectInviteForm({
  inviteEmail,
  inviteRole,
  inviteBusy,
  inviteError,
  roleSuggestions,
  onInviteEmailChange,
  onInviteRoleChange,
  onSubmit,
  embedded = false,
}: ProjectInviteFormProps) {
  const { t } = useI18n();

  const formInner = (
    <>
      <p className="muted small-meta" style={embedded ? { marginTop: 0 } : undefined}>
        {t("project.inviteHint")}
      </p>
      <form className="project-form auth-form invite-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          {t("project.inviteEmail")}
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder={t("project.inviteEmailPlaceholder")}
            autoComplete="email"
            required
          />
        </label>
        <label>
          {t("project.inviteRole")}
          <RoleCombobox
            value={inviteRole}
            suggestions={roleSuggestions}
            onChange={onInviteRoleChange}
            placeholder={t("project.inviteRolePlaceholder")}
            ariaLabel={t("project.inviteRole")}
            required
          />
        </label>
        {inviteError ? <p className="form-error">{inviteError}</p> : null}
        <button type="submit" disabled={inviteBusy}>
          {inviteBusy ? t("project.sending") : t("project.addToProject")}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return formInner;
  }

  return <ProjectPanel title={t("project.invite")}>{formInner}</ProjectPanel>;
}
