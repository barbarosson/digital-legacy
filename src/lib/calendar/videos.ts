import fs from "node:fs";
import path from "node:path";
import { VIDEOS_DIR } from "@/lib/paths";

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
};

export function ensureVideosDir() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
}

export function getVideoPath(entryId: number, mimeType: string): string {
  const ext = EXT_BY_MIME[mimeType] ?? ".mp4";
  return path.join(VIDEOS_DIR, `${entryId}${ext}`);
}

export function findVideoPath(entryId: number): string | null {
  ensureVideosDir();
  const prefix = `${entryId}.`;
  const match = fs
    .readdirSync(VIDEOS_DIR)
    .find(
      (name) => name.startsWith(prefix) && !name.startsWith(`${entryId}.thumb`),
    );
  return match ? path.join(VIDEOS_DIR, match) : null;
}

export function getThumbnailPath(entryId: number): string {
  return path.join(VIDEOS_DIR, `${entryId}.thumb.jpg`);
}

export function findThumbnailPath(entryId: number): string | null {
  ensureVideosDir();
  const target = getThumbnailPath(entryId);
  return fs.existsSync(target) ? target : null;
}

export async function saveThumbnailFile(
  entryId: number,
  dataUrl: string,
): Promise<string | null> {
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  ensureVideosDir();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) return null;

  const target = getThumbnailPath(entryId);
  fs.writeFileSync(target, buffer);
  return path.basename(target);
}

export function deleteThumbnailFile(entryId: number) {
  const existing = findThumbnailPath(entryId);
  if (existing && fs.existsSync(existing)) {
    fs.unlinkSync(existing);
  }
}

export async function saveVideoFile(
  entryId: number,
  file: File,
): Promise<{ fileName: string; mimeType: string }> {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    throw new Error("Supported formats: MP4, WebM, MOV, AVI.");
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be 200 MB or smaller.");
  }

  ensureVideosDir();
  deleteVideoFile(entryId);

  const mimeType = file.type;
  const targetPath = getVideoPath(entryId, mimeType);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);

  return {
    fileName: path.basename(targetPath),
    mimeType,
  };
}

export function deleteVideoFile(entryId: number) {
  const existing = findVideoPath(entryId);
  if (existing && fs.existsSync(existing)) {
    fs.unlinkSync(existing);
  }
  deleteThumbnailFile(entryId);
}

export function validateEntryDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
