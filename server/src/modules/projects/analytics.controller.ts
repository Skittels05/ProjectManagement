import type { Request, Response } from "express";
import { segment } from "../../utils/route-params";
import * as activityService from "./activity.service";
import * as analyticsService from "./analytics.service";

export async function sprintStats(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSprintStats(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.sprintId),
  );
  res.json(data);
}

export async function sprintBurndown(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSprintBurndown(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.sprintId),
  );
  res.json(data);
}

export async function sprintScatter(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getSprintScatter(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.sprintId),
  );
  res.json(data);
}

export async function teamVelocity(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getTeamVelocity(req.user!.id, segment(req.params.projectId));
  res.json(data);
}

export async function timeLogReport(req: Request, res: Response): Promise<void> {
  const data = await analyticsService.getTimeLogReport(req.user!.id, segment(req.params.projectId), {
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    memberId: req.query.userId as string | undefined,
    sprintId: req.query.sprintId as string | undefined,
  });
  res.json(data);
}

export async function listActivity(req: Request, res: Response): Promise<void> {
  const data = await activityService.listActivity(req.user!.id, segment(req.params.projectId), {
    limit: req.query.limit as unknown as number,
    offset: req.query.offset as unknown as number,
  });
  res.json(data);
}
