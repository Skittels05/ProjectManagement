import { TaskComment, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";
import { recordActivity } from "./activity.service";
import { assertTaskInProject } from "./task-access";

function toUserMini(u: { id: string; email: string; fullName: string } | null | undefined) {
  if (!u) return null;
  return { id: u.id, email: u.email, fullName: u.fullName };
}

function toCommentDto(row: {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
  user?: { id: string; email: string; fullName: string };
}) {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    body: row.body,
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

export async function listComments(projectId: string, taskId: string, userId: string) {
  await assertTaskInProject(projectId, taskId, userId);

  const rows = await TaskComment.findAll({
    where: { taskId },
    include: [userInclude],
    order: [["created_at", "ASC"]],
  });

  return rows.map((r) =>
    toCommentDto(r.get({ plain: true }) as Parameters<typeof toCommentDto>[0]),
  );
}

export async function createComment(
  projectId: string,
  taskId: string,
  userId: string,
  body: { body: unknown },
) {
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const text = String(body.body ?? "").trim();
  if (!text) {
    throw new AppError("Comment cannot be empty", 400);
  }
  if (text.length > 10000) {
    throw new AppError("Comment is too long", 400);
  }

  const row = await TaskComment.create({
    taskId,
    userId,
    body: text,
  });

  await row.reload({ include: [userInclude] });
  const dto = toCommentDto(row.get({ plain: true }) as Parameters<typeof toCommentDto>[0]);
  await recordActivity({
    projectId,
    userId,
    action: "comment.created",
    entityType: "comment",
    entityId: dto.id,
    metadata: { taskId, taskTitle },
  });
  return dto;
}

export async function updateComment(
  projectId: string,
  taskId: string,
  commentId: string,
  userId: string,
  body: { body: unknown },
) {
  if (!isUuidV4(commentId)) {
    throw new AppError("Comment not found", 404);
  }
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const comment = await TaskComment.findOne({ where: { id: commentId, taskId } });
  if (!comment) {
    throw new AppError("Comment not found", 404);
  }
  if (String(comment.get("userId")) !== userId) {
    throw new AppError("You can only edit your own comments", 403);
  }

  const text = String(body.body ?? "").trim();
  if (!text) {
    throw new AppError("Comment cannot be empty", 400);
  }
  if (text.length > 10000) {
    throw new AppError("Comment is too long", 400);
  }

  await comment.update({ body: text });
  await comment.reload({ include: [userInclude] });
  const dto = toCommentDto(comment.get({ plain: true }) as Parameters<typeof toCommentDto>[0]);
  await recordActivity({
    projectId,
    userId,
    action: "comment.updated",
    entityType: "comment",
    entityId: dto.id,
    metadata: { taskId, taskTitle },
  });
  return dto;
}

export async function deleteComment(
  projectId: string,
  taskId: string,
  commentId: string,
  userId: string,
): Promise<{ ok: true }> {
  if (!isUuidV4(commentId)) {
    throw new AppError("Comment not found", 404);
  }
  const task = await assertTaskInProject(projectId, taskId, userId);
  const taskTitle = String(task.get("title"));

  const comment = await TaskComment.findOne({ where: { id: commentId, taskId } });
  if (!comment) {
    throw new AppError("Comment not found", 404);
  }
  if (String(comment.get("userId")) !== userId) {
    throw new AppError("You can only delete your own comments", 403);
  }

  await recordActivity({
    projectId,
    userId,
    action: "comment.deleted",
    entityType: "comment",
    entityId: commentId,
    metadata: { taskId, taskTitle },
  });
  await comment.destroy();
  return { ok: true };
}
