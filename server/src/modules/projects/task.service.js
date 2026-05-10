const { ProjectMember, Sprint, Task, User } = require("../../models");
const { AppError } = require("../../utils/app-error");
const { isUuidV4 } = require("../../utils/uuid");

const TASK_STATUSES = new Set(["todo", "in_progress", "done"]);

async function assertMember(projectId, userId) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
  return row;
}

async function assertSprintInProject(sprintId, projectId) {
  if (sprintId == null) {
    return;
  }
  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }
}

async function assertAssigneeInProject(assigneeId, projectId) {
  if (assigneeId == null) {
    return;
  }
  const m = await ProjectMember.findOne({ where: { projectId, userId: assigneeId } });
  if (!m) {
    throw new AppError("Assignee is not a member of this project", 400);
  }
}

function toUserMini(u) {
  if (!u) {
    return null;
  }
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
  };
}

function toTaskDto(task) {
  const createdAt = task.createdAt ?? task.created_at ?? null;
  const updatedAt = task.updatedAt ?? task.updated_at ?? null;
  return {
    id: task.id,
    projectId: task.projectId,
    sprintId: task.sprintId,
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

function normalizeStatus(value, fallback) {
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

function parseStoryPoints(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new AppError("Story points must be an integer from 1 to 99, or empty", 400);
  }
  return n;
}

function parsePriority(value, fallback) {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 1000) {
    throw new AppError("Priority must be an integer from 0 to 1000", 400);
  }
  return n;
}

async function nextBoardPosition(projectId, sprintId) {
  const where = { projectId };
  if (sprintId == null) {
    where.sprintId = null;
  } else {
    where.sprintId = sprintId;
  }
  const agg = await Task.max("boardPosition", { where });
  const max = typeof agg === "number" && !Number.isNaN(agg) ? agg : -1;
  return max + 1;
}

async function listTasks(projectId, userId, query) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const where = { projectId };
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
    ],
    order: [
      ["board_position", "ASC"],
      ["priority", "DESC"],
      ["created_at", "DESC"],
    ],
  });

  return rows.map(toTaskDto);
}

async function createTask(userId, projectId, body) {
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

  const sprintId =
    body.sprintId != null && String(body.sprintId).trim() !== "" ? String(body.sprintId).trim() : null;
  if (sprintId != null && !isUuidV4(sprintId)) {
    throw new AppError("Invalid sprint id", 400);
  }
  await assertSprintInProject(sprintId, projectId);

  const assigneeId =
    body.assigneeId != null && String(body.assigneeId).trim() !== ""
      ? String(body.assigneeId).trim()
      : null;
  if (assigneeId != null && !isUuidV4(assigneeId)) {
    throw new AppError("Invalid assignee id", 400);
  }
  await assertAssigneeInProject(assigneeId, projectId);

  const status = normalizeStatus(body.status, "todo");
  const storyPoints = body.storyPoints != null && body.storyPoints !== "" ? parseStoryPoints(body.storyPoints) : null;
  const priority = parsePriority(body.priority, 0);
  const boardPosition = await nextBoardPosition(projectId, sprintId);

  const task = await Task.create({
    projectId,
    sprintId,
    title,
    description,
    status,
    storyPoints,
    priority,
    boardPosition,
    assigneeId,
    createdBy: userId,
  });

  const withAssignee = await Task.findByPk(task.id, {
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
    ],
  });

  return toTaskDto(withAssignee);
}

async function getTaskInProject(projectId, taskId) {
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
    ],
  });
}

async function updateTask(userId, projectId, taskId, body) {
  if (!isUuidV4(projectId) || !isUuidV4(taskId)) {
    throw new AppError("Task not found", 404);
  }
  await assertMember(projectId, userId);

  const task = await getTaskInProject(projectId, taskId);
  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const patch = {};

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
    patch.status = normalizeStatus(body.status, task.status);
  }

  if (Object.prototype.hasOwnProperty.call(body, "storyPoints")) {
    patch.storyPoints =
      body.storyPoints != null && body.storyPoints !== "" ? parseStoryPoints(body.storyPoints) : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "priority")) {
    patch.priority = parsePriority(body.priority, task.priority);
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

  if (Object.keys(patch).length === 0) {
    const unchanged = await getTaskInProject(projectId, taskId);
    return toTaskDto(unchanged);
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
    ],
  });
  return toTaskDto(task);
}

async function deleteTask(userId, projectId, taskId) {
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

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
};
