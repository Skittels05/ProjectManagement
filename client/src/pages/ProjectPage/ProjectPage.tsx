import { type FormEvent, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../../store";
import {
  useAddProjectMemberMutation,
  useGetProjectQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
} from "../../store/api/projectsApi";
import type { ProjectMemberDto } from "../../store/types/projects.types";
import { isAssignableMemberRole, isOwnerRoleName } from "../../shared/lib/projectRole";
import { isUuidV4 } from "../../shared/lib/uuid";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { ProjectInviteForm } from "./components/ProjectInviteForm/ProjectInviteForm";
import { ProjectSprintsSection } from "./components/ProjectSprintsSection/ProjectSprintsSection";
import { ProjectTeamSection } from "./components/ProjectTeamSection/ProjectTeamSection";
import "./ProjectPage.css";

export function ProjectPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [addMember] = useAddProjectMemberMutation();
  const [updateMemberRole] = useUpdateProjectMemberRoleMutation();
  const [removeMember] = useRemoveProjectMemberMutation();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [roleSavingFor, setRoleSavingFor] = useState<string | null>(null);
  const [removingFor, setRemovingFor] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const routeProjectId = projectId ?? "";
  const validProjectId = isUuidV4(routeProjectId) ? routeProjectId : null;

  const {
    data: current,
    isLoading: currentLoading,
    error: currentQueryError,
  } = useGetProjectQuery(validProjectId ?? "", { skip: !validProjectId });

  const currentError = currentQueryError ? getRtkQueryErrorMessage(currentQueryError) : null;

  const members = current?.members ?? [];
  const ownerCount = useMemo(() => members.filter((m) => isOwnerRoleName(m.role)).length, [members]);
  const roleSuggestions = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) {
      const r = m.role.trim();
      if (r && !isOwnerRoleName(m.role)) {
        s.add(m.role.trim());
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [members]);
  const myRole = current?.role ?? null;
  const myRoleLower = String(myRole ?? "").trim().toLowerCase();
  const canManageTeam = myRoleLower === "owner" || myRoleLower === "manager";

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validProjectId) return;
    setInviteError(null);
    const roleTrim = inviteRole.trim();
    if (!isAssignableMemberRole(roleTrim)) {
      setInviteError(
        "Choose an existing role or enter a new one (1–32 characters). The owner role cannot be assigned.",
      );
      return;
    }
    setInviteBusy(true);
    try {
      await addMember({
        projectId: validProjectId,
        email: inviteEmail.trim(),
        role: roleTrim,
      }).unwrap();
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      setInviteError(getRtkQueryErrorMessage(err));
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleRoleChange(member: ProjectMemberDto, next: string) {
    const nextTrim = next.trim();
    if (!validProjectId || nextTrim === member.role.trim()) return;
    if (!isAssignableMemberRole(nextTrim)) {
      setMemberError("The owner role cannot be assigned. Use 1–32 characters for other roles.");
      return;
    }
    setMemberError(null);
    setRoleSavingFor(member.userId);
    try {
      await updateMemberRole({
        projectId: validProjectId,
        userId: member.userId,
        role: nextTrim,
      }).unwrap();
    } catch (err) {
      setMemberError(getRtkQueryErrorMessage(err));
    } finally {
      setRoleSavingFor(null);
    }
  }

  async function handleRemoveMember(member: ProjectMemberDto) {
    if (!validProjectId) return;
    const isSelf = member.userId === user?.id;
    const message = isSelf
      ? "Leave this project? You will need a new invite to return."
      : `Remove ${member.fullName} from the project?`;
    if (!window.confirm(message)) return;
    setMemberError(null);
    setRemovingFor(member.userId);
    try {
      const payload = await removeMember({
        projectId: validProjectId,
        userId: member.userId,
      }).unwrap();
      if ("left" in payload && payload.left) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setMemberError(getRtkQueryErrorMessage(err));
    } finally {
      setRemovingFor(null);
    }
  }

  function canEditMemberRole(member: ProjectMemberDto) {
    if (!canManageTeam) return false;
    if (myRoleLower === "owner") return true;
    return !isOwnerRoleName(member.role);
  }

  function canRemoveOther(member: ProjectMemberDto) {
    if (!canManageTeam || member.userId === user?.id) return false;
    if (myRoleLower !== "owner" && isOwnerRoleName(member.role)) return false;
    return true;
  }

  function canLeaveProject(member: ProjectMemberDto) {
    if (member.userId !== user?.id) return false;
    if (isOwnerRoleName(member.role) && ownerCount <= 1) return false;
    return true;
  }

  if (!validProjectId) {
    return (
      <section className="page project-page">
        <p className="form-error">Invalid project link.</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    );
  }

  if (currentLoading) {
    return (
      <section className="page project-page">
        <p className="muted">Loading project…</p>
      </section>
    );
  }

  if (currentError || !current) {
    return (
      <section className="page project-page">
        <p className="form-error">{currentError ?? "Project not found."}</p>
        <Link to="/">Back to dashboard</Link>
      </section>
    );
  }

  return (
    <section className="page project-page project-page-layout">
      <div className="project-page-main">
        <p className="eyebrow">Project</p>
        <h2>{current.name}</h2>
        <p className="muted">
          Your role: <strong>{myRole ?? "—"}</strong>
        </p>
        {current.description ? <p className="project-description">{current.description}</p> : null}
        <p className="muted small-meta">Updated {new Date(current.updatedAt).toLocaleString()}</p>
        <Link to="/" className="back-link">
          ← All projects
        </Link>

        <ProjectSprintsSection projectId={validProjectId} canManageSprints={canManageTeam} />
      </div>

      <aside className="project-page-aside">
        <ProjectTeamSection
          members={members}
          currentUserId={user?.id}
          memberError={memberError}
          roleSavingFor={roleSavingFor}
          removingFor={removingFor}
          roleSuggestions={roleSuggestions}
          canEditMemberRole={canEditMemberRole}
          canRemoveOther={canRemoveOther}
          canLeaveProject={canLeaveProject}
          onRoleChange={(m, r) => void handleRoleChange(m, r)}
          onRemoveMember={(m) => void handleRemoveMember(m)}
        />

        {canManageTeam ? (
          <ProjectInviteForm
            inviteEmail={inviteEmail}
            inviteRole={inviteRole}
            inviteBusy={inviteBusy}
            inviteError={inviteError}
            roleSuggestions={roleSuggestions}
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={setInviteRole}
            onSubmit={handleInvite}
          />
        ) : null}
      </aside>
    </section>
  );
}
