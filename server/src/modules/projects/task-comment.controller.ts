import type { Request, Response } from "express";
import * as service from "./task-comment.service";
import { segment } from "../../utils/route-params";

export async function list(req: Request, res: Response): Promise<void> {
  const comments = await service.listComments(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
  );
  res.status(200).json({ comments });
}

export async function create(req: Request, res: Response): Promise<void> {
  const comment = await service.createComment(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
    req.body,
  );
  res.status(201).json({ comment });
}

export async function update(req: Request, res: Response): Promise<void> {
  const comment = await service.updateComment(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.commentId),
    req.user!.id,
    req.body,
  );
  res.status(200).json({ comment });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteComment(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.commentId),
    req.user!.id,
  );
  res.status(204).send();
}
