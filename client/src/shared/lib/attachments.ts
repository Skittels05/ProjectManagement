const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "avif"]);

export function isImageAttachment(mimeType: string | null, filename: string): boolean {
  if (mimeType?.startsWith("image/")) {
    return true;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}
