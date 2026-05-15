import type { Request, Response } from "express";
import * as projectService from "./project.service";
import { segment } from "../../utils/route-params";

export async function create(req: Request, res: Response): Promise<void> {
  const project = await projectService.createProject(req.user!.id, req.body);
  res.status(201).json({ project });
}

export async function list(req: Request, res: Response): Promise<void> {
  const projects = await projectService.listProjectsForUser(req.user!.id);
  res.status(200).json({ projects });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const project = await projectService.getProjectForUser(segment(req.params.projectId), req.user!.id);
  res.status(200).json({ project });
}

export async function addMember(req: Request, res: Response): Promise<void> {
  const project = await projectService.addProjectMember(req.user!.id, segment(req.params.projectId), req.body);
  res.status(201).json({ project });
}

export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const project = await projectService.updateProjectMemberRole(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.userId),
    req.body,
  );
  res.status(200).json({ project });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const result = await projectService.removeProjectMember(
    req.user!.id,
    segment(req.params.projectId),
    segment(req.params.userId),
  );

  if ("left" in result && result.left) {
    res.status(200).json({ left: true });
    return;
  }

  res.status(200).json({ project: result });
}
