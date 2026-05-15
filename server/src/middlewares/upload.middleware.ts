import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/app-error";
import { MAX_UPLOAD_BYTES, uploadsRoot, ensureUploadsRoot } from "../config/uploads";

ensureUploadsRoot();

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const projectId = String(req.params.projectId ?? "");
    const taskId = String(req.params.taskId ?? "");
    const dir = path.join(uploadsRoot, projectId, taskId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200) || "file";
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const taskAttachmentUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

export function handleTaskAttachmentUpload(req: Request, res: Response, next: NextFunction): void {
  taskAttachmentUpload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new AppError("File is too large (max 10 MB)", 400));
        return;
      }
      next(new AppError(err.message, 400));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}
