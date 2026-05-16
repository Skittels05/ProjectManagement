import type { ParsedQs } from "qs";
import { Op } from "sequelize";
import { ProjectMember, sequelize, Sprint, Task, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);

async function assertMember(projectId: string, userId: string) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
  return row;
}

async function assertSprintInProject(sprintId: string | null, projectId: string): Promise<void> {
  if (sprintId == null) {
    return;
  }
  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }
}

async function assertAssigneeInProject(assigneeId: string | null, projectId: string): Promise<void> {
  if (assigneeId == null) {
    return;
  }
  const m = await ProjectMember.findOne({ where: { projectId, userId: assigneeId } });
  if (!m) {
    throw new AppError("Assignee is not a member of this project", 400);
  }
}

function toUserMini(u: { id: string; email: string; fullName: string } | null | undefined) {
  if (!u) {
    return null;
  }
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
  };
}

type TaskRow = Record<string, unknown> & {
  assignee?: { id: string; email: string; fullName: string };
  parentTask?: { id: string; title: string };
  subtaskCount?: number;
};

function toTaskDto(task: TaskRow) {
  const createdAt = task.createdAt ?? task.created_at ?? null;
  const updatedAt = task.updatedAt ?? task.updated_at ?? null;
  const parent = task.parentTask as { title?: string } | undefined;
  return {
    id: task.id,
    projectId: task.projectId,
    sprintId: task.sprintId,
    parentTaskId: task.parentTaskId ?? null,
    parentTitle: parent?.title ?? null,
    subtaskCount: typeof task.subtaskCount === "number" ? task.subtaskCount : 0,
    title: task.title,
    description: task.description,
    status: task.status,
    storyPoints: task.storyPoints,
    priority: task.priority,
    boardPosition: task.boardPosition,
    assigneeId: task.assigneeId,
    createdBy: task.createdBy,
    createdAt,
    updatedAt,
    assignee: toUserMini(task.assignee),
  };
}

async function assertValidParentTask(
  parentTaskId: string | null,
  projectId: string,
  currentTaskId?: string,
): Promise<{ sprintId: string | null } | null> {
  if (parentTaskId == null) {
    return null;
  }
  if (!isUuidV4(parentTaskId)) {
    throw new AppError("Invalid parent task id", 400);
  }
  if (currentTaskId && parentTaskId === currentTaskId) {
    throw new AppError("A task cannot be its own parent", 400);
  }

  const parent = await Task.findOne({ where: { id: parentTaskId, projectId } });
  if (!parent) {
    throw new AppError("Parent task not found", 404);
  }
  if (parent.get("parentTaskId")) {
    throw new AppError("Subtasks cannot have nested children (one level only)", 400);
  }
  if (currentTaskId) {
    const isSubtask = await Task.findOne({ where: { id: parentTaskId, parentTaskId: currentTaskId } });
    if (isSubtask) {
      throw new AppError("Cannot set a subtask as the parent", 400);
    }
    const hasChildren = await Task.findOne({ where: { parentTaskId: currentTaskId } });
    if (hasChildren && parentTaskId) {
      throw new AppError("Move or remove subtasks before setting a parent for this task", 400);
    }
  }

  return { sprintId: parent.get("sprintId") as string | null };
}

async function subtaskCountByParent(projectId: string, parentIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (parentIds.length === 0) return map;

  const rows = await Task.findAll({
    attributes: ["parentTaskId"],
    where: { projectId, parentTaskId: parentIds },
  });
  for (const row of rows) {
    const pid = String(row.get("parentTaskId"));
    map.set(pid, (map.get(pid) ?? 0) + 1);
  }
  return map;
}

function normalizeStatus(value: unknown, fallback: string): string {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const s = String(value).trim().toLowerCase();
  if (s === "in progress") {
    return "in_progress";
  }
  if (!TASK_STATUSES.has(s)) {
    throw new AppError("Status must be todo, in_progress, or done", 400);
  }
  return s;
}

function parseStoryPoints(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new AppError("Story points must be an integer from 1 to 99, or empty", 400);
  }
  return n;
}

function parsePriority(value: unknown, fallback: number): number {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1000) {
    throw new AppError("Priority must be an integer from 0 to 1000", 400);
  }
  return n;
}

async function nextBoardPosition(projectId: string, sprintId: string | null): Promise<number> {
  const where: { projectId: string; sprintId: string | null } = { projectId, sprintId };
  const agg = await Task.max("boardPosition", { where });
  const max = typeof agg === "number" && !Number.isNaN(agg) ? agg : -1;
  return max + 1;
}

export async function listTasks(projectId: string, userId: string, query: ParsedQs) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const where: Record<string, unknown> = { projectId };
  const sprintFilter = query?.sprintId;
  if (sprintFilter === "backlog") {
    where.sprintId = null;
  } else if (typeof sprintFilter === "string" && isUuidV4(sprintFilter)) {
    where.sprintId = sprintFilter;
  }

  const rows = await Task.findAll({
    where,
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
      {
        model: Task,
        as: "parentTask",
        attributes: ["id", "title"],
        required: false,
      },
    ],
    order: [
      ["board_position", "ASC"],
      ["priority", "DESC"],
      ["created_at", "DESC"],
    ],
  });

  const parentIds = rows
    .filter((t) => t.get("parentTaskId") == null)
    .map((t) => t.get("id") as string);
  const counts = await subtaskCountByParent(projectId, parentIds);

  return rows.map((t) => {
    const plain = t.get({ plain: true }) as TaskRow;
    const id = String(plain.id);
    return toTaskDto({ ...plain, subtaskCount: counts.get(id) ?? 0 });
  });
}

export async function createTask(userId: string, projectId: string, body: Record<string, unknown>) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const title = String(body.title ?? "").trim();
  if (!title) {
    throw new AppError("Title is required", 400);
  }
  if (title.length > 500) {
    throw new AppError("Title must be at most 500 characters", 400);
  }

  const description =
    body.description != null && String(body.description).trim() !== ""
      ? String(body.description).trim().slice(0, 50000)
      : null;

  const parentTaskIdRaw =
    body.parentTaskId != null && String(body.parentTaskId).trim() !== ""
      ? String(body.parentTaskId).trim()
      : null;
  const parentInfo = await assertValidParentTask(parentTaskIdRaw, projectId);

  let sprintIdRaw =
    body.sprintId != null && String(body.sprintId).trim() !== "" ? String(body.sprintId).trim() : null;
  if (sprintIdRaw == null && parentInfo?.sprintId != null) {
    sprintIdRaw = parentInfo.sprintId;
  }
  const sprintId = sprintIdRaw;
  if (sprintId != null && !isUuidV4(sprintId)) {
    throw new AppError("Invalid sprint id", 400);
  }
  await assertSprintInProject(sprintId, projectId);

  const assigneeIdRaw =
    body.assigneeId != null && String(body.assigneeId).trim() !== ""
      ? String(body.assigneeId).trim()
      : null;
  const assigneeId = assigneeIdRaw;
  if (assigneeId != null && !isUuidV4(assigneeId)) {
    throw new AppError("Invalid assignee id", 400);
  }
  await assertAssigneeInProject(assigneeId, projectId);

  const status = normalizeStatus(body.status, "todo");
  const storyPoints =
    body.storyPoints != null && body.storyPoints !== "" ? parseStoryPoints(body.storyPoints) : null;
  const priority = parsePriority(body.priority, 0);
  const boardPosition = await nextBoardPosition(projectId, sprintId);

  const task = await Task.create({
    projectId,
    sprintId,
    parentTaskId: parentTaskIdRaw,
    title,
    description,
    status,
    storyPoints,
    priority,
    boardPosition,
    assigneeId,
    createdBy: userId,
  });

  const withAssignee = await Task.findByPk(task.get("id") as string, {
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
      {
        model: Task,
        as: "parentTask",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });

  if (!withAssignee) {
    throw new AppError("Task not found", 404);
  }

  return toTaskDto(withAssignee.get({ plain: true }) as Parameters<typeof toTaskDto>[0]);
}

async function getTaskInProject(projectId: string, taskId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(taskId)) {
    return null;
  }
  return Task.findOne({
    where: { id: taskId, projectId },
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
      {
        model: Task,
        as: "parentTask",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
}

export async function updateTask(
  userId: string,
  projectId: string,
  taskId: string,
  body: Record<string, unknown>,
) {
  if (!isUuidV4(projectId) || !isUuidV4(taskId)) {
    throw new AppError("Task not found", 404);
  }
  await assertMember(projectId, userId);

  const task = await getTaskInProject(projectId, taskId);
  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    const title = String(body.title ?? "").trim();
    if (!title) {
      throw new AppError("Title is required", 400);
    }
    if (title.length > 500) {
      throw new AppError("Title must be at most 500 characters", 400);
    }
    patch.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description =
      body.description != null && String(body.description).trim() !== ""
        ? String(body.description).trim().slice(0, 50000)
        : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    patch.status = normalizeStatus(body.status, task.get("status") as string);
  }

  if (Object.prototype.hasOwnProperty.call(body, "storyPoints")) {
    patch.storyPoints =
      body.storyPoints != null && body.storyPoints !== "" ? parseStoryPoints(body.storyPoints) : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    patch.priority = parsePriority(body.priority, task.get("priority") as number);
  }

  if (Object.prototype.hasOwnProperty.call(body, "boardPosition")) {
    const n = Number(body.boardPosition);
    if (!Number.isInteger(n) || n < 0) {
      throw new AppError("boardPosition must be a non-negative integer", 400);
    }
    patch.boardPosition = n;
  }

  if (Object.prototype.hasOwnProperty.call(body, "sprintId")) {
    const sprintId =
      body.sprintId != null && String(body.sprintId).trim() !== "" ? String(body.sprintId).trim() : null;
    if (sprintId != null && !isUuidV4(sprintId)) {
      throw new AppError("Invalid sprint id", 400);
    }
    await assertSprintInProject(sprintId, projectId);
    patch.sprintId = sprintId;
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
    const assigneeId =
      body.assigneeId != null && String(body.assigneeId).trim() !== ""
        ? String(body.assigneeId).trim()
        : null;
    if (assigneeId != null && !isUuidV4(assigneeId)) {
      throw new AppError("Invalid assignee id", 400);
    }
    await assertAssigneeInProject(assigneeId, projectId);
    patch.assigneeId = assigneeId;
  }

  if (Object.prototype.hasOwnProperty.call(body, "parentTaskId")) {
    const parentTaskId =
      body.parentTaskId != null && String(body.parentTaskId).trim() !== ""
        ? String(body.parentTaskId).trim()
        : null;
    const parentInfo = await assertValidParentTask(parentTaskId, projectId, taskId);
    patch.parentTaskId = parentTaskId;
    if (parentInfo && !Object.prototype.hasOwnProperty.call(body, "sprintId")) {
      patch.sprintId = parentInfo.sprintId;
    }
  }

  if (Object.keys(patch).length === 0) {
    const unchanged = await getTaskInProject(projectId, taskId);
    return toTaskDto(unchanged!.get({ plain: true }) as Parameters<typeof toTaskDto>[0]);
  }

  await task.update(patch);
  await task.reload({
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
      {
        model: Task,
        as: "parentTask",
        attributes: ["id", "title"],
        required: false,
      },
    ],
  });
  const plain = task.get({ plain: true }) as TaskRow;
  const subCount = await Task.count({ where: { parentTaskId: taskId } });
  return toTaskDto({ ...plain, subtaskCount: subCount });
}

const BOARD_POSITION_STEP = 10;

export async function reorderKanbanColumn(
  userId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const taskId = String(body.taskId ?? "").trim();
  if (!isUuidV4(taskId)) {
    throw new AppError("Invalid task id", 400);
  }

  const status = normalizeStatus(body.status, "todo");

  if (!Array.isArray(body.orderedTaskIds) || body.orderedTaskIds.length === 0) {
    throw new AppError("orderedTaskIds must be a non-empty array", 400);
  }

  const orderedTaskIds = body.orderedTaskIds.map((id) => String(id).trim());
  if (orderedTaskIds.some((id) => !isUuidV4(id))) {
    throw new AppError("Each orderedTaskId must be a valid UUID", 400);
  }

  const unique = new Set(orderedTaskIds);
  if (unique.size !== orderedTaskIds.length) {
    throw new AppError("orderedTaskIds must not contain duplicates", 400);
  }

  if (!orderedTaskIds.includes(taskId)) {
    throw new AppError("orderedTaskIds must include the moved task", 400);
  }

  const movedTask = await Task.findOne({ where: { id: taskId, projectId } });
  if (!movedTask) {
    throw new AppError("Task not found", 404);
  }

  const rows = await Task.findAll({
    where: {
      projectId,
      id: { [Op.in]: orderedTaskIds },
      parentTaskId: null,
    },
  });

  if (rows.length !== orderedTaskIds.length) {
    throw new AppError("One or more tasks were not found on this board", 400);
  }

  await sequelize.transaction(async (transaction) => {
    for (let index = 0; index < orderedTaskIds.length; index++) {
      const id = orderedTaskIds[index]!;
      const patch: Record<string, unknown> = {
        boardPosition: index * BOARD_POSITION_STEP,
      };
      if (id === taskId) {
        patch.status = status;
      }
      await Task.update(patch, {
        where: { id, projectId },
        transaction,
      });
    }
  });

  const updated = await getTaskInProject(projectId, taskId);
  if (!updated) {
    throw new AppError("Task not found", 404);
  }

  const plain = updated.get({ plain: true }) as TaskRow;
  const subCount = await Task.count({ where: { parentTaskId: taskId } });
  return toTaskDto({ ...plain, subtaskCount: subCount });
}

export async function deleteTask(userId: string, projectId: string, taskId: string): Promise<{ ok: boolean }> {
  if (!isUuidV4(projectId) || !isUuidV4(taskId)) {
    throw new AppError("Task not found", 404);
  }
  await assertMember(projectId, userId);

  const task = await Task.findOne({ where: { id: taskId, projectId } });
  if (!task) {
    throw new AppError("Task not found", 404);
  }

  await task.destroy();
  return { ok: true };
}
