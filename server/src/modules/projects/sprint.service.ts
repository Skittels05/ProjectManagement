import { Op } from "sequelize";
import { ProjectMember, Sprint, Project } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

const SPRINT_STATUSES = new Set(["planned", "active", "completed"]);
const MANAGE_MEMBER_ROLES = new Set(["owner", "manager"]);

async function assertMember(projectId: string, userId: string) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
  return row;
}

function sameUuid(a: unknown, b: unknown): boolean {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

async function assertCanManageSprints(projectId: string, userId: string, role: string | null | undefined) {
  const r = String(role ?? "").trim().toLowerCase();
  if (MANAGE_MEMBER_ROLES.has(r)) return;
  const project = await Project.findByPk(projectId, { attributes: ["createdBy"] });
  if (project && sameUuid(userId, project.get("createdBy"))) return;
  throw new AppError("You do not have permission to manage sprints", 403);
}

function toSprintDto(sprint: {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  createdAt?: Date;
  created_at?: Date;
  updatedAt?: Date;
  updated_at?: Date;
}) {
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

function parseDateOnly(value: unknown, fieldLabel: string): string {
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

function assertEndsOnOrAfterStart(startsAt: string, endsAt: string): void {
  const a = String(startsAt).slice(0, 10);
  const b = String(endsAt).slice(0, 10);
  if (b < a) {
    throw new AppError("End date must be on or after start date", 400);
  }
}

function normalizeStatus(value: unknown, fallback: string): string {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const s = String(value).trim().toLowerCase();
  if (!SPRINT_STATUSES.has(s)) {
    throw new AppError("Status must be planned, active, or completed", 400);
  }
  return s;
}

async function assertNoOtherActiveSprint(projectId: string, excludeSprintId: string | null): Promise<void> {
  const where: { projectId: string; status: string; id?: { [Op.ne]: string } } = {
    projectId,
    status: "active",
  };
  if (excludeSprintId) {
    where.id = { [Op.ne]: excludeSprintId };
  }
  const n = await Sprint.count({ where });
  if (n > 0) {
    throw new AppError("Another sprint is already active for this project.", 409);
  }
}

export async function listSprints(projectId: string, userId: string) {
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
  return rows.map((s) => toSprintDto(s.get({ plain: true }) as Parameters<typeof toSprintDto>[0]));
}

export async function createSprint(userId: string, projectId: string, body: Record<string, unknown>) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  const member = await assertMember(projectId, userId);
  await assertCanManageSprints(projectId, userId, member.get("role") as string);

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

  return toSprintDto(sprint.get({ plain: true }) as Parameters<typeof toSprintDto>[0]);
}

export async function updateSprint(
  userId: string,
  projectId: string,
  sprintId: string,
  body: Record<string, unknown>,
) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  const member = await assertMember(projectId, userId);
  await assertCanManageSprints(projectId, userId, member.get("role") as string);

  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }

  const plain = sprint.get({ plain: true }) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const nm = String(body.name ?? "").trim();
    if (!nm) {
      throw new AppError("Name is required", 400);
    }
    if (nm.length > 255) {
      throw new AppError("Name must be at most 255 characters", 400);
    }
    patch.name = nm;
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
      (patch.startsAt != null ? patch.startsAt : plain.startsAt) as string,
      (patch.endsAt != null ? patch.endsAt : plain.endsAt) as string,
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const nextStatus = normalizeStatus(body.status, plain.status as string);
    if (nextStatus === "active" && plain.status !== "active") {
      await assertNoOtherActiveSprint(projectId, sprint.get("id") as string);
    }
    patch.status = nextStatus;
  }

  if (Object.keys(patch).length === 0) {
    return toSprintDto(plain as Parameters<typeof toSprintDto>[0]);
  }

  await sprint.update(patch);
  await sprint.reload();
  return toSprintDto(sprint.get({ plain: true }) as Parameters<typeof toSprintDto>[0]);
}

export async function deleteSprint(userId: string, projectId: string, sprintId: string): Promise<{ ok: boolean }> {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  const member = await assertMember(projectId, userId);
  await assertCanManageSprints(projectId, userId, member.get("role") as string);

  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }

  await sprint.destroy();
  return { ok: true };
}
