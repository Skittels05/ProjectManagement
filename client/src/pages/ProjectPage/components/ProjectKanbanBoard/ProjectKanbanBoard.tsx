import { useEffect, useMemo, useState } from "react";
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
import type { ProjectMemberDto } from "../../../../store/types/projects.types";
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
  filterTasks,
  groupFilteredKanbanTasks,
  type TaskListQuery,
} from "../../../../shared/lib/taskListQuery";
import { ProjectPanel } from "../../../../components/ProjectPanel/ProjectPanel";
import { AddTaskButton } from "../AddTaskButton/AddTaskButton";
import "./ProjectKanbanBoard.css";

export type ProjectKanbanBoardProps = {
  projectId: string;
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
  if (bits.length === 0) return null;
  return <p className="muted small-meta kanban-card-meta">{bits.join(" · ")}</p>;
}

type KanbanColumnProps = {
  status: TaskStatus;
  title: string;
  taskIds: string[];
  tasksById: Record<string, TaskDto>;
  onEditTask: (task: TaskDto) => void;
};

function KanbanColumn({ status, title, taskIds, tasksById, onEditTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column${isOver ? " kanban-column--over" : ""}`}
      aria-label={title}
    >
      <header className="kanban-column-header">
        <h3>{title}</h3>
        <span className="kanban-column-count">{taskIds.length}</span>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groupedKanban = useMemo(
    () => groupFilteredKanbanTasks(serverTasks, taskListQuery, members),
    [serverTasks, taskListQuery, members],
  );

  const filteredCount = useMemo(
    () => filterTasks(serverTasks, taskListQuery, members).length,
    [serverTasks, taskListQuery, members],
  );

  const tasksById = useMemo(() => {
    const map: Record<string, TaskDto> = {};
    for (const status of KANBAN_COLUMNS) {
      for (const t of groupedKanban[status.id]) {
        map[t.id] = t;
      }
    }
    return map;
  }, [groupedKanban]);

  const layoutColumnIds = useMemo(() => columnIdsFromGrouped(groupedKanban), [groupedKanban]);

  useEffect(() => {
    if (!activeId) {
      setColumnIds(layoutColumnIds);
    }
  }, [layoutColumnIds, activeId]);

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

    const activeContainer = findContainer(columnIds, String(active.id));
    const overContainer = findContainer(columnIds, String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumnIds((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(String(active.id));
      if (activeIndex < 0) return prev;

      const overIndex = overItems.indexOf(String(over.id));
      activeItems.splice(activeIndex, 1);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, String(active.id));

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || saving) return;

    const activeContainer = findContainer(columnIds, String(active.id));
    const overContainer = findContainer(columnIds, String(over.id));
    if (!activeContainer || !overContainer) return;

    const taskId = String(active.id);
    let nextColumns = columnIds;

    if (activeContainer === overContainer) {
      const items = columnIds[activeContainer];
      const oldIndex = items.indexOf(taskId);
      let newIndex = items.indexOf(String(over.id));
      if (newIndex < 0) {
        newIndex = items.length - 1;
      }
      if (oldIndex < 0 || oldIndex === newIndex) return;
      nextColumns = {
        ...columnIds,
        [activeContainer]: arrayMove(items, oldIndex, newIndex),
      };
      setColumnIds(nextColumns);
    } else {
      nextColumns = columnIds;
    }

    const targetListIds = nextColumns[overContainer];
    const finalIndex = targetListIds.indexOf(taskId);
    if (finalIndex < 0) return;

    const columnTasks = targetListIds
      .filter((id) => id !== taskId)
      .map((id) => {
        const t = tasksById[id];
        return t ? { ...t, status: overContainer } : null;
      })
      .filter((t): t is TaskDto => t != null);

    const boardPosition = boardPositionAtIndex(columnTasks, finalIndex);
    const status = overContainer;

    setSaving(true);
    try {
      await updateTask({
        projectId,
        taskId,
        body: { status, boardPosition },
      }).unwrap();
    } catch (err) {
      setColumnIds(layoutColumnIds);
      window.alert(getRtkQueryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
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
