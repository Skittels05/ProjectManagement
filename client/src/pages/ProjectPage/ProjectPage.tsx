import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { RootState } from "../../store";
import { useGetProjectQuery } from "../../store/api/projectsApi";
import { useDeleteSprintMutation, useGetSprintsQuery } from "../../store/api/sprintsApi";
import { useGetTasksQuery } from "../../store/api/tasksApi";
import type { SprintDto } from "../../store/types/sprints.types";
import type { TaskDto } from "../../store/types/tasks.types";
import { isUuidV4, sameUserId } from "../../shared/lib/uuid";
import { getRtkQueryErrorMessage } from "../../shared/lib/rtkQueryError";
import { formatLocaleDateTime } from "../../shared/lib/formatDate";
import { useConfirm } from "../../components/ConfirmDialog/confirmContext";
import { useToast } from "../../components/Toast/toastContext";
import { memberCountLabel, useI18n } from "../../shared/i18n";
import { useAppSelector } from "../../store/hooks";
import { ProjectSectionNav } from "./components/ProjectSectionNav/ProjectSectionNav";
import { ProjectSidebar, type IterationScope } from "./components/ProjectSidebar/ProjectSidebar";
import { SprintModal } from "./components/SprintModal/SprintModal";
import { TaskModal } from "./components/TaskModal/TaskModal";
import { PageLoader } from "../../components/Preloader/Preloader";
import { SettingsIcon } from "../../components/icons/SettingsIcon";
import { AddTaskButton } from "./components/AddTaskButton/AddTaskButton";
import { ProjectKanbanBoard } from "./components/ProjectKanbanBoard/ProjectKanbanBoard";
import { ProjectTasksSection } from "./components/ProjectTasksSection/ProjectTasksSection";
import { ProjectTasksToolbar } from "./components/ProjectTasksToolbar/ProjectTasksToolbar";
import { projectSettingsPath } from "../../shared/lib/projectSectionNav";
import {
  DEFAULT_TASK_LIST_QUERY,
  TASK_LIST_PAGE_SIZE,
  type TaskListQuery,
} from "../../shared/lib/taskListQuery";
import { buildTasksQueryParams } from "../../shared/lib/tasksQueryParams";
import {
  buildProjectPageSearchParams,
  parseProjectPageState,
  projectPageSearchParamsEqual,
} from "../../shared/lib/projectPageSearchParams";
import { loadDashboardNavPath } from "../../shared/lib/dashboardNavStorage";
import { saveProjectNavPath } from "../../shared/lib/projectNavStorage";
import "../../components/PreferencesMenu/PreferencesMenu.css";
import "./ProjectPage.css";

export type TasksViewMode = "list" | "kanban";

export function ProjectPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useI18n();
  const toast = useToast();
  const { confirm } = useConfirm();
  const locale = useAppSelector((s) => s.settings.locale);

  const [deleteSprint] = useDeleteSprintMutation();

  const [workspaceDrawerOpen, setWorkspaceDrawerOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintModalMode, setSprintModalMode] = useState<"create" | "edit">("create");
  const [editingSprint, setEditingSprint] = useState<SprintDto | null>(null);
  const [deletingSprintId, setDeletingSprintId] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [defaultParentTaskId, setDefaultParentTaskId] = useState<string | null>(null);
  const routeProjectId = projectId ?? "";
  const validProjectId = isUuidV4(routeProjectId) ? routeProjectId : null;

  const {
    data: current,
    isLoading: currentLoading,
    error: currentQueryError,
  } = useGetProjectQuery(validProjectId ?? "", { skip: !validProjectId });

  const {
    data: sprints = [],
    isSuccess: sprintsLoaded,
    isError: sprintsFailed,
  } = useGetSprintsQuery(validProjectId ?? "", { skip: !validProjectId });

  const sprintsResolved = sprintsLoaded || sprintsFailed;
  const sprintIds = useMemo(() => sprints.map((s) => s.id), [sprints]);
  const { iterationScope, tasksView, taskListQuery, taskListPage } = useMemo(
    () => parseProjectPageState(searchParams, sprintIds, sprintsResolved),
    [searchParams, sprintIds, sprintsResolved],
  );

  const syncProjectUrl = useCallback(
    (
      patch: Partial<{
        iterationScope: IterationScope;
        tasksView: TasksViewMode;
        taskListQuery: TaskListQuery;
        taskListPage: number;
      }>,
    ) => {
      const nextScope = patch.iterationScope ?? iterationScope;
      const nextView = patch.tasksView ?? tasksView;
      const nextQuery = patch.taskListQuery ?? taskListQuery;
      const nextPage = patch.taskListPage ?? taskListPage;
      const built = buildProjectPageSearchParams(nextScope, nextView, nextQuery, nextPage);
      if (projectPageSearchParamsEqual(built, searchParams)) return;
      setSearchParams(built, { replace: true });
    },
    [iterationScope, tasksView, taskListQuery, taskListPage, searchParams, setSearchParams],
  );

  const sprintFilter = iterationScope === "backlog" ? "backlog" : iterationScope;

  const tasksQueryArg = useMemo(() => {
    if (!validProjectId) return null;
    return buildTasksQueryParams(
      validProjectId,
      sprintFilter,
      taskListQuery,
      tasksView,
      taskListPage,
    );
  }, [validProjectId, sprintFilter, taskListQuery, tasksView, taskListPage]);

  const { data: tasksPage } = useGetTasksQuery(tasksQueryArg!, { skip: !tasksQueryArg });
  const scopeTasks = tasksPage?.tasks ?? [];
  const tasksTotal = tasksPage?.total ?? 0;

  const patchTaskListQuery = useCallback(
    (patch: Partial<TaskListQuery>) => {
      syncProjectUrl({ taskListQuery: { ...taskListQuery, ...patch }, taskListPage: 1 });
    },
    [syncProjectUrl, taskListQuery],
  );

  const resetTaskListQuery = useCallback(() => {
    syncProjectUrl({ taskListQuery: DEFAULT_TASK_LIST_QUERY, taskListPage: 1 });
  }, [syncProjectUrl]);

  const setTaskListPage = useCallback(
    (page: number) => {
      syncProjectUrl({ taskListPage: Math.max(1, page) });
    },
    [syncProjectUrl],
  );

  const currentError = currentQueryError ? getRtkQueryErrorMessage(currentQueryError) : null;

  const members = current?.members ?? [];

  const visibleTaskCount = scopeTasks.length;
  const taskPageCount = Math.max(1, Math.ceil(tasksTotal / TASK_LIST_PAGE_SIZE));
  const sectionActive = tasksView === "kanban" ? "board" : "tasks";
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

  useEffect(() => {
    if (!sprintsResolved) return;
    const rawScope = searchParams.get("scope");
    if (!rawScope || rawScope === "backlog") return;
    if (sprintIds.includes(rawScope)) return;
    const built = buildProjectPageSearchParams("backlog", tasksView, taskListQuery, taskListPage);
    if (!projectPageSearchParamsEqual(built, searchParams)) {
      setSearchParams(built, { replace: true });
    }
  }, [sprintIds, sprintsResolved, searchParams, setSearchParams, taskListQuery, taskListPage, tasksView]);

  useEffect(() => {
    if (!validProjectId) return;
    const pendingScope = searchParams.get("scope");
    if (pendingScope && pendingScope !== "backlog" && !sprintsResolved) return;
    saveProjectNavPath(validProjectId, searchParams);
  }, [validProjectId, searchParams, sprintsResolved]);

  const selectIterationScope = useCallback(
    (next: IterationScope) => {
      syncProjectUrl({ iterationScope: next, taskListPage: 1 });
      setWorkspaceDrawerOpen(false);
    },
    [syncProjectUrl],
  );

  const iterationLabel = useMemo(() => {
    if (iterationScope === "backlog") {
      return t("project.backlog");
    }
    const sp = sprints.find((s) => s.id === iterationScope);
    return sp?.name ?? t("project.sprint");
  }, [iterationScope, sprints, t]);

  function openTaskCreate(parentId: string | null = null) {
    const safeParentId = typeof parentId === "string" ? parentId : null;
    setTaskModalMode("create");
    setEditingTask(null);
    setDefaultParentTaskId(safeParentId);
    setTaskModalOpen(true);
  }

  function openTaskEdit(task: TaskDto) {
    setTaskModalMode("edit");
    setEditingTask(task);
    setDefaultParentTaskId(null);
    setTaskModalOpen(true);
  }

  function closeTaskModal() {
    setTaskModalOpen(false);
    setEditingTask(null);
    setDefaultParentTaskId(null);
  }

  async function handleDeleteSprint(sprint: SprintDto) {
    if (!validProjectId) return;
    const confirmed = await confirm({
      message: t("project.deleteSprintConfirm", { name: sprint.name }),
      variant: "danger",
      confirmLabel: t("project.delete"),
    });
    if (!confirmed) {
      return;
    }
    setDeletingSprintId(sprint.id);
    try {
      await deleteSprint({ projectId: validProjectId, sprintId: sprint.id }).unwrap();
      if (iterationScope === sprint.id) {
        syncProjectUrl({ iterationScope: "backlog" });
      }
      toast.success(t("toast.sprintDeleted"));
    } catch (err) {
      toast.error(getRtkQueryErrorMessage(err));
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

  if (!validProjectId) {
    return (
      <section className="page project-page">
        <p className="form-error">{t("project.invalidLink")}</p>
        <Link to={loadDashboardNavPath()}>{t("project.backToDashboard")}</Link>
      </section>
    );
  }

  if (currentLoading) {
    return (
      <section className="page project-page">
        <PageLoader label={t("project.loading")} />
      </section>
    );
  }

  if (currentError || !current) {
    return (
      <section className="page project-page">
        <p className="form-error">{currentError ?? t("project.notFound")}</p>
        <Link to={loadDashboardNavPath()}>{t("project.backToDashboard")}</Link>
      </section>
    );
  }

  const defaultTaskSprintId = iterationScope === "backlog" ? null : iterationScope;
  const settingsPath = projectSettingsPath(validProjectId);

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
        <ProjectSectionNav
          projectId={validProjectId}
          active={sectionActive}
          iterationScope={iterationScope}
          taskListQuery={taskListQuery}
          taskListPage={taskListPage}
        />
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
              <p className="project-toolbar-scope-chip" aria-live="polite">
                {t("project.tasksScope")} <strong>{iterationLabel}</strong>
              </p>
              <div className="project-page-toolbar-actions">
                <button
                  type="button"
                  className="secondary-button project-workspace-toggle"
                  onClick={() => setWorkspaceDrawerOpen(true)}
                  aria-expanded={workspaceDrawerOpen}
                  aria-controls="project-workspace-panel"
                >
                  {t("project.workspace")}
                </button>
                <Link
                  to={settingsPath}
                  className="topbar-icon-btn"
                  aria-label={t("project.settingsAndTeam")}
                  title={t("project.settingsAndTeam")}
                >
                  <SettingsIcon />
                </Link>
                <AddTaskButton onClick={() => openTaskCreate()} />
              </div>
              <p className="muted project-page-toolbar-meta">
                {memberCountLabel(t, members.length)} · {t("project.yourRole")}{" "}
                <strong>{myRole ?? t("project.dash")}</strong>
              </p>
            </div>
          </header>

          <div className="project-main">
            <header className="project-main-header">
              <p className="eyebrow">{t("project.eyebrow")}</p>
              <h2>{current.name}</h2>
              {current.description ? <p className="project-description">{current.description}</p> : null}
              <p className="muted small-meta">
                {t("project.updated", {
                  date: formatLocaleDateTime(current.updatedAt, locale),
                })}
              </p>
              <Link to={loadDashboardNavPath()} className="back-link">
                {t("project.allProjects")}
              </Link>
            </header>

            {tasksView === "list" ? (
              <ProjectTasksToolbar
                query={taskListQuery}
                members={members}
                onChange={patchTaskListQuery}
                onReset={resetTaskListQuery}
                resultCount={visibleTaskCount}
                totalCount={tasksTotal}
                page={taskListPage}
                pageCount={taskPageCount}
                onPageChange={setTaskListPage}
              />
            ) : null}

            {tasksView === "kanban" && tasksQueryArg ? (
              <ProjectKanbanBoard
                projectId={validProjectId}
                project={current}
                tasksQueryArg={tasksQueryArg}
                iterationLabel={iterationLabel}
                onEditTask={openTaskEdit}
                onAddTask={() => openTaskCreate()}
              />
            ) : tasksQueryArg ? (
              <ProjectTasksSection
                projectId={validProjectId}
                tasksQueryArg={tasksQueryArg}
                iterationLabel={iterationLabel}
                onEditTask={openTaskEdit}
                onAddTask={() => openTaskCreate()}
              />
            ) : null}
          </div>
        </div>
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        mode={taskModalMode}
        projectId={validProjectId}
        members={members}
        sprints={sprints}
        task={editingTask}
        allTasks={scopeTasks}
        defaultSprintId={defaultTaskSprintId}
        defaultParentTaskId={defaultParentTaskId}
        onEditSubtask={openTaskEdit}
        onClose={closeTaskModal}
      />

      <SprintModal
        isOpen={sprintModalOpen}
        mode={sprintModalMode}
        projectId={validProjectId}
        sprint={editingSprint}
        onClose={closeSprintModal}
      />

    </section>
  );
}
