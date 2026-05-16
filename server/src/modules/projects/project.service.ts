import { Op } from "sequelize";
import type { Model } from "sequelize";
import { sequelize, Project, ProjectMember, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";
import { recordActivity } from "./activity.service";

const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
} as const;

const MANAGE_MEMBER_ROLES = new Set<string>([ROLES.OWNER, ROLES.MANAGER]);

function isOwnerRole(role: string): boolean {
  return /^owner$/i.test(role.trim());
}

function trimProjectRole(role: unknown): string {
  const t = String(role).trim();
  if (t.length < 1 || t.length > 32) {
    throw new AppError("Role must be between 1 and 32 characters", 400);
  }
  return t;
}

function assertRoleCannotBeAssignedOwner(role: string): void {
  if (isOwnerRole(role)) {
    throw new AppError("The owner role cannot be assigned to a member", 400);
  }
}

function toDto(project: Model, role: string | null | undefined, members?: unknown[]) {
  const base: Record<string, unknown> = {
    id: project.get("id"),
    name: project.get("name"),
    description: project.get("description"),
    createdBy: project.get("createdBy"),
    wipLimitTodo: project.get("wipLimitTodo"),
    wipLimitInProgress: project.get("wipLimitInProgress"),
    wipLimitDone: project.get("wipLimitDone"),
    role: role ?? null,
    createdAt: project.get("createdAt"),
    updatedAt: project.get("updatedAt"),
  };
  if (members != null) {
    base.members = members;
  }
  return base;
}

function memberDisplayName(user: Model): string {
  const fullName = String(user.get("fullName") ?? "").trim();
  const email = String(user.get("email") ?? "").trim();
  return fullName || email || String(user.get("id"));
}

function toMemberDto(row: Model & { user?: Model }) {
  const user = row.user as Model | undefined;
  return {
    userId: row.get("userId"),
    email: user?.get("email"),
    fullName: user?.get("fullName"),
    role: row.get("role"),
  };
}

async function loadMembersForProject(projectId: string) {
  const rows = await ProjectMember.findAll({
    where: { projectId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "fullName"],
      },
    ],
    order: [["id", "ASC"]],
  });

  return rows.map((row) => toMemberDto(row as Model & { user: Model }));
}

async function getMembership(projectId: string, userId: string) {
  return ProjectMember.findOne({
    where: { projectId, userId },
    include: [{ model: User, as: "user", attributes: ["id", "email", "fullName"] }],
  });
}

async function countOwners(projectId: string): Promise<number> {
  return ProjectMember.count({
    where: { projectId, role: { [Op.iLike]: ROLES.OWNER } },
  });
}

function sameUuid(a: unknown, b: unknown): boolean {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

async function isActorOwnerOrCreator(actorUserId: string, projectId: string, actorRole: string | null | undefined) {
  const lower = String(actorRole ?? "").trim().toLowerCase();
  if (lower === ROLES.OWNER) return true;
  const project = await Project.findByPk(projectId, { attributes: ["createdBy"] });
  return project != null && sameUuid(actorUserId, project.get("createdBy"));
}

async function assertCanManageTeam(
  actorUserId: string,
  projectId: string,
  actorRole: string | null | undefined,
): Promise<void> {
  const r = String(actorRole ?? "").trim().toLowerCase();
  if (MANAGE_MEMBER_ROLES.has(r)) return;
  const project = await Project.findByPk(projectId, { attributes: ["createdBy"] });
  if (project && sameUuid(actorUserId, project.get("createdBy"))) return;
  throw new AppError("You do not have permission to manage project members", 403);
}

export async function createProject(userId: string, body: { name: string; description?: unknown }) {
  const trimmedName = body.name.trim();
  const trimmedDescription =
    body.description != null && String(body.description).trim() !== ""
      ? String(body.description).trim()
      : null;

  const t = await sequelize.transaction();

  try {
    const project = await Project.create(
      {
        name: trimmedName,
        description: trimmedDescription,
        createdBy: userId,
      },
      { transaction: t },
    );

    await ProjectMember.create(
      {
        projectId: project.get("id") as string,
        userId,
        role: "owner",
      },
      { transaction: t },
    );

    await t.commit();
    return toDto(project, "owner");
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

export async function listProjectsForUser(userId: string) {
  const rows = await ProjectMember.findAll({
    where: { userId },
    include: [
      {
        model: Project,
        as: "project",
        required: true,
      },
    ],
  });

  rows.sort((a, b) => {
    const pb = (b.get("project") as Model).get("updatedAt") as Date;
    const pa = (a.get("project") as Model).get("updatedAt") as Date;
    const tb = new Date(pb).getTime();
    const ta = new Date(pa).getTime();
    return tb - ta;
  });

  return rows.map((row) =>
    toDto(row.get("project") as Model, row.get("role") as string),
  );
}

export async function getProjectForUser(projectId: string, userId: string) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }

  const membership = await ProjectMember.findOne({
    where: { userId, projectId },
    include: [
      {
        model: Project,
        as: "project",
        required: true,
      },
    ],
  });

  if (!membership) {
    throw new AppError("Project not found", 404);
  }

  const proj = membership.get("project") as Model;
  const members = await loadMembersForProject(projectId);
  return toDto(proj, membership.get("role") as string, members);
}

function parseProjectDescription(value: unknown): string | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }
  return String(value).trim();
}

function parseProjectName(value: unknown): string {
  const trimmedName = String(value ?? "").trim();
  if (!trimmedName) {
    throw new AppError("Name is required", 400);
  }
  if (trimmedName.length > 255) {
    throw new AppError("Name must be at most 255 characters", 400);
  }
  return trimmedName;
}

function parseOptionalWipLimit(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    throw new AppError(`${field} must be an integer from 1 to 999, or empty`, 400);
  }
  return n;
}

export async function updateProject(
  actorUserId: string,
  projectId: string,
  body: {
    name?: unknown;
    description?: unknown;
    wipLimitTodo?: unknown;
    wipLimitInProgress?: unknown;
    wipLimitDone?: unknown;
  },
) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }

  const actor = await getMembership(projectId, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, projectId, actor.get("role") as string);

  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    patch.name = parseProjectName(body.name);
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    patch.description = parseProjectDescription(body.description);
  }

  if (Object.prototype.hasOwnProperty.call(body, "wipLimitTodo")) {
    patch.wipLimitTodo = parseOptionalWipLimit(body.wipLimitTodo, "WIP limit for To do");
  }
  if (Object.prototype.hasOwnProperty.call(body, "wipLimitInProgress")) {
    patch.wipLimitInProgress = parseOptionalWipLimit(
      body.wipLimitInProgress,
      "WIP limit for In progress",
    );
  }
  if (Object.prototype.hasOwnProperty.call(body, "wipLimitDone")) {
    patch.wipLimitDone = parseOptionalWipLimit(body.wipLimitDone, "WIP limit for Done");
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  const project = await Project.findByPk(projectId);
  if (!project) {
    throw new AppError("Project not found", 404);
  }

  await project.update(patch);
  return getProjectForUser(projectId, actorUserId);
}

export async function deleteProject(actorUserId: string, projectId: string): Promise<{ ok: true }> {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }

  const actor = await getMembership(projectId, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, projectId, actor.get("role") as string);

  const deleted = await Project.destroy({ where: { id: projectId } });
  if (deleted === 0) {
    throw new AppError("Project not found", 404);
  }

  return { ok: true };
}

export async function addProjectMember(
  actorUserId: string,
  projectId: string,
  body: { email: string; role: unknown },
) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  const id = projectId;

  const normalizedEmail = String(body.email).trim().toLowerCase();
  const roleToStore = trimProjectRole(body.role);
  assertRoleCannotBeAssignedOwner(roleToStore);

  const actor = await getMembership(id, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, id, actor.get("role") as string);

  const invitedUser = await User.findOne({
    where: { email: { [Op.iLike]: normalizedEmail } },
  });

  if (!invitedUser) {
    throw new AppError("No user registered with this email", 404);
  }

  if (invitedUser.get("isBlocked")) {
    throw new AppError("This user account is disabled", 403);
  }

  const existing = await ProjectMember.findOne({
    where: { projectId: id, userId: invitedUser.get("id") },
  });

  if (existing) {
    throw new AppError("User is already a member of this project", 409);
  }

  const invitedUserId = invitedUser.get("id") as string;
  await ProjectMember.create({
    projectId: id,
    userId: invitedUserId,
    role: roleToStore,
  });

  await recordActivity({
    projectId: id,
    userId: actorUserId,
    action: "member.invited",
    entityType: "member",
    entityId: invitedUserId,
    metadata: {
      name: memberDisplayName(invitedUser),
      email: invitedUser.get("email"),
      role: roleToStore,
    },
  });

  return getProjectForUser(id, actorUserId);
}

export async function updateProjectMemberRole(
  actorUserId: string,
  projectId: string,
  targetUserId: string,
  body: { role: unknown },
) {
  if (!isUuidV4(projectId) || !isUuidV4(targetUserId)) {
    throw new AppError("Project not found", 404);
  }
  const pid = projectId;
  const tid = targetUserId;

  const newRole = trimProjectRole(body.role);
  assertRoleCannotBeAssignedOwner(newRole);

  const actor = await getMembership(pid, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, pid, actor.get("role") as string);

  const target = await ProjectMember.findOne({ where: { projectId: pid, userId: tid } });
  if (!target) {
    throw new AppError("Member not found", 404);
  }

  const actorLower = String(actor.get("role") ?? "").trim().toLowerCase();
  const actorIsOwnerOrCreator = await isActorOwnerOrCreator(actorUserId, pid, actor.get("role") as string);
  if (
    !actorIsOwnerOrCreator &&
    actorLower === ROLES.MANAGER &&
    isOwnerRole(target.get("role") as string)
  ) {
    throw new AppError("Only the project owner can change an owner member", 403);
  }

  if (isOwnerRole(target.get("role") as string) && !isOwnerRole(newRole)) {
    const owners = await countOwners(pid);
    if (owners <= 1) {
      throw new AppError("The project must keep at least one owner", 400);
    }
  }

  const oldRole = String(target.get("role"));
  const targetUser = await User.findByPk(tid, { attributes: ["id", "fullName", "email"] });

  await target.update({ role: newRole });

  await recordActivity({
    projectId: pid,
    userId: actorUserId,
    action: "member.role_changed",
    entityType: "member",
    entityId: tid,
    metadata: {
      name: targetUser ? memberDisplayName(targetUser) : tid,
      from: oldRole,
      to: newRole,
    },
  });

  return getProjectForUser(pid, actorUserId);
}

export async function removeProjectMember(actorUserId: string, projectId: string, targetUserId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(targetUserId)) {
    throw new AppError("Project not found", 404);
  }
  const pid = projectId;
  const tid = targetUserId;

  const target = await ProjectMember.findOne({ where: { projectId: pid, userId: tid } });
  if (!target) {
    throw new AppError("Member not found", 404);
  }

  if (actorUserId === tid) {
    if (isOwnerRole(target.get("role") as string)) {
      const owners = await countOwners(pid);
      if (owners <= 1) {
        throw new AppError("Transfer ownership before leaving the project", 400);
      }
    }
    const selfUser = await User.findByPk(tid, { attributes: ["id", "fullName", "email"] });
    await recordActivity({
      projectId: pid,
      userId: actorUserId,
      action: "member.left",
      entityType: "member",
      entityId: tid,
      metadata: { name: selfUser ? memberDisplayName(selfUser) : tid },
    });
    await target.destroy();
    return { left: true as const };
  }

  const actor = await getMembership(pid, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, pid, actor.get("role") as string);

  const actorIsOwnerOrCreator = await isActorOwnerOrCreator(actorUserId, pid, actor.get("role") as string);
  if (isOwnerRole(target.get("role") as string) && !actorIsOwnerOrCreator) {
    throw new AppError("Only the project owner can remove an owner", 403);
  }

  if (isOwnerRole(target.get("role") as string)) {
    const owners = await countOwners(pid);
    if (owners <= 1) {
      throw new AppError("The project must keep at least one owner", 400);
    }
  }

  const targetUser = await User.findByPk(tid, { attributes: ["id", "fullName", "email"] });
  await recordActivity({
    projectId: pid,
    userId: actorUserId,
    action: "member.removed",
    entityType: "member",
    entityId: tid,
    metadata: {
      name: targetUser ? memberDisplayName(targetUser) : tid,
      role: String(target.get("role")),
    },
  });

  await target.destroy();
  return getProjectForUser(pid, actorUserId);
}
