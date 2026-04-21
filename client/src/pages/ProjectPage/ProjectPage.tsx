import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AppDispatch, RootState } from "../../store";
import { clearCurrentProject } from "../../store/slices/projectsSlice";
import {
  addProjectMember,
  fetchProjectById,
  fetchSprints,
  removeProjectMember,
  updateProjectMemberRole,
} from "../../store/thunks/projectsThunks";
import type { ProjectMemberDto } from "../../store/types/projects.types";
import { isAssignableMemberRole, isOwnerRoleName } from "../../shared/lib/projectRole";
import { isUuidV4 } from "../../shared/lib/uuid";
import { ProjectInviteForm } from "./components/ProjectInviteForm/ProjectInviteForm";
import { ProjectSprintsSection } from "./components/ProjectSprintsSection/ProjectSprintsSection";
import { ProjectTeamSection } from "./components/ProjectTeamSection/ProjectTeamSection";
import "./ProjectPage.css";

export function ProjectPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { current, currentLoading, currentError } = useSelector((state: RootState) => state.projects);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [roleSavingFor, setRoleSavingFor] = useState<string | null>(null);
  const [removingFor, setRemovingFor] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const routeProjectId = projectId ?? "";
  const validProjectId = isUuidV4(routeProjectId) ? routeProjectId : null;

  useEffect(() => {
    if (!validProjectId) {
      return;
    }
    void dispatch(fetchProjectById(validProjectId));
    void dispatch(fetchSprints(validProjectId));
    return () => {
      dispatch(clearCurrentProject());
    };
  }, [dispatch, validProjectId]);

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
    const result = await dispatch(
      addProjectMember({ projectId: validProjectId, email: inviteEmail.trim(), role: roleTrim }),
    );
    setInviteBusy(false);
    if (addProjectMember.fulfilled.match(result)) {
      setInviteEmail("");
      setInviteRole("member");
    } else {
      setInviteError(result.payload ?? "Could not add member");
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
    const result = await dispatch(
      updateProjectMemberRole({ projectId: validProjectId, userId: member.userId, role: nextTrim }),
    );
    setRoleSavingFor(null);
    if (updateProjectMemberRole.rejected.match(result)) {
      setMemberError(result.payload ?? "Could not update role");
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
    const result = await dispatch(
      removeProjectMember({ projectId: validProjectId, userId: member.userId }),
    );
    setRemovingFor(null);
    if (removeProjectMember.rejected.match(result)) {
      setMemberError(result.payload ?? "Could not remove member");
      return;
    }
    if (removeProjectMember.fulfilled.match(result) && "left" in result.payload && result.payload.left) {
      navigate("/", { replace: true });
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
