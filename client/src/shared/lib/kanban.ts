import type { TaskDto, TaskStatus } from "../../store/types/tasks.types";

export const KANBAN_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "in_progress", title: "In progress" },
  { id: "done", title: "Done" },
];

export function columnDroppableId(status: TaskStatus): string {
  return `column:${status}`;
}

export function parseColumnDroppableId(id: string): TaskStatus | null {
  if (!id.startsWith("column:")) return null;
  const status = id.slice(7) as TaskStatus;
  return status === "todo" || status === "in_progress" || status === "done" ? status : null;
}

export function sortTasksByBoard(tasks: TaskDto[]): TaskDto[] {
  return [...tasks].sort((a, b) => {
    if (a.boardPosition !== b.boardPosition) {
      return a.boardPosition - b.boardPosition;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function groupTasksByStatus(tasks: TaskDto[]): Record<TaskStatus, TaskDto[]> {
  const grouped: Record<TaskStatus, TaskDto[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };
  for (const task of sortTasksByBoard(tasks)) {
    const status = task.status;
    if (status in grouped) {
      grouped[status].push(task);
    }
  }
  return grouped;
}

export function boardPositionAtIndex(columnTasks: TaskDto[], index: number): number {
  if (columnTasks.length === 0) return 0;
  if (index <= 0) return columnTasks[0]!.boardPosition - 10;
  if (index >= columnTasks.length) {
    return columnTasks[columnTasks.length - 1]!.boardPosition + 10;
  }
  const prev = columnTasks[index - 1]!.boardPosition;
  const next = columnTasks[index]!.boardPosition;
  return Math.floor((prev + next) / 2);
}
