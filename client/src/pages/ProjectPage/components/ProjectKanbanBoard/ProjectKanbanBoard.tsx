import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useGetTasksQuery,
  useReorderKanbanColumnMutation,
} from "../../../../store/api/tasksApi";
import type { ProjectDto, ProjectMemberDto } from "../../../../store/types/projects.types";
import type { TaskDto, TaskStatus } from "../../../../store/types/tasks.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import {
  KANBAN_COLUMN_IDS,
  columnDroppableId,
  parseColumnDroppableId,
} from "../../../../shared/lib/kanban";
import { kanbanColumnTitle, subtaskCountLabel, useI18n } from "../../../../shared/i18n";
import {
  columnIdsFromGrouped,
  filterTasksForKanbanBoard,
  groupFilteredKanbanTasks,
  type TaskListQuery,
} from "../../../../shared/lib/taskListQuery";
import {
  formatWipCount,
  isWipLimitExceeded,
  wipLimitForStatus,
} from "../../../../shared/lib/wipLimits";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { AddTaskButton } from "../AddTaskButton/AddTaskButton";
import "./ProjectKanbanBoard.css";

export type ProjectKanbanBoardProps = {
  projectId: string;
  project: Pick<
    ProjectDto,
    "wipLimitTodo" | "wipLimitInProgress" | "wipLimitDone"
  >;
  iterationScope: "backlog" | string;
  iterationLabel: string;
  members: ProjectMemberDto[];
  taskListQuery: TaskListQuery;
  onEditTask: (task: TaskDto) => void;
  onAddTask: () => void;
};

type ColumnIds = Record<TaskStatus, string[]>;

function emptyColumns(): ColumnIds {
  return { todo: [], in_progress: [], done: [] };
}

function findContainer(columns: ColumnIds, id: string): TaskStatus | null {
  const col = parseColumnDroppableId(id);
  if (col) return col;
  for (const status of KANBAN_COLUMN_IDS) {
    if (columns[status].includes(id)) return status;
  }
  return null;
}

function moveTaskBetweenColumns(
  columns: ColumnIds,
  taskId: string,
  from: TaskStatus,
  to: TaskStatus,
  insertBeforeId?: string,
): ColumnIds {
  if (from === to) return columns;

  const fromItems = columns[from].filter((id) => id !== taskId);
  const toItems = columns[to].filter((id) => id !== taskId);
  let insertAt = toItems.length;
  if (insertBeforeId) {
    const idx = toItems.indexOf(insertBeforeId);
    if (idx >= 0) insertAt = idx;
  }
  toItems.splice(insertAt, 0, taskId);

  return { ...columns, [from]: fromItems, [to]: toItems };
}

function resolveColumnsAfterDrop(
  columns: ColumnIds,
  taskId: string,
  overId: string,
): { columns: ColumnIds; targetStatus: TaskStatus } | null {
  let activeContainer = findContainer(columns, taskId);
  if (!activeContainer) return null;

  const droppedOnColumn = parseColumnDroppableId(overId);
  let overContainer = findContainer(columns, overId) ?? droppedOnColumn;
  if (!overContainer) return null;

  let next = columns;

  if (droppedOnColumn) {
    if (activeContainer !== droppedOnColumn) {
      next = moveTaskBetweenColumns(columns, taskId, activeContainer, droppedOnColumn);
    }
    overContainer = droppedOnColumn;
  } else if (activeContainer === overContainer) {
    const items = columns[activeContainer];
    const oldIndex = items.indexOf(taskId);
    let newIndex = items.indexOf(overId);
    if (newIndex < 0) newIndex = items.length - 1;
    if (oldIndex >= 0 && oldIndex !== newIndex) {
      next = { ...columns, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
    }
  } else {
    next = moveTaskBetweenColumns(columns, taskId, activeContainer, overContainer, overId);
  }

  const targetStatus = findContainer(next, taskId);
  if (!targetStatus) return null;

  return { columns: next, targetStatus };
}

function buildTasksById(
  serverTasks: TaskDto[],
  columnIds: ColumnIds,
  taskListQuery: TaskListQuery,
  members: ProjectMemberDto[],
): Record<string, TaskDto> {
  const map: Record<string, TaskDto> = {};
  for (const t of filterTasksForKanbanBoard(serverTasks, taskListQuery, members)) {
    map[t.id] = t;
  }
  for (const status of KANBAN_COLUMN_IDS) {
    for (const id of columnIds[status]) {
      if (map[id]) {
        map[id] = { ...map[id], status };
      }
    }
  }
  return map;
}

type KanbanCardProps = {
  task: TaskDto;
  onEdit: () => void;
  overlay?: boolean;
  editLabel: string;
  subtaskLabel: (count: number) => string;
};

function KanbanCard({ task, onEdit, overlay = false, editLabel, subtaskLabel }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });

  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      };

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={`kanban-card${overlay ? " kanban-card--overlay" : ""}`}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      <p className="kanban-card-title">{task.title}</p>
      <KanbanCardMeta task={task} subtaskLabel={subtaskLabel} />
      <button
        type="button"
        className="kanban-card-edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {editLabel}
      </button>
    </article>
  );
}

function KanbanCardMeta({
  task,
  subtaskLabel,
}: {
  task: TaskDto;
  subtaskLabel: (count: number) => string;
}) {
  const bits: string[] = [];
  if (task.storyPoints != null) bits.push(`${task.storyPoints} SP`);
  if (task.assignee) bits.push(task.assignee.fullName);
  if (task.subtaskCount > 0) bits.push(subtaskLabel(task.subtaskCount));
  if (bits.length === 0) return null;
  return <p className="muted small-meta kanban-card-meta">{bits.join(" · ")}</p>;
}

type KanbanColumnProps = {
  status: TaskStatus;
  title: string;
  taskIds: string[];
  tasksById: Record<string, TaskDto>;
  wipLimit: number | null;
  onEditTask: (task: TaskDto) => void;
  dropHere: string;
  editLabel: string;
  subtaskLabel: (count: number) => string;
};

function KanbanColumn({
  status,
  title,
  taskIds,
  tasksById,
  wipLimit,
  onEditTask,
  dropHere,
  editLabel,
  subtaskLabel,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  const atLimit = isWipLimitExceeded(taskIds.length, wipLimit);

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column${isOver ? " kanban-column--over" : ""}${atLimit ? " kanban-column--at-limit" : ""}`}
      aria-label={title}
    >
      <header className="kanban-column-header">
        <h3>{title}</h3>
        <span className={`kanban-column-count${atLimit ? " kanban-column-count--limit" : ""}`}>
          {formatWipCount(taskIds.length, wipLimit)}
        </span>
      </header>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {taskIds.length === 0 ? (
          <p className="muted kanban-column-empty">{dropHere}</p>
        ) : (
          <div className="kanban-column-list">
            {taskIds.map((id) => {
              const task = tasksById[id];
              if (!task) return null;
              return (
                <KanbanCard
                  key={id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  editLabel={editLabel}
                  subtaskLabel={subtaskLabel}
                />
              );
            })}
          </div>
        )}
      </SortableContext>
    </section>
  );
}

export function ProjectKanbanBoard({
  projectId,
  project,
  iterationScope,
  iterationLabel,
  members,
  taskListQuery,
  onEditTask,
  onAddTask,
}: ProjectKanbanBoardProps) {
  const { t } = useI18n();
  const kanbanColumns = useMemo(
    () =>
      KANBAN_COLUMN_IDS.map((id) => ({
        id,
        title: kanbanColumnTitle(t, id),
      })),
    [t],
  );
  const subtaskLabelFn = (count: number) => subtaskCountLabel(t, count);

  const sprintFilter = iterationScope === "backlog" ? "backlog" : iterationScope;

  const { data: serverTasks = [], isLoading, error } = useGetTasksQuery({
    projectId,
    sprintFilter,
  });

  const [reorderKanbanColumn] = useReorderKanbanColumnMutation();
  const [columnIds, setColumnIds] = useState<ColumnIds>(emptyColumns);
  const columnIdsRef = useRef(columnIds);
  columnIdsRef.current = columnIds;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groupedKanban = useMemo(
    () => groupFilteredKanbanTasks(serverTasks, taskListQuery, members),
    [serverTasks, taskListQuery, members],
  );

  const filteredCount = useMemo(
    () => filterTasksForKanbanBoard(serverTasks, taskListQuery, members).length,
    [serverTasks, taskListQuery, members],
  );

  const tasksById = useMemo(
    () => buildTasksById(serverTasks, columnIds, taskListQuery, members),
    [serverTasks, taskListQuery, members, columnIds],
  );

  const layoutColumnIds = useMemo(() => columnIdsFromGrouped(groupedKanban), [groupedKanban]);

  useEffect(() => {
    if (activeId || saving) return;
    columnIdsRef.current = layoutColumnIds;
    setColumnIds(layoutColumnIds);
  }, [layoutColumnIds, activeId, saving]);

  const activeTask = activeId ? (tasksById[activeId] ?? null) : null;
  const errMsg = error ? getRtkQueryErrorMessage(error) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    setColumnIds((prev) => {
      const taskId = String(active.id);
      const overId = String(over.id);
      const activeContainer = findContainer(prev, taskId);
      const overContainer = findContainer(prev, overId);
      if (!activeContainer || !overContainer || activeContainer === overContainer) return prev;

      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(taskId);
      if (activeIndex < 0) return prev;

      const overIndex = overItems.indexOf(overId);
      activeItems.splice(activeIndex, 1);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, taskId);

      const next = {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
      columnIdsRef.current = next;
      return next;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || saving) {
      setActiveId(null);
      return;
    }

    const taskId = String(active.id);
    const overId = String(over.id);
    const serverTask = serverTasks.find((t) => t.id === taskId);
    if (!serverTask) {
      setActiveId(null);
      return;
    }

    const resolved = resolveColumnsAfterDrop(columnIdsRef.current, taskId, overId);
    if (!resolved) {
      setActiveId(null);
      return;
    }

    const { columns: nextColumns, targetStatus: status } = resolved;
    columnIdsRef.current = nextColumns;
    setColumnIds(nextColumns);

    const targetListIds = nextColumns[status];
    const finalIndex = targetListIds.indexOf(taskId);
    if (finalIndex < 0) {
      setActiveId(null);
      return;
    }

    const statusChanged = serverTask.status !== status;
    const layoutIds = layoutColumnIds[status];
    const orderUnchanged =
      layoutIds.length === targetListIds.length &&
      layoutIds.every((id, i) => id === targetListIds[i]);

    if (!statusChanged && orderUnchanged) {
      setActiveId(null);
      return;
    }

    const wipLimit = wipLimitForStatus(project, status);
    if (statusChanged && isWipLimitExceeded(targetListIds.length, wipLimit)) {
      columnIdsRef.current = layoutColumnIds;
      setColumnIds(layoutColumnIds);
      const colTitle = kanbanColumnTitle(t, status);
      window.alert(t("project.wipLimit", { column: colTitle, limit: wipLimit ?? 0 }));
      setActiveId(null);
      return;
    }

    setSaving(true);
    try {
      await reorderKanbanColumn({
        projectId,
        taskId,
        status,
        orderedTaskIds: targetListIds,
      }).unwrap();
    } catch (err) {
      columnIdsRef.current = layoutColumnIds;
      setColumnIds(layoutColumnIds);
      window.alert(getRtkQueryErrorMessage(err));
    } finally {
      setSaving(false);
      setActiveId(null);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    columnIdsRef.current = layoutColumnIds;
    setColumnIds(layoutColumnIds);
  }

  const panelTitle = t("project.kanbanTitle", { scope: iterationLabel });

  return (
    <div className="project-kanban-section">
      <ProjectPanel title={panelTitle} headerAction={<AddTaskButton onClick={onAddTask} />}>
        <p className="muted tasks-scope-note">
          {t("project.kanbanNote")} <strong>{iterationLabel}</strong>.
        </p>

        {isLoading ? <p className="muted">{t("project.loadingBoard")}</p> : null}
        {errMsg ? <p className="form-error">{errMsg}</p> : null}
        {saving ? <p className="muted kanban-saving">{t("project.saving")}</p> : null}

        {!isLoading && serverTasks.length === 0 ? (
          <p className="muted">{t("project.noTasksYet")}</p>
        ) : null}
        {!isLoading && serverTasks.length > 0 && filteredCount === 0 ? (
          <p className="muted">{t("project.noTasksMatch")}</p>
        ) : null}

        {filteredCount > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(e) => void handleDragEnd(e)}
            onDragCancel={handleDragCancel}
          >
            <div className="kanban-board">
              {kanbanColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  status={col.id}
                  title={col.title}
                  taskIds={columnIds[col.id]}
                  tasksById={tasksById}
                  wipLimit={wipLimitForStatus(project, col.id)}
                  onEditTask={onEditTask}
                  dropHere={t("project.dropHere")}
                  editLabel={t("project.edit")}
                  subtaskLabel={subtaskLabelFn}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <KanbanCard
                  task={activeTask}
                  onEdit={() => onEditTask(activeTask)}
                  overlay
                  editLabel={t("project.edit")}
                  subtaskLabel={subtaskLabelFn}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}
      </ProjectPanel>
    </div>
  );
}
