import { Op, QueryTypes } from "sequelize";
import { ProjectMember, sequelize, Sprint, Task, TimeLog } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

async function assertMember(projectId: string, userId: string) {
  const row = await ProjectMember.findOne({ where: { projectId, userId } });
  if (!row) {
    throw new AppError("Project not found", 404);
  }
}

async function getSprintOrThrow(projectId: string, sprintId: string) {
  const sprint = await Sprint.findOne({ where: { id: sprintId, projectId } });
  if (!sprint) {
    throw new AppError("Sprint not found", 404);
  }
  return sprint;
}

async function getSprintTasks(projectId: string, sprintId: string) {
  return Task.findAll({
    where: { projectId, sprintId, parentTaskId: null },
  });
}

function spValue(points: number | null | undefined): number {
  return typeof points === "number" && Number.isFinite(points) ? points : 0;
}

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDayInclusive(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = parseDateOnly(start);
  const last = parseDateOnly(end);
  while (cur.getTime() <= last.getTime()) {
    days.push(formatDateOnly(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function readTaskUpdatedAt(task: {
  get: (key: string) => unknown;
}): Date | null {
  const raw = task.get("updatedAt") ?? task.get("updated_at");
  if (raw == null) return null;
  const d = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

type BurndownTaskRow = {
  status: string;
  storyPoints: number | null;
  updatedAt: Date | null;
};

function taskDoneOnDay(task: BurndownTaskRow, day: string, rangeLastDay: string): boolean {
  if (task.status !== "done") return false;
  if (!task.updatedAt) {
    return day >= rangeLastDay;
  }
  const doneDay = formatDateOnly(task.updatedAt);
  return doneDay <= day;
}

function remainingStoryPointsOnDay(tasks: BurndownTaskRow[], day: string, rangeLastDay: string): number {
  return tasks.reduce((sum, t) => {
    if (taskDoneOnDay(t, day, rangeLastDay)) return sum;
    return sum + spValue(t.storyPoints);
  }, 0);
}

export async function getSprintStats(userId: string, projectId: string, sprintId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  await assertMember(projectId, userId);
  const sprint = await getSprintOrThrow(projectId, sprintId);
  const tasks = await getSprintTasks(projectId, sprintId);

  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  let committedStoryPoints = 0;
  let completedStoryPoints = 0;

  for (const t of tasks) {
    const status = String(t.get("status"));
    if (status in byStatus) {
      byStatus[status as keyof typeof byStatus] += 1;
    }
    const sp = spValue(t.get("storyPoints") as number | null);
    committedStoryPoints += sp;
    if (status === "done") {
      completedStoryPoints += sp;
    }
  }

  const taskIds = tasks.map((t) => t.get("id") as string);
  let totalLoggedMinutes = 0;
  if (taskIds.length > 0) {
    const agg = (await TimeLog.sum("minutes", { where: { taskId: { [Op.in]: taskIds } } })) as number | null;
    totalLoggedMinutes = agg ?? 0;
  }

  const completionPercent =
    committedStoryPoints > 0 ? Math.round((completedStoryPoints / committedStoryPoints) * 100) : 0;

  const today = formatDateOnly(new Date());
  const sprintEnd = String(sprint.get("endsAt")).slice(0, 10);
  const sprintStart = String(sprint.get("startsAt")).slice(0, 10);
  const daysTotal = eachDayInclusive(sprintStart, sprintEnd).length;
  const daysElapsed = eachDayInclusive(sprintStart, today < sprintEnd ? today : sprintEnd).length;

  return {
    sprint: {
      id: sprint.get("id"),
      name: sprint.get("name"),
      startsAt: sprintStart,
      endsAt: sprintEnd,
      status: sprint.get("status"),
    },
    totalTasks: tasks.length,
    byStatus,
    committedStoryPoints,
    completedStoryPoints,
    completionPercent,
    totalLoggedMinutes,
    daysTotal,
    daysElapsed,
  };
}

export async function getSprintBurndown(userId: string, projectId: string, sprintId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  await assertMember(projectId, userId);
  const sprint = await getSprintOrThrow(projectId, sprintId);
  const tasks = await getSprintTasks(projectId, sprintId);

  const sprintStart = String(sprint.get("startsAt")).slice(0, 10);
  const sprintEnd = String(sprint.get("endsAt")).slice(0, 10);
  const sprintStatus = String(sprint.get("status"));
  const today = formatDateOnly(new Date());
  const rangeEnd =
    sprintStatus === "completed"
      ? sprintEnd
      : today < sprintEnd
        ? today
        : sprintEnd;
  const sprintDays = eachDayInclusive(sprintStart, sprintEnd);
  const chartDays = eachDayInclusive(sprintStart, rangeEnd);
  const rangeLastDay = chartDays[chartDays.length - 1] ?? rangeEnd;
  const sprintSpan = sprintDays.length;

  const committedStoryPoints = tasks.reduce((s, t) => s + spValue(t.get("storyPoints") as number | null), 0);
  const plainTasks: BurndownTaskRow[] = tasks.map((t) => ({
    status: String(t.get("status")),
    storyPoints: t.get("storyPoints") as number | null,
    updatedAt: readTaskUpdatedAt(t),
  }));

  const points = chartDays.map((day) => {
    const remaining = remainingStoryPointsOnDay(plainTasks, day, rangeLastDay);
    const sprintIndex = sprintDays.indexOf(day);
    const ideal =
      sprintSpan <= 1 || sprintIndex < 0
        ? 0
        : Math.round((committedStoryPoints * (sprintSpan - 1 - sprintIndex)) / (sprintSpan - 1));
    return { date: day, ideal, actual: remaining };
  });

  return {
    sprint: {
      id: sprint.get("id"),
      name: sprint.get("name"),
      startsAt: sprintStart,
      endsAt: sprintEnd,
    },
    committedStoryPoints,
    points,
  };
}

export type ScatterPoint = {
  taskId: string;
  title: string;
  storyPoints: number;
  totalMinutes: number;
  assignee: { id: string; fullName: string } | null;
};

export async function getSprintScatter(userId: string, projectId: string, sprintId: string) {
  if (!isUuidV4(projectId) || !isUuidV4(sprintId)) {
    throw new AppError("Sprint not found", 404);
  }
  await assertMember(projectId, userId);
  await getSprintOrThrow(projectId, sprintId);

  const rows = await sequelize.query<{
    task_id: string;
    title: string;
    story_points: number;
    total_minutes: string;
    assignee_id: string | null;
    assignee_name: string | null;
  }>(
    `
    SELECT t.id AS task_id, t.title, t.story_points,
           COALESCE(SUM(tl.minutes), 0)::text AS total_minutes,
           u.id AS assignee_id, u.full_name AS assignee_name
    FROM tasks t
    LEFT JOIN time_logs tl ON tl.task_id = t.id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.project_id = :projectId
      AND t.sprint_id = :sprintId
      AND t.parent_task_id IS NULL
      AND t.story_points IS NOT NULL
    GROUP BY t.id, t.title, t.story_points, u.id, u.full_name
    HAVING COALESCE(SUM(tl.minutes), 0) > 0
    ORDER BY t.story_points DESC, t.title ASC
    `,
    {
      replacements: { projectId, sprintId },
      type: QueryTypes.SELECT,
    },
  );

  const points: ScatterPoint[] = rows.map((r) => ({
    taskId: r.task_id,
    title: r.title,
    storyPoints: r.story_points,
    totalMinutes: Number(r.total_minutes) || 0,
    assignee: r.assignee_id
      ? { id: r.assignee_id, fullName: r.assignee_name ?? "" }
      : null,
  }));

  return { points };
}

export async function getTeamVelocity(userId: string, projectId: string) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  const completed = await Sprint.findAll({
    where: { projectId, status: "completed" },
    order: [["ends_at", "DESC"]],
    limit: 12,
  });

  const sprints = [];
  for (const sprint of completed) {
    const sprintId = sprint.get("id") as string;
    const tasks = await Task.findAll({
      where: { projectId, sprintId, parentTaskId: null, status: "done" },
      attributes: ["storyPoints"],
    });
    const completedStoryPoints = tasks.reduce(
      (s, t) => s + spValue(t.get("storyPoints") as number | null),
      0,
    );
    sprints.push({
      sprintId,
      name: sprint.get("name"),
      endsAt: String(sprint.get("endsAt")).slice(0, 10),
      completedStoryPoints,
    });
  }

  const values = sprints.map((s) => s.completedStoryPoints).filter((v) => v > 0);
  const averageCompletedStoryPoints =
    values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;

  return { sprints, averageCompletedStoryPoints };
}

export type TimeLogReportRow = {
  id: string;
  taskId: string;
  taskTitle: string;
  sprintId: string | null;
  sprintName: string | null;
  userId: string;
  userName: string;
  minutes: number;
  note: string | null;
  loggedAt: string;
};

export async function getTimeLogReport(
  userId: string,
  projectId: string,
  filters: { from?: string; to?: string; memberId?: string; sprintId?: string },
) {
  if (!isUuidV4(projectId)) {
    throw new AppError("Project not found", 404);
  }
  await assertMember(projectId, userId);

  if (filters.sprintId && !isUuidV4(filters.sprintId)) {
    throw new AppError("Invalid sprint id", 400);
  }
  if (filters.memberId && !isUuidV4(filters.memberId)) {
    throw new AppError("Invalid user id", 400);
  }

  const conditions = ["t.project_id = :projectId"];
  const replacements: Record<string, string> = { projectId };

  if (filters.from) {
    conditions.push("tl.logged_at >= :from");
    replacements.from = filters.from;
  }
  if (filters.to) {
    conditions.push("tl.logged_at <= :to");
    replacements.to = `${filters.to}T23:59:59.999Z`;
  }
  if (filters.memberId) {
    conditions.push("tl.user_id = :memberId");
    replacements.memberId = filters.memberId;
  }
  if (filters.sprintId) {
    conditions.push("t.sprint_id = :sprintId");
    replacements.sprintId = filters.sprintId;
  }

  const rows = await sequelize.query<{
    id: string;
    task_id: string;
    task_title: string;
    sprint_id: string | null;
    sprint_name: string | null;
    user_id: string;
    user_name: string;
    minutes: number;
    note: string | null;
    logged_at: Date;
  }>(
    `
    SELECT tl.id, t.id AS task_id, t.title AS task_title,
           s.id AS sprint_id, s.name AS sprint_name,
           u.id AS user_id, u.full_name AS user_name,
           tl.minutes, tl.note, tl.logged_at
    FROM time_logs tl
    INNER JOIN tasks t ON t.id = tl.task_id
    INNER JOIN users u ON u.id = tl.user_id
    LEFT JOIN sprints s ON s.id = t.sprint_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY tl.logged_at DESC, tl.created_at DESC
    `,
    { replacements, type: QueryTypes.SELECT },
  );

  const items: TimeLogReportRow[] = rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    taskTitle: r.task_title,
    sprintId: r.sprint_id,
    sprintName: r.sprint_name,
    userId: r.user_id,
    userName: r.user_name,
    minutes: r.minutes,
    note: r.note,
    loggedAt: new Date(r.logged_at).toISOString().slice(0, 10),
  }));

  const byUser = new Map<string, { userId: string; userName: string; minutes: number }>();
  for (const row of items) {
    const prev = byUser.get(row.userId) ?? { userId: row.userId, userName: row.userName, minutes: 0 };
    prev.minutes += row.minutes;
    byUser.set(row.userId, prev);
  }

  const totalMinutes = items.reduce((s, r) => s + r.minutes, 0);

  return {
    items,
    totalMinutes,
    summaryByUser: [...byUser.values()].sort((a, b) => b.minutes - a.minutes),
  };
}

