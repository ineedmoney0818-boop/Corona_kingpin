import "server-only";
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Fake-mode storage on local disk under .data/files/<userId>/... (Supabase Storage later).
export const FILES_DIR = path.join(process.cwd(), ".data", "files");
export const MAX_BYTES = { image: 20 * 1024 * 1024, video: 500 * 1024 * 1024 } as const;
export const ALLOWED: Record<string, "image" | "video"> = {
  "image/jpeg": "image", "image/png": "image", "image/webp": "image",
  "video/mp4": "video", "video/quicktime": "video", "video/webm": "video",
};
export function keyPath(key: string) {
  const p = path.join(FILES_DIR, key);
  if (!p.startsWith(FILES_DIR + path.sep)) throw new Error("bad_key"); // no path traversal
  return p;
}
export function putFile(key: string, data: Buffer) {
  const p = keyPath(key); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, data);
}
export function readFile(key: string) { const p = keyPath(key); return existsSync(p) ? readFileSync(p) : null; }
export function fileSize(key: string) { const p = keyPath(key); return existsSync(p) ? statSync(p).size : 0; }
