import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { AppDispatch, RootState } from "../../store";
import { clearCurrentProject } from "../../store/slices/projectsSlice";
import {
  addProjectMember,
  fetchProjectById,
  removeProjectMember,
  updateProjectMemberRole,
} from "../../store/thunks/projectsThunks";
import type { ProjectMemberDto, ProjectRole } from "../../store/types/projects.types";
import { ProjectInviteForm } from "./components/ProjectInviteForm/ProjectInviteForm";
import { ProjectTeamSection } from "./components/ProjectTeamSection/ProjectTeamSection";
import "./ProjectPage.css";

function roleLabel(role: string) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Member";
}

export function ProjectPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { current, currentLoading, currentError } = useSelector((state: RootState) => state.projects);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "manager">("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [roleSavingFor, setRoleSavingFor] = useState<number | null>(null);
  const [removingFor, setRemovingFor] = useState<number | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const id = projectId ? Number(projectId) : NaN;

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      return;
    }
    void dispatch(fetchProjectById(id));
    return () => {
      dispatch(clearCurrentProject());
    };
  }, [dispatch, id]);

  const members = current?.members ?? [];
  const ownerCount = useMemo(() => members.filter((m) => m.role === "owner").length, [members]);
  const myRole = current?.role ?? null;
  const canManageTeam = myRole === "owner" || myRole === "manager";

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!Number.isInteger(id) || id < 1) return;
    setInviteError(null);
    setInviteBusy(true);
    const result = await dispatch(
      addProjectMember({ projectId: id, email: inviteEmail.trim(), role: inviteRole }),
    );
    setInviteBusy(false);
    if (addProjectMember.fulfilled.match(result)) {
      setInviteEmail("");
      setInviteRole("member");
    } else {
      setInviteError(result.payload ?? "Could not add member");
    }
  }

  async function handleRoleChange(member: ProjectMemberDto, next: ProjectRole) {
    if (!Number.isInteger(id) || id < 1 || next === member.role) return;
    setMemberError(null);
    setRoleSavingFor(member.userId);
    const result = await dispatch(
      updateProjectMemberRole({ projectId: id, userId: member.userId, role: next }),
    );
    setRoleSavingFor(null);
    if (updateProjectMemberRole.rejected.match(result)) {
      setMemberError(result.payload ?? "Could not update role");
    }
  }

  async function handleRemoveMember(member: ProjectMemberDto) {
    if (!Number.isInteger(id) || id < 1) return;
    const isSelf = member.userId === user?.id;
    const message = isSelf
      ? "Leave this project? You will need a new invite to return."
      : `Remove ${member.fullName} from the project?`;
    if (!window.confirm(message)) return;
    setMemberError(null);
    setRemovingFor(member.userId);
    const result = await dispatch(removeProjectMember({ projectId: id, userId: member.userId }));
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
    if (myRole === "owner") return true;
    return member.role !== "owner";
  }

  function canRemoveOther(member: ProjectMemberDto) {
    if (!canManageTeam || member.userId === user?.id) return false;
    if (myRole !== "owner" && member.role === "owner") return false;
    return true;
  }

  function canLeaveProject(member: ProjectMemberDto) {
    if (member.userId !== user?.id) return false;
    if (member.role === "owner" && ownerCount <= 1) return false;
    return true;
  }

  if (!Number.isInteger(id) || id < 1) {
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
          Your role: <strong>{roleLabel(String(myRole ?? ""))}</strong>
        </p>
        {current.description ? <p className="project-description">{current.description}</p> : null}
        <p className="muted small-meta">Updated {new Date(current.updatedAt).toLocaleString()}</p>
        <Link to="/" className="back-link">
          ← All projects
        </Link>
      </div>

      <aside className="project-page-aside">
        <ProjectTeamSection
          members={members}
          currentUserId={user?.id}
          memberError={memberError}
          roleSavingFor={roleSavingFor}
          removingFor={removingFor}
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
            onInviteEmailChange={setInviteEmail}
            onInviteRoleChange={setInviteRole}
            onSubmit={handleInvite}
          />
        ) : null}
      </aside>
    </section>
  );
}
