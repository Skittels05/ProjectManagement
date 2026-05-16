import type { ParsedQs } from "qs";
import { Op, Sequelize, type Order, type OrderItem, type WhereOptions } from "sequelize";
import { Project, ProjectMember } from "../../models";
import { isUuidV4 } from "../../utils/uuid";

export type ProjectListSort = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
export type ProjectListFilter = "all" | "owner";

export type TaskListSort =
  | "board"
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "priority_desc"
  | "priority_asc"
  | "story_points_desc"
  | "story_points_asc";

export type TaskListFilterParams = {
  search: string;
  sort: TaskListSort;
  status: "all" | "todo" | "in_progress" | "done";
  assignee: "all" | "unassigned" | string;
  role: string;
  rootsOnly: boolean;
};

export function parseProjectListQuery(query: ParsedQs): {
  search: string;
  sort: ProjectListSort;
  filter: ProjectListFilter;
} {
  const sortRaw = String(query.sort ?? "updated_desc");
  const sort: ProjectListSort =
    sortRaw === "updated_asc" ||
    sortRaw === "name_asc" ||
    sortRaw === "name_desc"
      ? sortRaw
      : "updated_desc";

  const filterRaw = String(query.filter ?? "all");
  const filter: ProjectListFilter = filterRaw === "owner" ? "owner" : "all";

  return {
    search: String(query.search ?? "").trim(),
    sort,
    filter,
  };
}

export function projectListOrder(sort: ProjectListSort): Order {
  switch (sort) {
    case "updated_asc":
      return [[{ model: Project, as: "project" }, "updated_at", "ASC"]];
    case "name_asc":
      return [[{ model: Project, as: "project" }, "name", "ASC"]];
    case "name_desc":
      return [[{ model: Project, as: "project" }, "name", "DESC"]];
    case "updated_desc":
    default:
      return [[{ model: Project, as: "project" }, "updated_at", "DESC"]];
  }
}

export function parseTaskListQuery(query: ParsedQs): TaskListFilterParams {
  const sortRaw = String(query.sort ?? "board");
  const allowedSorts: TaskListSort[] = [
    "board",
    "updated_desc",
    "updated_asc",
    "title_asc",
    "title_desc",
    "priority_desc",
    "priority_asc",
    "story_points_desc",
    "story_points_asc",
  ];
  const sort = allowedSorts.includes(sortRaw as TaskListSort) ? (sortRaw as TaskListSort) : "board";

  const statusRaw = String(query.status ?? "all").toLowerCase();
  const status: TaskListFilterParams["status"] =
    statusRaw === "todo" || statusRaw === "in_progress" || statusRaw === "done" ? statusRaw : "all";

  const assigneeRaw = String(query.assignee ?? "all");
  let assignee: TaskListFilterParams["assignee"] = "all";
  if (assigneeRaw === "unassigned") {
    assignee = "unassigned";
  } else if (assigneeRaw !== "all" && isUuidV4(assigneeRaw)) {
    assignee = assigneeRaw;
  }

  const rootsOnly = query.rootsOnly === "true" || query.rootsOnly === "1";

  return {
    search: String(query.search ?? "").trim(),
    sort,
    status: rootsOnly ? "all" : status,
    assignee,
    role: String(query.role ?? "all").trim(),
    rootsOnly,
  };
}

function ilikePattern(search: string): string {
  return `%${search.replace(/[%_\\]/g, "\\$&")}%`;
}

export function taskSearchWhere(search: string): WhereOptions | undefined {
  if (!search) return undefined;
  const pattern = ilikePattern(search);
  return {
    [Op.or]: [
      { title: { [Op.iLike]: pattern } },
      { description: { [Op.iLike]: pattern } },
      { "$assignee.full_name$": { [Op.iLike]: pattern } },
      { "$assignee.email$": { [Op.iLike]: pattern } },
    ],
  };
}

export async function assigneeIdsForProjectRole(
  projectId: string,
  role: string,
): Promise<string[]> {
  const roleNorm = role.trim().toLowerCase();
  if (!roleNorm) return [];

  const rows = await ProjectMember.findAll({
    where: {
      projectId,
      [Op.and]: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.fn("TRIM", Sequelize.col("role"))),
        roleNorm,
      ),
    },
    attributes: ["userId"],
  });

  return rows.map((r) => String(r.get("userId")));
}

const STATUS_ORDER_SQL = `CASE "Task"."status"
  WHEN 'todo' THEN 1
  WHEN 'in_progress' THEN 2
  WHEN 'done' THEN 3
  ELSE 4
END`;

function taskOrderCol(column: string, direction: "ASC" | "DESC"): OrderItem {
  return [Sequelize.col(`Task.${column}`), direction];
}

export function taskListOrder(sort: TaskListSort, rootsOnly: boolean): Order {
  const tieBreak: Order = [taskOrderCol("created_at", "DESC")];
  // Kanban column layout uses status only for default board order.
  const statusOrder: Order =
    rootsOnly && sort === "board" ? [[Sequelize.literal(STATUS_ORDER_SQL), "ASC"]] : [];

  let rest: Order;
  switch (sort) {
    case "board":
      rest = [taskOrderCol("board_position", "ASC"), taskOrderCol("priority", "DESC"), ...tieBreak];
      break;
    case "updated_asc":
      rest = [taskOrderCol("updated_at", "ASC"), ...tieBreak];
      break;
    case "title_asc":
      rest = [taskOrderCol("title", "ASC"), ...tieBreak];
      break;
    case "title_desc":
      rest = [taskOrderCol("title", "DESC"), ...tieBreak];
      break;
    case "priority_asc":
      rest = [taskOrderCol("priority", "ASC"), ...tieBreak];
      break;
    case "priority_desc":
      rest = [taskOrderCol("priority", "DESC"), ...tieBreak];
      break;
    case "story_points_asc":
      rest = [
        [Sequelize.literal('"Task"."story_points" ASC NULLS LAST')] as unknown as OrderItem,
        ...tieBreak,
      ];
      break;
    case "story_points_desc":
      rest = [
        [Sequelize.literal('"Task"."story_points" DESC NULLS LAST')] as unknown as OrderItem,
        ...tieBreak,
      ];
      break;
    case "updated_desc":
    default:
      rest = [taskOrderCol("updated_at", "DESC"), ...tieBreak];
      break;
  }

  return [...statusOrder, ...(rest as OrderItem[])] as Order;
}
