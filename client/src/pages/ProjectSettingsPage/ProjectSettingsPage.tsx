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
import { isUuidV4, sameUserId } from "../../shared/lib/uuid";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { loadProjectNavPath } from "../../shared/lib/projectNavStorage";
import { useConfirm } from "../../components/ConfirmDialog/confirmContext";
import { useToast } from "../../components/Toast/toastContext";
import { useI18n } from "../../shared/i18n";
import { PageLoader } from "../../components/Preloader/Preloader";
import { ProjectSettingsForm } from "../ProjectPage/components/ProjectSettingsForm/ProjectSettingsForm";
import { ProjectTeamSection } from "../ProjectPage/components/ProjectTeamSection/ProjectTeamSection";
import { loadDashboardNavPath } from "../../shared/lib/dashboardNavStorage";
import "./ProjectSettingsPage.css";

export function ProjectSettingsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useI18n();
  const toast = useToast();
  const { confirm } = useConfirm();

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
    data: project,
    isLoading,
    error: projectError,
  } = useGetProjectQuery(validProjectId ?? "", { skip: !validProjectId });

  const members = project?.members ?? [];
  const ownerCount = useMemo(() => members.filter((m) => isOwnerRoleName(m.role)).length, [members]);

  const roleSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    for (const member of members) {
      const role = member.role.trim();
      if (role && !isOwnerRoleName(member.role)) {
        suggestions.add(role);
      }
    }
    return [...suggestions].sort((a, b) => a.localeCompare(b));
  }, [members]);

  const myMember = useMemo(
    () => members.find((m) => sameUserId(m.userId, user?.id)),
    [members, user?.id],
  );
  const myRole = myMember?.role ?? project?.role ?? null;
  const isProjectCreator = sameUserId(project?.createdBy, user?.id);
  const myRoleLower = String(myRole ?? "").trim().toLowerCase();
  const canManageTeam =
    isProjectCreator || myRoleLower === "owner" || myRoleLower === "manager";
  const isOwnerLike = myRoleLower === "owner" || isProjectCreator;

  const projectPath = validProjectId ? loadProjectNavPath(validProjectId) : loadDashboardNavPath();
  const loadError = projectError ? getRtkQueryErrorMessage(projectError) : null;

  function canEditMemberRole(member: ProjectMemberDto) {
    if (!canManageTeam) return false;
    if (isOwnerLike) return true;
    return !isOwnerRoleName(member.role);
  }

  function canRemoveOther(member: ProjectMemberDto) {
    if (!canManageTeam || sameUserId(member.userId, user?.id)) return false;
    if (!isOwnerLike && isOwnerRoleName(member.role)) return false;
    return true;
  }

  function canLeaveProject(member: ProjectMemberDto) {
    if (!sameUserId(member.userId, user?.id)) return false;
    if (isOwnerRoleName(member.role) && ownerCount <= 1) return false;
    return true;
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validProjectId) return;
    setInviteError(null);
    const roleTrim = inviteRole.trim();
    if (!isAssignableMemberRole(roleTrim)) {
      setInviteError(t("project.inviteRoleError"));
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
      toast.success(t("toast.memberInvited"));
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
      setMemberError(t("project.ownerRoleError"));
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
      toast.success(t("toast.memberRoleUpdated"));
    } catch (err) {
      setMemberError(getRtkQueryErrorMessage(err));
    } finally {
      setRoleSavingFor(null);
    }
  }

  async function handleRemoveMember(member: ProjectMemberDto) {
    if (!validProjectId) return;
    const isSelf = sameUserId(member.userId, user?.id);
    const message = isSelf
      ? t("project.leaveConfirm")
      : t("project.removeMemberConfirm", { name: member.fullName });
    const confirmed = await confirm({
      message,
      variant: "danger",
      confirmLabel: isSelf ? t("project.leave") : t("project.remove"),
    });
    if (!confirmed) return;

    setMemberError(null);
    setRemovingFor(member.userId);
    try {
      const payload = await removeMember({
        projectId: validProjectId,
        userId: member.userId,
      }).unwrap();
      toast.success(t("toast.memberRemoved"));
      if ("left" in payload && payload.left) {
        navigate("/projects", { replace: true });
      }
    } catch (err) {
      setMemberError(getRtkQueryErrorMessage(err));
    } finally {
      setRemovingFor(null);
    }
  }

  if (!validProjectId) {
    return (
      <section className="page project-settings-page">
        <p className="form-error">{t("project.invalidLink")}</p>
        <Link to={loadDashboardNavPath()}>{t("project.backToDashboard")}</Link>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page project-settings-page">
        <PageLoader label={t("project.loading")} />
      </section>
    );
  }

  if (loadError || !project) {
    return (
      <section className="page project-settings-page">
        <p className="form-error">{loadError ?? t("project.notFound")}</p>
        <Link to={loadDashboardNavPath()}>{t("project.backToDashboard")}</Link>
      </section>
    );
  }

  return (
    <section className="page project-settings-page">
      <header className="project-settings-header hero-card">
        <p className="eyebrow">{project.name}</p>
        <h1>{t("project.settingsPageTitle")}</h1>
        <p className="muted">{t("project.settingsPageDesc")}</p>
        <Link to={projectPath} className="back-link">
          {t("project.backToProject")}
        </Link>
      </header>

      {canManageTeam ? (
        <section className="project-settings-card hero-card" aria-labelledby="project-settings-form-title">
          <h2 id="project-settings-form-title">{t("project.settingsTitle")}</h2>
          <p className="muted project-settings-card-desc">{t("project.settingsSubtitle")}</p>
          <ProjectSettingsForm
            project={project}
            onDeleted={() => navigate("/projects", { replace: true })}
          />
        </section>
      ) : (
        <section className="project-settings-card hero-card">
          <p className="muted">{t("project.settingsViewOnly")}</p>
        </section>
      )}

      <section className="project-settings-card hero-card">
        <ProjectTeamSection
          canManageTeam={canManageTeam}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          inviteBusy={inviteBusy}
          inviteError={inviteError}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onInviteSubmit={handleInvite}
          members={members}
          currentUserId={user?.id}
          memberError={memberError}
          roleSavingFor={roleSavingFor}
          removingFor={removingFor}
          roleSuggestions={roleSuggestions}
          canEditMemberRole={canEditMemberRole}
          canRemoveOther={canRemoveOther}
          canLeaveProject={canLeaveProject}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
        />
      </section>
    </section>
  );
}
