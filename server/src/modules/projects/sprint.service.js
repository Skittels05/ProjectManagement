const { Op } = require("sequelize");
const { ProjectMember, Sprint } = require("../../models");
const { AppError } = require("../../utils/app-error");
const { isUuidV4 } = require("../../utils/uuid");

const SPRINT_STATUSES = new Set(["planned", "active", "completed"]);
const MANAGE_MEMBER_ROLES = new Set(["owner", "manager"]);

async function assertMember(projectId, userId) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
  return row;
}

function assertCanManageSprints(role) {
  const r = String(role ?? "").trim().toLowerCase();
  if (!MANAGE_MEMBER_ROLES.has(r)) {
    throw new AppError("You do not have permission to manage sprints", 403);
  }
}

function toSprintDto(sprint) {
  const createdAt = sprint.createdAt ?? sprint.created_at ?? null;
  const updatedAt = sprint.updatedAt ?? sprint.updated_at ?? null;
  return {
    id: sprint.id,
    projectId: sprint.projectId,
    name: sprint.name,
    goal: sprint.goal,
    startsAt: sprint.startsAt,
    endsAt: sprint.endsAt,
    status: sprint.status,
    createdAt,
    updatedAt,
  };
}

function parseDateOnly(value, fieldLabel) {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new AppError(`${fieldLabel} must be a date in YYYY-MM-DD format`, 400);
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(`Invalid ${fieldLabel}`, 400);
  }
  return s;
}

function assertEndsOnOrAfterStart(startsAt, endsAt) {
  const a = String(startsAt).slice(0, 10);
  const b = String(endsAt).slice(0, 10);
  if (b < a) {
    throw new AppError("End date must be on or after start date", 400);
  }
}

function normalizeStatus(value, fallback) {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const s = String(value).trim().toLowerCase();
  if (!SPRINT_STATUSES.has(s)) {
    throw new AppError("Status must be planned, active, or completed", 400);
  }
  return s;
}

async function assertNoOtherActiveSprint(projectId, excludeSprintId) {
  const where = { projectId, status: "active" };
  if (excludeSprintId) {
    where.id = { [Op.ne]: excludeSprintId };
  }
  const n = await Sprint.count({ where });
  if (n > 0) {
    throw new AppError("Another sprint is already active for this project.", 409);
  }
}

async function listSprints(projectId, userId) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);
  const rows = await Sprint.findAll({
    where: { projectId },
    order: [
      ["starts_at", "DESC"],
      ["created_at", "DESC"],
    ],
  });
  return rows.map(toSprintDto);
}

async function createSprint(userId, projectId, body) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  const member = await assertMember(projectId, userId);
  assertCanManageSprints(member.role);

  const name = String(body.name ?? "").trim();
  if (!name) {
    throw new AppError("Name is required", 400);
  }
  if (name.length > 255) {
    throw new AppError("Name must be at most 255 characters", 400);
  }

  const goal =
    body.goal != null && String(body.goal).trim() !== ""
      ? String(body.goal).trim().slice(0, 20000)
      : null;

  const startsAt = parseDateOnly(body.startsAt, "Start date");
  const endsAt = parseDateOnly(body.endsAt, "End date");
  assertEndsOnOrAfterStart(startsAt, endsAt);

  const status = normalizeStatus(body.status, "planned");
  if (status === "active") {
    await assertNoOtherActiveSprint(projectId, null);
  }

  const sprint = await Sprint.create({
    projectId,
    name,
    goal,
    startsAt,
    endsAt,
    status,
  });

  return toSprintDto(sprint);
}

async function updateSprint(userId, projectId, sprintId, body) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  const member = await assertMember(projectId, userId);
  assertCanManageSprints(member.role);

  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = String(body.name ?? "").trim();
    if (!name) {
      throw new AppError("Name is required", 400);
    }
    if (name.length > 255) {
      throw new AppError("Name must be at most 255 characters", 400);
    }
    patch.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "goal")) {
    patch.goal =
      body.goal != null && String(body.goal).trim() !== ""
        ? String(body.goal).trim().slice(0, 20000)
        : null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "startsAt")) {
    patch.startsAt = parseDateOnly(body.startsAt, "Start date");
  }
  if (Object.prototype.hasOwnProperty.call(body, "endsAt")) {
    patch.endsAt = parseDateOnly(body.endsAt, "End date");
  }
  if (patch.startsAt != null || patch.endsAt != null) {
    assertEndsOnOrAfterStart(
      patch.startsAt != null ? patch.startsAt : sprint.startsAt,
      patch.endsAt != null ? patch.endsAt : sprint.endsAt,
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const nextStatus = normalizeStatus(body.status, sprint.status);
    if (nextStatus === "active" && sprint.status !== "active") {
      await assertNoOtherActiveSprint(projectId, sprint.id);
    }
    patch.status = nextStatus;
  }

  if (Object.keys(patch).length === 0) {
    return toSprintDto(sprint);
  }

  await sprint.update(patch);
  await sprint.reload();
  return toSprintDto(sprint);
}

async function deleteSprint(userId, projectId, sprintId) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  const member = await assertMember(projectId, userId);
  assertCanManageSprints(member.role);

  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }

  await sprint.destroy();
  return { ok: true };
}

module.exports = {
  listSprints,
  createSprint,
  updateSprint,
  deleteSprint,
};
