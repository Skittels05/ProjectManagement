import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RootState } from "../../store";
import {
  useAddProjectMemberMutation,
  useGetProjectQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
} from "../../store/api/projectsApi";
import { useDeleteSprintMutation, useGetSprintsQuery } from "../../store/api/sprintsApi";
import type { ProjectMemberDto } from "../../store/types/projects.types";
import type { SprintDto } from "../../store/types/sprints.types";
import type { TaskDto } from "../../store/types/tasks.types";
import { isAssignableMemberRole, isOwnerRoleName } from "../../shared/lib/projectRole";
import { isUuidV4, sameUserId } from "../../shared/lib/uuid";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { ProjectMembersModal } from "./components/ProjectMembersModal/ProjectMembersModal";
import { ProjectSidebar, type IterationScope } from "./components/ProjectSidebar/ProjectSidebar";
import { SprintModal } from "./components/SprintModal/SprintModal";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { AddTaskButton } from "./components/AddTaskButton/AddTaskButton";
import { ProjectKanbanBoard } from "./components/ProjectKanbanBoard/ProjectKanbanBoard";
import { ProjectTasksSection } from "./components/ProjectTasksSection/ProjectTasksSection";
import { EditProjectModal } from "./components/EditProjectModal/EditProjectModal";
import "./ProjectPage.css";

export type TasksViewMode = "list" | "kanban";

export function ProjectPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [addMember] = useAddProjectMemberMutation();
  const [updateMemberRole] = useUpdateProjectMemberRoleMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [deleteSprint] = useDeleteSprintMutation();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [roleSavingFor, setRoleSavingFor] = useState<string | null>(null);
  const [removingFor, setRemovingFor] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const [iterationScope, setIterationScope] = useState<IterationScope>("backlog");
  const [workspaceDrawerOpen, setWorkspaceDrawerOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintModalMode, setSprintModalMode] = useState<"create" | "edit">("create");
  const [editingSprint, setEditingSprint] = useState<SprintDto | null>(null);
  const [deletingSprintId, setDeletingSprintId] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [tasksView, setTasksView] = useState<TasksViewMode>("list");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const routeProjectId = projectId ?? "";
  const validProjectId = isUuidV4(routeProjectId) ? routeProjectId : null;

  const {
    data: current,
    isLoading: currentLoading,
    error: currentQueryError,
  } = useGetProjectQuery(validProjectId ?? "", { skip: !validProjectId });

  const { data: sprints = [] } = useGetSprintsQuery(validProjectId ?? "", { skip: !validProjectId });

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
  const myMember = useMemo(
    () => members.find((m) => sameUserId(m.userId, user?.id)),
    [members, user?.id],
  );
  const myRole = myMember?.role ?? current?.role ?? null;
  const isProjectCreator = sameUserId(current?.createdBy, user?.id);
  const myRoleLower = String(myRole ?? "").trim().toLowerCase();
  const canManageTeam =
    isProjectCreator || myRoleLower === "owner" || myRoleLower === "manager";

  useEffect(() => {
    if (!workspaceDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [workspaceDrawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWorkspaceDrawerOpen(false);
    };
    if (!workspaceDrawerOpen) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workspaceDrawerOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => {
      if (mq.matches) setWorkspaceDrawerOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const selectIterationScope = useCallback((next: IterationScope) => {
    setIterationScope(next);
    setWorkspaceDrawerOpen(false);
  }, []);

  const iterationLabel = useMemo(() => {
    if (iterationScope === "backlog") {
      return "Backlog";
    }
    const sp = sprints.find((s) => s.id === iterationScope);
    return sp?.name ?? "Sprint";
  }, [iterationScope, sprints]);

  function openTaskCreate() {
    setTaskModalMode("create");
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openTaskEdit(task: TaskDto) {
    setTaskModalMode("edit");
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  function closeTaskModal() {
    setTaskModalOpen(false);
    setEditingTask(null);
  }

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
    const isSelf = sameUserId(member.userId, user?.id);
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

  async function handleDeleteSprint(sprint: SprintDto) {
    if (!validProjectId) return;
    if (
      !window.confirm(
        `Delete sprint “${sprint.name}”? Tasks will move back to the backlog (unassigned).`,
      )
    ) {
      return;
    }
    setDeletingSprintId(sprint.id);
    try {
      await deleteSprint({ projectId: validProjectId, sprintId: sprint.id }).unwrap();
      if (iterationScope === sprint.id) {
        setIterationScope("backlog");
      }
    } catch (err) {
      window.alert(getRtkQueryErrorMessage(err));
    } finally {
      setDeletingSprintId(null);
    }
  }

  function openNewSprintModal() {
    setSprintModalMode("create");
    setEditingSprint(null);
    setSprintModalOpen(true);
  }

  function openEditSprintModal(sprint: SprintDto) {
    setSprintModalMode("edit");
    setEditingSprint(sprint);
    setSprintModalOpen(true);
  }

  function closeSprintModal() {
    setSprintModalOpen(false);
    setEditingSprint(null);
  }

  const isOwnerLike = myRoleLower === "owner" || isProjectCreator;

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

  const membersModalProps = {
    members,
    currentUserId: user?.id,
    memberError,
    roleSavingFor,
    removingFor,
    roleSuggestions,
    canEditMemberRole,
    canRemoveOther,
    canLeaveProject,
    onRoleChange: handleRoleChange,
    onRemoveMember: handleRemoveMember,
  };

  const defaultTaskSprintId = iterationScope === "backlog" ? null : iterationScope;

  return (
    <section
      className={`page project-page project-page--workspace${workspaceDrawerOpen ? " project-page--workspace-drawer-open" : ""}`}
    >
      {workspaceDrawerOpen ? (
        <div
          className="project-workspace-drawer-backdrop"
          role="presentation"
          aria-hidden
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setWorkspaceDrawerOpen(false);
          }}
        />
      ) : null}

      <div className="project-page-workspace-shell">
        <ProjectSidebar
          sprints={sprints}
          selectedScope={iterationScope}
          onSelectScope={selectIterationScope}
          canManageSprints={canManageTeam}
          onNewSprint={openNewSprintModal}
          onEditSprint={openEditSprintModal}
          onDeleteSprint={(s) => void handleDeleteSprint(s)}
          deletingSprintId={deletingSprintId}
          onDrawerClose={() => setWorkspaceDrawerOpen(false)}
        />

        <div className="project-page-work-area">
          <header className="project-page-toolbar">
            <div className="project-page-toolbar-inner">
              <div className="project-page-toolbar-actions">
                <button
                  type="button"
                  className="secondary-button project-workspace-toggle"
                  onClick={() => setWorkspaceDrawerOpen(true)}
                  aria-expanded={workspaceDrawerOpen}
                  aria-controls="project-workspace-panel"
                >
                  Workspace
                </button>
                <button type="button" className="secondary-button" onClick={() => setMembersModalOpen(true)}>
                  Team & participants
                </button>
                {canManageTeam ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSettingsModalOpen(true)}
                  >
                    Project settings
                  </button>
                ) : null}
                <AddTaskButton onClick={openTaskCreate} />
                <button
                  type="button"
                  className={`secondary-button project-toolbar-kanban${tasksView === "kanban" ? " project-toolbar-view-active" : ""}`}
                  onClick={() => setTasksView((v) => (v === "kanban" ? "list" : "kanban"))}
                  aria-pressed={tasksView === "kanban"}
                >
                  {tasksView === "kanban" ? "List view" : "Kanban"}
                </button>
              </div>
              <p className="muted project-page-toolbar-meta">
                {members.length} member{members.length === 1 ? "" : "s"} · your role:{" "}
                <strong>{myRole ?? "—"}</strong>
              </p>
            </div>
          </header>

          <div className="project-main">
            <header className="project-main-header">
              <p className="eyebrow">Project</p>
              <div className="project-main-header-row">
                <h2>{current.name}</h2>
                {canManageTeam ? (
                  <button
                    type="button"
                    className="secondary-button project-settings-inline"
                    onClick={() => setSettingsModalOpen(true)}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {current.description ? <p className="project-description">{current.description}</p> : null}
              <p className="muted small-meta">Updated {new Date(current.updatedAt).toLocaleString()}</p>
              <Link to="/" className="back-link">
                ← All projects
              </Link>
            </header>

            {tasksView === "kanban" ? (
              <ProjectKanbanBoard
                projectId={validProjectId}
                iterationScope={iterationScope}
                iterationLabel={iterationLabel}
                onEditTask={openTaskEdit}
                onAddTask={openTaskCreate}
              />
            ) : (
              <ProjectTasksSection
                projectId={validProjectId}
                iterationScope={iterationScope}
                iterationLabel={iterationLabel}
                onEditTask={openTaskEdit}
                onAddTask={openTaskCreate}
              />
            )}
          </div>
        </div>
      </div>

      <ProjectMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        canManageTeam={canManageTeam}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteBusy={inviteBusy}
        inviteError={inviteError}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onInviteSubmit={handleInvite}
        {...membersModalProps}
      />

      <TaskModal
        isOpen={taskModalOpen}
        mode={taskModalMode}
        projectId={validProjectId}
        members={members}
        sprints={sprints}
        task={editingTask}
        defaultSprintId={defaultTaskSprintId}
        onClose={closeTaskModal}
      />

      <SprintModal
        isOpen={sprintModalOpen}
        mode={sprintModalMode}
        projectId={validProjectId}
        sprint={editingSprint}
        onClose={closeSprintModal}
      />

      <EditProjectModal
        isOpen={settingsModalOpen}
        project={current}
        onClose={() => setSettingsModalOpen(false)}
        onDeleted={() => navigate("/")}
      />
    </section>
  );
}
