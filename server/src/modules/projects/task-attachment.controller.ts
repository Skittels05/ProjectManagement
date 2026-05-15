import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import * as service from "./task-attachment.service";
import { segment } from "../../utils/route-params";

export async function list(req: Request, res: Response): Promise<void> {
  const attachments = await service.listAttachments(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
  );
  res.status(200).json({ attachments });
}

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }
  const attachment = await service.createAttachment(
    segment(req.params.projectId),
    segment(req.params.taskId),
    req.user!.id,
    req.file,
  );
  res.status(201).json({ attachment });
}

export async function download(req: Request, res: Response): Promise<void> {
  const file = await service.getAttachmentFile(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.attachmentId),
    req.user!.id,
  );
  const isImage = file.mimeType.startsWith("image/");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `${isImage ? "inline" : "attachment"}; filename="${encodeURIComponent(file.originalFilename)}"`,
  );
  res.sendFile(file.path);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await service.deleteAttachment(
    segment(req.params.projectId),
    segment(req.params.taskId),
    segment(req.params.attachmentId),
    req.user!.id,
  );
  res.status(204).send();
}
