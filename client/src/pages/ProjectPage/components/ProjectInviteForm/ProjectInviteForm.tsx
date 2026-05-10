import { type FormEvent } from "react";
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
  const formInner = (
    <>
      {!embedded ? (
        <p className="muted small-meta">
          Pick a role that already exists in this project (except owner) or type a new role (1–32 characters). The
          owner role cannot be assigned here.
        </p>
      ) : (
        <p className="muted small-meta" style={{ marginTop: 0 }}>
          Invite by email. Use an existing role name or a new one (1–32 characters). Owner cannot be assigned here.
        </p>
      )}
      <form className="project-form auth-form invite-form" onSubmit={(e) => void onSubmit(e)}>
        <datalist id="invite-role-suggestions">
          {roleSuggestions.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <label>
          Email
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            placeholder="teammate@company.com"
            autoComplete="email"
            required
          />
        </label>
        <label>
          Role
          <input
            type="text"
            list="invite-role-suggestions"
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value)}
            placeholder="e.g. developer, analyst"
            maxLength={32}
            required
          />
        </label>
        {inviteError ? <p className="form-error">{inviteError}</p> : null}
        <button type="submit" disabled={inviteBusy}>
          {inviteBusy ? "Sending…" : "Add to project"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return formInner;
  }

  return <ProjectPanel title="Invite member">{formInner}</ProjectPanel>;
}
