import type { Request, Response } from "express";
import * as taskService from "./task.service";
import { segment } from "../../utils/route-params";

export async function list(req: Request, res: Response): Promise<void> {
  const tasks = await taskService.listTasks(segment(req.params.projectId), req.user!.id, req.query);
  res.status(200).json({ tasks });
}

export async function create(req: Request, res: Response): Promise<void> {
  const task = await taskService.createTask(req.user!.id, segment(req.params.projectId), req.body);
  res.status(201).json({ task });
}

export async function update(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateTask(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.body,
  );
  res.status(200).json({ task });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await taskService.deleteTask(req.user!.id, segment(req.params.projectId), segment(req.params.taskId));
  res.status(204).send();
}
