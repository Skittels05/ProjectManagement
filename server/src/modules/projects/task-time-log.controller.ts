import type { Request, Response } from "express";
import * as service from "./task-time-log.service";
import { segment } from "../../utils/route-params";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await service.listTimeLogs(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
  );
  res.status(200).json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const timeLog = await service.createTimeLog(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
    req.body,
  );
  res.status(201).json({ timeLog });
}

export async function update(req: Request, res: Response): Promise<void> {
  const timeLog = await service.updateTimeLog(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.timeLogId),
    req.user!.id,
    req.body,
  );
  res.status(200).json({ timeLog });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteTimeLog(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.timeLogId),
    req.user!.id,
  );
  res.status(204).send();
}
