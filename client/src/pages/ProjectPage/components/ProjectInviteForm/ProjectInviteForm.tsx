import { type FormEvent } from "react";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";

type ProjectInviteFormProps = {
  inviteEmail: string;
  inviteRole: "member" | "manager";
  inviteBusy: boolean;
  inviteError: string | null;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: "member" | "manager") => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ProjectInviteForm({
  inviteEmail,
  inviteRole,
  inviteBusy,
  inviteError,
  onInviteEmailChange,
  onInviteRoleChange,
  onSubmit,
}: ProjectInviteFormProps) {
  return (
    <ProjectPanel title="Invite member">
      <p className="muted small-meta">User must already be registered. They join with the role you pick.</p>
      <form className="project-form auth-form invite-form" onSubmit={(e) => void onSubmit(e)}>
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
          <select
            value={inviteRole}
            onChange={(e) => onInviteRoleChange(e.target.value as "member" | "manager")}
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </select>
        </label>
        {inviteError ? <p className="form-error">{inviteError}</p> : null}
        <button type="submit" disabled={inviteBusy}>
          {inviteBusy ? "Sending…" : "Add to project"}
        </button>
      </form>
    </ProjectPanel>
  );
}
