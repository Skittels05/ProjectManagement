import type { Request, Response } from "express";
import * as sprintService from "./sprint.service";
import { segment } from "../../utils/route-params";

export async function list(req: Request, res: Response): Promise<void> {
  const sprints = await sprintService.listSprints(segment(req.params.projectId), req.user!.id);
  res.status(200).json({ sprints });
}

export async function create(req: Request, res: Response): Promise<void> {
  const sprint = await sprintService.createSprint(req.user!.id, segment(req.params.projectId), req.body);
  res.status(201).json({ sprint });
}

export async function update(req: Request, res: Response): Promise<void> {
  const sprint = await sprintService.updateSprint(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.sprintId),
    req.body,
  );
  res.status(200).json({ sprint });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await sprintService.deleteSprint(req.user!.id, segment(req.params.projectId), segment(req.params.sprintId));
  res.status(204).send();
}
