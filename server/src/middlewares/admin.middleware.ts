import type { NextFunction, Request, Response } from "express";
import { User } from "../models";
import { AppError } from "../utils/app-error";

export async function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.isAdmin) {
    next(new AppError("Admin access required", 403));
    return;
  }

  const row = await User.findByPk(req.user.id, { attributes: ["id", "isAdmin", "isBlocked"] });

  if (!row || row.get("isBlocked") || !row.get("isAdmin")) {
    next(new AppError("Admin access required", 403));
    return;
  }

  next();
}
