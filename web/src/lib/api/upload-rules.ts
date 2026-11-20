import path from "node:path";
import { randomUUID } from "node:crypto";
import { ALLOWED, MAX_BYTES } from "@/lib/storage";

const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;
/** Same checks for both upload paths. Returns a storage key in the user's own folder, or an error message. */
export function checkUpload(userId: string, name: string, type: string, size: number): { key: string; kind: "image" | "video" } | { status: number; code: string; message: string } {
  const kind = ALLOWED[type];
  if (!kind) return { status: 415, code: "unsupported_type", message: "Use a JPG, PNG or WebP photo, or an MP4, MOV or WebM video." };
  if (size > MAX_BYTES[kind]) return { status: 413, code: "too_large", message: `That's over ${mb(MAX_BYTES[kind])}. Trim it or pick a smaller file.` };
  if (size <= 0) return { status: 400, code: "empty", message: "That file is empty." };
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "") || (kind === "image" ? ".jpg" : ".mp4");
  return { key: `${userId}/uploads/${randomUUID()}${ext}`, kind };
}
