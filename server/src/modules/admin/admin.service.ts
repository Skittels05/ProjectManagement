import { Op } from "sequelize";
import { RefreshToken, User } from "../../models";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";

export type AdminUserSort = "name_asc" | "name_desc" | "email_asc" | "email_desc";
export type AdminUserFilter = "all" | "active" | "blocked" | "admins";

function toAdminUserDto(user: {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isBlocked: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    isBlocked: user.isBlocked,
  };
}

export async function listUsers(
  query: {
    search?: string;
    sort?: string;
    filter?: string;
    limit?: string | number;
    offset?: string | number;
  },
) {
  const search = String(query.search ?? "").trim();
  const sort = (String(query.sort ?? "name_asc") as AdminUserSort) || "name_asc";
  const filter = (String(query.filter ?? "all") as AdminUserFilter) || "all";
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  const where: Record<string, unknown> = {};

  if (filter === "active") {
    where.isBlocked = false;
  } else if (filter === "blocked") {
    where.isBlocked = true;
  } else if (filter === "admins") {
    where.isAdmin = true;
  }

  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    Object.assign(where, {
      [Op.or]: [
        { email: { [Op.iLike]: pattern } },
        { fullName: { [Op.iLike]: pattern } },
      ],
    });
  }

  let order: [string, string][] = [["full_name", "ASC"]];
  switch (sort) {
    case "name_desc":
      order = [["full_name", "DESC"]];
      break;
    case "email_asc":
      order = [["email", "ASC"]];
      break;
    case "email_desc":
      order = [["email", "DESC"]];
      break;
    case "name_asc":
    default:
      order = [["full_name", "ASC"]];
      break;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: ["id", "email", "fullName", "isAdmin", "isBlocked"],
    order,
    limit,
    offset,
  });

  return {
    items: rows.map((r) =>
      toAdminUserDto(r.get({ plain: true }) as Parameters<typeof toAdminUserDto>[0]),
    ),
    total: count,
    limit,
    offset,
  };
}

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isBlocked: boolean;
};

async function countActiveAdmins(): Promise<number> {
  return User.count({ where: { isAdmin: true, isBlocked: false } });
}

async function loadTargetUser(targetUserId: string) {
  if (!isUuidV4(targetUserId)) {
    throw new AppError("User not found", 404);
  }

  const row = await User.findByPk(targetUserId);
  if (!row) {
    throw new AppError("User not found", 404);
  }

  return { row, plain: row.get({ plain: true }) as UserRow };
}

export async function updateUser(
  actorUserId: string,
  targetUserId: string,
  patch: { isBlocked?: boolean; isAdmin?: boolean },
) {
  if (patch.isBlocked === undefined && patch.isAdmin === undefined) {
    throw new AppError("No fields to update", 400);
  }

  if (actorUserId === targetUserId && (patch.isBlocked !== undefined || patch.isAdmin !== undefined)) {
    throw new AppError("You cannot change your own account", 400);
  }

  const { row, plain } = await loadTargetUser(targetUserId);
  const updates: Partial<Pick<UserRow, "isBlocked" | "isAdmin">> = {};
  let revokeSessions = false;

  if (patch.isBlocked !== undefined && patch.isBlocked !== plain.isBlocked) {
    if (patch.isBlocked && plain.isAdmin) {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        throw new AppError("Cannot block the only active administrator", 400);
      }
    }
    updates.isBlocked = patch.isBlocked;
    if (patch.isBlocked) {
      revokeSessions = true;
    }
  }

  if (patch.isAdmin !== undefined && patch.isAdmin !== plain.isAdmin) {
    if (!patch.isAdmin && plain.isAdmin && !plain.isBlocked) {
      const adminCount = await countActiveAdmins();
      if (adminCount <= 1) {
        throw new AppError("Cannot remove the only active administrator", 400);
      }
    }
    updates.isAdmin = patch.isAdmin;
    revokeSessions = true;
  }

  if (Object.keys(updates).length === 0) {
    return toAdminUserDto(plain);
  }

  await row.update(updates);

  if (revokeSessions) {
    await RefreshToken.destroy({ where: { userId: targetUserId } });
  }

  const updated = row.get({ plain: true }) as UserRow;
  return toAdminUserDto(updated);
}
