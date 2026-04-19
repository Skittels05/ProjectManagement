const { sequelize, Project, ProjectMember } = require("../../models");
const { AppError } = require("../../utils/app-error");

function toDto(project, role) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdBy: project.createdBy,
    role: role ?? null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
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
  const id = Number(projectId);

  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("Project not found", 404);
  }

  const membership = await ProjectMember.findOne({
    where: { userId, projectId: id },
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

  return toDto(membership.project, membership.role);
}

module.exports = {
  createProject,
  listProjectsForUser,
  getProjectForUser,
};
