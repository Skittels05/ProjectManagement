import { ActivityLog, ProjectMember, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

async function assertMember(projectId: string, userId: string) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
}

export type RecordActivityInput = {
  projectId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await ActivityLog.create({
      projectId: input.projectId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
  }
}

function toActivityDto(row: {
  id: string;
  projectId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  created_at?: Date;
  user?: { id: string; email: string; fullName: string } | null;
}) {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt ?? row.created_at ?? null,
    user: row.user
      ? { id: row.user.id, email: row.user.email, fullName: row.user.fullName }
      : null,
  };
}

export async function listActivity(
  userId: string,
  projectId: string,
  options: { limit?: number; offset?: number },
) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const { rows, count } = await ActivityLog.findAndCountAll({
    where: { projectId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "fullName"],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    items: rows.map((r) =>
      toActivityDto(r.get({ plain: true }) as Parameters<typeof toActivityDto>[0]),
    ),
    total: count,
    limit,
    offset,
  };
}
