const { Op } = require("sequelize");
const { sequelize, Project, ProjectMember, User } = require("../../models");
const { AppError } = require("../../utils/app-error");
const { isUuidV4 } = require("../../utils/uuid");

const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  MEMBER: "member",
};

const MANAGE_MEMBER_ROLES = new Set([ROLES.OWNER, ROLES.MANAGER]);
const INVITE_ROLES = new Set([ROLES.MEMBER, ROLES.MANAGER]);
const ALL_ROLES = new Set([ROLES.OWNER, ROLES.MANAGER, ROLES.MEMBER]);

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
    where: { projectId, role: ROLES.OWNER },
  });
}

function assertCanManageTeam(actorRole) {
  if (!MANAGE_MEMBER_ROLES.has(actorRole)) {
    throw new AppError("You do not have permission to manage project members", 403);
  }
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
  const normalizedRole = String(role).trim().toLowerCase();

  if (!INVITE_ROLES.has(normalizedRole)) {
    throw new AppError("Invalid role for invitation", 400);
  }

  const actor = await getMembership(id, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  assertCanManageTeam(actor.role);

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
    role: normalizedRole,
  });

  return getProjectForUser(id, actorUserId);
}

async function updateProjectMemberRole(actorUserId, projectId, targetUserId, { role }) {
  if (!isUuidV4(projectId) || !isUuidV4(targetUserId)) {
    throw new AppError("Project not found", 404);
  }
  const pid = projectId;
  const tid = targetUserId;

  const normalizedRole = String(role).trim().toLowerCase();
  if (!ALL_ROLES.has(normalizedRole)) {
    throw new AppError("Invalid role", 400);
  }

  const actor = await getMembership(pid, actorUserId);
  if (!actor) {
    throw new AppError("Project not found", 404);
  }
  assertCanManageTeam(actor.role);

  const target = await ProjectMember.findOne({ where: { projectId: pid, userId: tid } });
  if (!target) {
    throw new AppError("Member not found", 404);
  }

  if (actor.role === ROLES.MANAGER && (target.role === ROLES.OWNER || normalizedRole === ROLES.OWNER)) {
    throw new AppError("Only the project owner can change owner roles", 403);
  }

  if (normalizedRole === ROLES.OWNER && actor.role !== ROLES.OWNER) {
    throw new AppError("Only the project owner can assign the owner role", 403);
  }

  if (target.role === ROLES.OWNER && normalizedRole !== ROLES.OWNER) {
    const owners = await countOwners(pid);
    if (owners <= 1) {
      throw new AppError("The project must keep at least one owner", 400);
    }
  }

  await target.update({ role: normalizedRole });
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
    if (target.role === ROLES.OWNER) {
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
  assertCanManageTeam(actor.role);

  if (target.role === ROLES.OWNER && actor.role !== ROLES.OWNER) {
    throw new AppError("Only the project owner can remove an owner", 403);
  }

  if (target.role === ROLES.OWNER) {
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
