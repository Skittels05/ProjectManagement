import type { Request, Response } from "express";
import * as adminService from "./admin.service";
import { segment } from "../../utils/route-params";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const data = await adminService.listUsers(req.query);
  res.status(200).json(data);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const patch: { isBlocked?: boolean; isAdmin?: boolean } = {};
  if (req.body.isBlocked !== undefined) {
    patch.isBlocked = Boolean(req.body.isBlocked);
  }
  if (req.body.isAdmin !== undefined) {
    patch.isAdmin = Boolean(req.body.isAdmin);
  }

  const data = await adminService.updateUser(req.user!.id, segment(req.params.userId), patch);
  res.status(200).json(data);
}
