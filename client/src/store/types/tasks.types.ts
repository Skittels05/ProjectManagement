export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskAssigneeDto = {
  id: string;
  email: string;
  fullName: string;
};

export type TaskDto = {
  id: string;
  projectId: string;
  sprintId: string | null;
  parentTaskId: string | null;
  parentTitle: string | null;
  subtaskCount: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  storyPoints: number | null;
  priority: number;
  boardPosition: number;
  assigneeId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: TaskAssigneeDto | null;
};

export type CreateTaskBody = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  storyPoints?: number | null;
  priority?: number;
  sprintId?: string | null;
  assigneeId?: string | null;
  parentTaskId?: string | null;
};

export type UpdateTaskBody = Partial<{
  title: string;
  description: string | null;
  status: TaskStatus;
  storyPoints: number | null;
  priority: number;
  boardPosition: number;
  sprintId: string | null;
  assigneeId: string | null;
  parentTaskId: string | null;
}>;
