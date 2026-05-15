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
  useUpdateTaskMutation,
} from "../../../../store/api/tasksApi";
import type { ProjectDto, ProjectMemberDto } from "../../../../store/types/projects.types";
import type { TaskDto, TaskStatus } from "../../../../store/types/tasks.types";
import { getRtkQueryErrorMessage } from "../../../../shared/lib/rtkQueryError";
import {
  KANBAN_COLUMNS,
  boardPositionAtIndex,
  columnDroppableId,
  parseColumnDroppableId,
} from "../../../../shared/lib/kanban";
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
  for (const { id: status } of KANBAN_COLUMNS) {
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
  for (const { id: status } of KANBAN_COLUMNS) {
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
};

function KanbanCard({ task, onEdit, overlay = false }: KanbanCardProps) {
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
      <KanbanCardMeta task={task} />
      <button
        type="button"
        className="kanban-card-edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Edit
      </button>
    </article>
  );
}

function KanbanCardMeta({ task }: { task: TaskDto }) {
  const bits: string[] = [];
  if (task.storyPoints != null) bits.push(`${task.storyPoints} SP`);
  if (task.assignee) bits.push(task.assignee.fullName);
  if (task.subtaskCount > 0) bits.push(`${task.subtaskCount} subtask${task.subtaskCount === 1 ? "" : "s"}`);
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
};

function KanbanColumn({ status, title, taskIds, tasksById, wipLimit, onEditTask }: KanbanColumnProps) {
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
          <p className="muted kanban-column-empty">Drop tasks here</p>
        ) : (
          <div className="kanban-column-list">
            {taskIds.map((id) => {
              const task = tasksById[id];
              if (!task) return null;
              return <KanbanCard key={id} task={task} onEdit={() => onEditTask(task)} />;
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
  const sprintFilter = iterationScope === "backlog" ? "backlog" : iterationScope;

  const { data: serverTasks = [], isLoading, error } = useGetTasksQuery({
    projectId,
    sprintFilter,
  });

  const [updateTask] = useUpdateTaskMutation();
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

    const lookup = buildTasksById(serverTasks, nextColumns, taskListQuery, members);
    const columnTasks = targetListIds
      .filter((id) => id !== taskId)
      .map((id) => {
        const t = lookup[id];
        return t ? { ...t, status } : null;
      })
      .filter((t): t is TaskDto => t != null);

    const boardPosition = boardPositionAtIndex(columnTasks, finalIndex);
    const statusChanged = serverTask.status !== status;
    const positionChanged = serverTask.boardPosition !== boardPosition;

    if (!statusChanged && !positionChanged) {
      setActiveId(null);
      return;
    }

    const wipLimit = wipLimitForStatus(project, status);
    if (statusChanged && isWipLimitExceeded(targetListIds.length, wipLimit)) {
      columnIdsRef.current = layoutColumnIds;
      setColumnIds(layoutColumnIds);
      const colTitle = KANBAN_COLUMNS.find((c) => c.id === status)?.title ?? status;
      window.alert(`WIP limit reached for "${colTitle}" (${wipLimit} cards max).`);
      setActiveId(null);
      return;
    }

    setSaving(true);
    try {
      await updateTask({
        projectId,
        taskId,
        body: { status, boardPosition },
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

  const panelTitle = `Kanban — ${iterationLabel}`;

  return (
    <div className="project-kanban-section">
      <ProjectPanel title={panelTitle} headerAction={<AddTaskButton onClick={onAddTask} />}>
        <p className="muted tasks-scope-note">
          Drag cards between columns to change status. Press <strong>+</strong> to add a task. Scope:{" "}
          <strong>{iterationLabel}</strong>.
        </p>

        {isLoading ? <p className="muted">Loading board…</p> : null}
        {errMsg ? <p className="form-error">{errMsg}</p> : null}
        {saving ? <p className="muted kanban-saving">Saving…</p> : null}

        {!isLoading && serverTasks.length === 0 ? (
          <p className="muted">No tasks in this view yet. Press + to add one.</p>
        ) : null}
        {!isLoading && serverTasks.length > 0 && filteredCount === 0 ? (
          <p className="muted">No tasks match the current search or filters.</p>
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
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  status={col.id}
                  title={col.title}
                  taskIds={columnIds[col.id]}
                  tasksById={tasksById}
                  wipLimit={wipLimitForStatus(project, col.id)}
                  onEditTask={onEditTask}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <KanbanCard task={activeTask} onEdit={() => onEditTask(activeTask)} overlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}
      </ProjectPanel>
    </div>
  );
}
