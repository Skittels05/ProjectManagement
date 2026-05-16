import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/vnd.",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
];

export const uploadsRoot = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
);

export function ensureUploadsRoot(): void {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

export function sanitizeOriginalFilename(name: string): string {
  const base = path.basename(String(name).trim()).replace(/[^\w.\- ()[\]]+/g, "_");
  return base.slice(0, 500) || "file";
}

export function isAllowedMimeType(mime: string | undefined): boolean {
  if (!mime || mime === "application/octet-stream") {
    return true;
  }
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export function buildStorageKey(projectId: string, taskId: string, originalFilename: string): string {
  const safe = sanitizeOriginalFilename(originalFilename);
  return path.join(projectId, taskId, `${randomUUID()}-${safe}`);
}

export function absolutePathForStorageKey(storageKey: string): string {
  const resolved = path.resolve(uploadsRoot, storageKey);
  if (!resolved.startsWith(uploadsRoot)) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export function deleteStoredFile(storageKey: string): void {
  try {
    const abs = absolutePathForStorageKey(storageKey);
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
    }
  } catch {
  }
}
