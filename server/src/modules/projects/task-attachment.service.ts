import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { TaskAttachment, User } from "../../models";
import {
  absolutePathForStorageKey,
  deleteStoredFile,
  isAllowedMimeType,
  sanitizeOriginalFilename,
  uploadsRoot,
} from "../../config/uploads";
import { AppError } from "../../utils/app-error";
import { isUuidV4 } from "../../utils/uuid";
import { assertTaskInProject } from "./task-access";

function toUserMini(u: { id: string; email: string; fullName: string } | null | undefined) {
  if (!u) return null;
  return { id: u.id, email: u.email, fullName: u.fullName };
}

function toAttachmentDto(row: {
  id: string;
  taskId: string;
  uploadedBy: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt?: Date;
  uploader?: { id: string; email: string; fullName: string };
}) {
  return {
    id: row.id,
    taskId: row.taskId,
    uploadedBy: row.uploadedBy,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    uploader: toUserMini(row.uploader),
  };
}

const uploaderInclude = {
  model: User,
  as: "uploader",
  attributes: ["id", "email", "fullName"],
};

export async function listAttachments(projectId: string, taskId: string, userId: string) {
  await assertTaskInProject(projectId, taskId, userId);

  const rows = await TaskAttachment.findAll({
    where: { taskId },
    include: [uploaderInclude],
    order: [["created_at", "DESC"]],
  });

  return rows.map((r) =>
    toAttachmentDto(r.get({ plain: true }) as Parameters<typeof toAttachmentDto>[0]),
  );
}

export async function createAttachment(
  projectId: string,
  taskId: string,
  userId: string,
  file: Express.Multer.File,
) {
  await assertTaskInProject(projectId, taskId, userId);

  if (!file) {
    throw new AppError("File is required", 400);
  }

  if (!isAllowedMimeType(file.mimetype)) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // ignore cleanup errors
    }
    throw new AppError("File type is not allowed", 400);
  }

  const storageKey = path.relative(uploadsRoot, file.path).replace(/\\/g, "/");
  const originalFilename = sanitizeOriginalFilename(file.originalname);

  const row = await TaskAttachment.create({
    taskId,
    uploadedBy: userId,
    originalFilename,
    storageKey,
    mimeType: file.mimetype || null,
    sizeBytes: file.size,
  });

  await row.reload({ include: [uploaderInclude] });
  return toAttachmentDto(row.get({ plain: true }) as Parameters<typeof toAttachmentDto>[0]);
}

export async function getAttachmentFile(
  projectId: string,
  taskId: string,
  attachmentId: string,
  userId: string,
) {
  if (!isUuidV4(attachmentId)) {
    throw new AppError("Attachment not found", 404);
  }
  await assertTaskInProject(projectId, taskId, userId);

  const row = await TaskAttachment.findOne({ where: { id: attachmentId, taskId } });
  if (!row) {
    throw new AppError("Attachment not found", 404);
  }

  const storageKey = String(row.get("storageKey"));
  const abs = absolutePathForStorageKey(storageKey);

  return {
    path: abs,
    originalFilename: String(row.get("originalFilename")),
    mimeType: (row.get("mimeType") as string | null) ?? "application/octet-stream",
  };
}

export async function deleteAttachment(
  projectId: string,
  taskId: string,
  attachmentId: string,
  userId: string,
): Promise<{ ok: true }> {
  if (!isUuidV4(attachmentId)) {
    throw new AppError("Attachment not found", 404);
  }
  await assertTaskInProject(projectId, taskId, userId);

  const row = await TaskAttachment.findOne({ where: { id: attachmentId, taskId } });
  if (!row) {
    throw new AppError("Attachment not found", 404);
  }

  const storageKey = String(row.get("storageKey"));
  await row.destroy();
  deleteStoredFile(storageKey);
  return { ok: true };
}
