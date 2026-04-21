import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import type { ProjectMemberDto, ProjectRole } from "../../../../store/types/projects.types";
import "./ProjectTeamSection.css";

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Member";
}

type ProjectTeamSectionProps = {
  members: ProjectMemberDto[];
  currentUserId: string | undefined;
  memberError: string | null;
  roleSavingFor: string | null;
  removingFor: string | null;
  canEditMemberRole: (member: ProjectMemberDto) => boolean;
  canRemoveOther: (member: ProjectMemberDto) => boolean;
  canLeaveProject: (member: ProjectMemberDto) => boolean;
  onRoleChange: (member: ProjectMemberDto, role: ProjectRole) => void;
  onRemoveMember: (member: ProjectMemberDto) => void;
};

export function ProjectTeamSection({
  members,
  currentUserId,
  memberError,
  roleSavingFor,
  removingFor,
  canEditMemberRole,
  canRemoveOther,
  canLeaveProject,
  onRoleChange,
  onRemoveMember,
}: ProjectTeamSectionProps) {
  return (
    <ProjectPanel title="Team">
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
              const isSelf = member.userId === currentUserId;
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
                      <select
                        className="role-select"
                        value={member.role}
                        disabled={busy}
                        aria-label={`Role for ${member.fullName}`}
                        onChange={(ev) => onRoleChange(member, ev.target.value as ProjectRole)}
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                    ) : (
                      <span className="role-readonly">{roleLabel(member.role)}</span>
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
    </ProjectPanel>
  );
}
