import { TimeLog, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";
import { recordActivity } from "./activity.service";
import { assertTaskInProject } from "./task-access";

function toUserMini(u: { id: string; email: string; fullName: string } | null | undefined) {
  if (!u) return null;
  return { id: u.id, email: u.email, fullName: u.fullName };
}

function toTimeLogDto(row: {
  id: string;
  taskId: string;
  userId: string;
  minutes: number;
  note: string | null;
  loggedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  user?: { id: string; email: string; fullName: string };
}) {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    minutes: row.minutes,
    note: row.note,
    loggedAt: row.loggedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: toUserMini(row.user),
  };
}

const userInclude = {
  model: User,
  as: "user",
  attributes: ["id", "email", "fullName"],
};

function parseMinutes(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 24 * 60) {
    throw new AppError("Minutes must be an integer from 1 to 1440", 400);
  }
  return n;
}

function parseLoggedAt(value: unknown): Date {
  if (value == null || String(value).trim() === "") {
    return new Date();
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new AppError("Invalid logged date", 400);
  }
  return d;
}

function parseNote(value: unknown): string | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }
  const text = String(value).trim();
  if (text.length > 2000) {
    throw new AppError("Note is too long", 400);
  }
  return text;
}

export async function listTimeLogs(projectId: string, taskId: string, userId: string) {
  await assertTaskInProject(projectId, taskId, userId);

  const rows = await TimeLog.findAll({
    where: { taskId },
    include: [userInclude],
    order: [["logged_at", "DESC"]],
  });

  const logs = rows.map((r) =>
    toTimeLogDto(r.get({ plain: true }) as Parameters<typeof toTimeLogDto>[0]),
  );
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);

  return { logs, totalMinutes };
}

export async function createTimeLog(
  projectId: string,
  taskId: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const minutes = parseMinutes(body.minutes);
  const note = parseNote(body.note);
  const loggedAt = parseLoggedAt(body.loggedAt);

  const row = await TimeLog.create({
    taskId,
    userId,
    minutes,
    note,
    loggedAt,
  });

  await row.reload({ include: [userInclude] });
  const dto = toTimeLogDto(row.get({ plain: true }) as Parameters<typeof toTimeLogDto>[0]);
  await recordActivity({
    projectId,
    userId,
    action: "time_log.created",
    entityType: "time_log",
    entityId: dto.id,
    metadata: { taskId, taskTitle, minutes: dto.minutes },
  });
  return dto;
}

export async function updateTimeLog(
  projectId: string,
  taskId: string,
  timeLogId: string,
  userId: string,
  body: Record<string, unknown>,
) {
  if (!isUuidV4(timeLogId)) {
    throw new AppError("Time log not found", 404);
  }
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const row = await TimeLog.findOne({ where: { id: timeLogId, taskId } });
  if (!row) {
    throw new AppError("Time log not found", 404);
  }
  if (String(row.get("userId")) !== userId) {
    throw new AppError("You can only edit your own time logs", 403);
  }

  const patch: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(body, "minutes")) {
    patch.minutes = parseMinutes(body.minutes);
  }
  if (Object.prototype.hasOwnProperty.call(body, "note")) {
    patch.note = parseNote(body.note);
  }
  if (Object.prototype.hasOwnProperty.call(body, "loggedAt")) {
    patch.loggedAt = parseLoggedAt(body.loggedAt);
  }

  if (Object.keys(patch).length === 0) {
    await row.reload({ include: [userInclude] });
    return toTimeLogDto(row.get({ plain: true }) as Parameters<typeof toTimeLogDto>[0]);
  }

  await row.update(patch);
  await row.reload({ include: [userInclude] });
  const dto = toTimeLogDto(row.get({ plain: true }) as Parameters<typeof toTimeLogDto>[0]);
  await recordActivity({
    projectId,
    userId,
    action: "time_log.updated",
    entityType: "time_log",
    entityId: dto.id,
    metadata: { taskId, taskTitle, minutes: dto.minutes },
  });
  return dto;
}

export async function deleteTimeLog(
  projectId: string,
  taskId: string,
  timeLogId: string,
  userId: string,
): Promise<{ ok: true }> {
  if (!isUuidV4(timeLogId)) {
    throw new AppError("Time log not found", 404);
  }
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const row = await TimeLog.findOne({ where: { id: timeLogId, taskId } });
  if (!row) {
    throw new AppError("Time log not found", 404);
  }
  if (String(row.get("userId")) !== userId) {
    throw new AppError("You can only delete your own time logs", 403);
  }

  const minutes = Number(row.get("minutes"));
  await recordActivity({
    projectId,
    userId,
    action: "time_log.deleted",
    entityType: "time_log",
    entityId: timeLogId,
    metadata: { taskId, taskTitle, minutes },
  });
  await row.destroy();
  return { ok: true };
}
