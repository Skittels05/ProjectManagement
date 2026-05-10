import { useEffect, useState } from "react";
import type { ProjectMemberDto } from "../../../../store/types/projects.types";
import { isAssignableMemberRole } from "../../../../shared/lib/projectRole";
import { sameUserId } from "../../../../shared/lib/uuid";
import "../ProjectTeamSection/ProjectTeamSection.css";

type MemberRoleFieldProps = {
  member: ProjectMemberDto;
  busy: boolean;
  onCommit: (next: string) => void;
};

function MemberRoleField({ member, busy, onCommit }: MemberRoleFieldProps) {
  const [draft, setDraft] = useState(member.role);

  useEffect(() => {
    setDraft(member.role);
  }, [member.role]);

  return (
    <input
      className="role-select"
      list="team-role-suggestions"
      value={draft}
      disabled={busy}
      maxLength={32}
      aria-label={`Role for ${member.fullName}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (!next || next === member.role.trim()) {
          setDraft(member.role);
          return;
        }
        if (!isAssignableMemberRole(next)) {
          setDraft(member.role);
          return;
        }
        onCommit(next);
      }}
    />
  );
}

export type MembersTableProps = {
  members: ProjectMemberDto[];
  currentUserId: string | undefined;
  memberError: string | null;
  roleSavingFor: string | null;
  removingFor: string | null;
  roleSuggestions: string[];
  canEditMemberRole: (member: ProjectMemberDto) => boolean;
  canRemoveOther: (member: ProjectMemberDto) => boolean;
  canLeaveProject: (member: ProjectMemberDto) => boolean;
  onRoleChange: (member: ProjectMemberDto, role: string) => void;
  onRemoveMember: (member: ProjectMemberDto) => void;
};

export function MembersTable({
  members,
  currentUserId,
  memberError,
  roleSavingFor,
  removingFor,
  roleSuggestions,
  canEditMemberRole,
  canRemoveOther,
  canLeaveProject,
  onRoleChange,
  onRemoveMember,
}: MembersTableProps) {
  return (
    <>
      <datalist id="team-role-suggestions">
        {roleSuggestions.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <p className="muted small-meta">
        {members.length} member{members.length === 1 ? "" : "s"}
      </p>
      {memberError ? <p className="form-error">{memberError}</p> : null}

      <div className="members-table-wrap">
        <table className="members-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col" className="members-actions-col">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = sameUserId(member.userId, currentUserId);
              const busy = roleSavingFor === member.userId || removingFor === member.userId;
              return (
                <tr key={member.userId}>
                  <td>
                    <div className="member-name-cell">
                      <span className="member-name">{member.fullName}</span>
                      <span className="member-email muted">{member.email}</span>
                      {isSelf ? <span className="member-you muted">You</span> : null}
                    </div>
                  </td>
                  <td>
                    {canEditMemberRole(member) ? (
                      <MemberRoleField
                        member={member}
                        busy={busy}
                        onCommit={(next) => onRoleChange(member, next)}
                      />
                    ) : (
                      <span className="role-readonly">{member.role}</span>
                    )}
                  </td>
                  <td className="members-actions-cell">
                    {canRemoveOther(member) ? (
                      <button
                        type="button"
                        className="link-danger"
                        disabled={busy}
                        onClick={() => onRemoveMember(member)}
                      >
                        Remove
                      </button>
                    ) : null}
                    {canLeaveProject(member) ? (
                      <button
                        type="button"
                        className="link-danger"
                        disabled={busy}
                        onClick={() => onRemoveMember(member)}
                      >
                        Leave
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
