const { Op } = require("sequelize");
const { sequelize, Project, ProjectMember, User } = require("../../models");
const { AppError } = require("../../utils/app-error");
const { isUuidV4 } = require("../../utils/uuid");

const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
};

const MANAGE_MEMBER_ROLES = new Set([ROLES.OWNER, ROLES.MANAGER]);

function isOwnerRole(role) {
  return typeof role === "string" && /^owner$/i.test(role.trim());
}

function trimProjectRole(role) {
  const t = String(role).trim();
  if (t.length < 1 || t.length > 32) {
    throw new AppError("Role must be between 1 and 32 characters", 400);
  }
  return t;
}

function assertRoleCannotBeAssignedOwner(role) {
  if (isOwnerRole(role)) {
    throw new AppError("The owner role cannot be assigned to a member", 400);
  }
}

function toDto(project, role, members) {
  const base = {
    id: project.id,
    name: project.name,
    description: project.description,
    createdBy: project.createdBy,
    role: role ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (members != null) {
    base.members = members;
  }
  return base;
}

function toMemberDto(row) {
  return {
    userId: row.userId,
    email: row.user.email,
    fullName: row.user.fullName,
    role: row.role,
  };
}

async function loadMembersForProject(projectId) {
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

  return rows.map(toMemberDto);
}

async function getMembership(projectId, userId) {
  return ProjectMember.findOne({
    where: { projectId, userId },
    include: [{ model: User, as: "user", attributes: ["id", "email", "fullName"] }],
  });
}

async function countOwners(projectId) {
  return ProjectMember.count({
    where: { projectId, role: { [Op.iLike]: ROLES.OWNER } },
  });
}

function sameUuid(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

async function isActorOwnerOrCreator(actorUserId, projectId, actorRole) {
  const lower = String(actorRole ?? "").trim().toLowerCase();
  if (lower === ROLES.OWNER) return true;
  const project = await Project.findByPk(projectId, { attributes: ["createdBy"] });
  return project != null && sameUuid(actorUserId, project.createdBy);
}

async function assertCanManageTeam(actorUserId, projectId, actorRole) {
  const r = String(actorRole ?? "").trim().toLowerCase();
  if (MANAGE_MEMBER_ROLES.has(r)) return;
  const project = await Project.findByPk(projectId, { attributes: ["createdBy"] });
  if (project && sameUuid(actorUserId, project.createdBy)) return;
  throw new AppError("You do not have permission to manage project members", 403);
}

async function createProject(userId, { name, description }) {
  const trimmedName = name.trim();
  const trimmedDescription =
    description != null && String(description).trim() !== ""
      ? String(description).trim()
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
        projectId: project.id,
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

async function listProjectsForUser(userId) {
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
    const tb = new Date(b.project.updatedAt).getTime();
    const ta = new Date(a.project.updatedAt).getTime();
    return tb - ta;
  });

  return rows.map((row) => toDto(row.project, row.role));
}

async function getProjectForUser(projectId, userId) {
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

  const members = await loadMembersForProject(projectId);
  return toDto(membership.project, membership.role, members);
}

async function addProjectMember(actorUserId, projectId, { email, role }) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  const id = projectId;

  const normalizedEmail = String(email).trim().toLowerCase();
  const roleToStore = trimProjectRole(role);
  assertRoleCannotBeAssignedOwner(roleToStore);

  const actor = await getMembership(id, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, id, actor.role);

  const invitedUser = await User.findOne({
    where: { email: { [Op.iLike]: normalizedEmail } },
  });

  if (!invitedUser) {
    throw new AppError("No user registered with this email", 404);
  }

  if (invitedUser.isBlocked) {
    throw new AppError("This user account is disabled", 403);
  }

  const existing = await ProjectMember.findOne({
    where: { projectId: id, userId: invitedUser.id },
  });

  if (existing) {
    throw new AppError("User is already a member of this project", 409);
  }

  await ProjectMember.create({
    projectId: id,
    userId: invitedUser.id,
    role: roleToStore,
  });

  return getProjectForUser(id, actorUserId);
}

async function updateProjectMemberRole(actorUserId, projectId, targetUserId, { role }) {
  if (!isUuidV4(projectId) || !isUuidV4(targetUserId)) {
    throw new AppError("Project not found", 404);
  }
  const pid = projectId;
  const tid = targetUserId;

  const newRole = trimProjectRole(role);
  assertRoleCannotBeAssignedOwner(newRole);

  const actor = await getMembership(pid, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, pid, actor.role);

  const target = await ProjectMember.findOne({ where: { projectId: pid, userId: tid } });
  if (!target) {
    throw new AppError("Member not found", 404);
  }

  const actorLower = String(actor.role ?? "").trim().toLowerCase();
  const actorIsOwnerOrCreator = await isActorOwnerOrCreator(actorUserId, pid, actor.role);
  if (!actorIsOwnerOrCreator && actorLower === ROLES.MANAGER && isOwnerRole(target.role)) {
    throw new AppError("Only the project owner can change an owner member", 403);
  }

  if (isOwnerRole(target.role) && !isOwnerRole(newRole)) {
    const owners = await countOwners(pid);
    if (owners <= 1) {
      throw new AppError("The project must keep at least one owner", 400);
    }
  }

  await target.update({ role: newRole });
  return getProjectForUser(pid, actorUserId);
}

async function removeProjectMember(actorUserId, projectId, targetUserId) {
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
    if (isOwnerRole(target.role)) {
      const owners = await countOwners(pid);
      if (owners <= 1) {
        throw new AppError("Transfer ownership before leaving the project", 400);
      }
    }
    await target.destroy();
    return { left: true };
  }

  const actor = await getMembership(pid, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  await assertCanManageTeam(actorUserId, pid, actor.role);

  const actorIsOwnerOrCreator = await isActorOwnerOrCreator(actorUserId, pid, actor.role);
  if (isOwnerRole(target.role) && !actorIsOwnerOrCreator) {
    throw new AppError("Only the project owner can remove an owner", 403);
  }

  if (isOwnerRole(target.role)) {
    const owners = await countOwners(pid);
    if (owners <= 1) {
      throw new AppError("The project must keep at least one owner", 400);
    }
  }

  await target.destroy();
  return getProjectForUser(pid, actorUserId);
}

module.exports = {
  createProject,
  listProjectsForUser,
  getProjectForUser,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
};
