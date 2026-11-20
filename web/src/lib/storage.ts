import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { isSupabase, MEDIA_BUCKET } from "./supabase/env";
import { adminClient } from "./supabase/admin";

// File storage: local disk in fake mode, Supabase Storage (private bucket "media") otherwise.
// Keys always start with the owner's user id: "<userId>/uploads/..." or "<userId>/renders/...".
export const FILES_DIR = path.join(process.cwd(), ".data", "files");
export const MAX_BYTES = { image: 20 * 1024 * 1024, video: 500 * 1024 * 1024 } as const;
export const ALLOWED: Record<string, "image" | "video"> = {
  "image/jpeg": "image", "image/png": "image", "image/webp": "image",
  "video/mp4": "video", "video/quicktime": "video", "video/webm": "video",
};
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
export const contentTypeFor = (key: string) => TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";

function localPath(key: string) {
  const p = path.join(FILES_DIR, key);
  if (!p.startsWith(FILES_DIR + path.sep)) throw new Error("bad_key"); // no path traversal
  return p;
}

export async function putFile(key: string, data: Buffer, contentType = contentTypeFor(key)) {
  if (!isSupabase()) { const p = localPath(key); mkdirSync(path.dirname(p), { recursive: true }); writeFileSync(p, data); return; }
  const { error } = await adminClient().storage.from(MEDIA_BUCKET).upload(key, data, { contentType, upsert: false });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export async function readFile(key: string): Promise<Buffer | null> {
  if (!isSupabase()) { const p = localPath(key); return existsSync(p) ? readFileSync(p) : null; }
  const { data, error } = await adminClient().storage.from(MEDIA_BUCKET).download(key);
  return error || !data ? null : Buffer.from(await data.arrayBuffer());
}

/** A short-lived URL the owner's browser can load directly (Supabase); null in fake mode. */
export async function signedUrl(key: string, seconds = 3600, downloadName?: string): Promise<string | null> {
  if (!isSupabase()) return null;
  const { data, error } = await adminClient().storage.from(MEDIA_BUCKET).createSignedUrl(key, seconds, downloadName ? { download: downloadName } : undefined);
  return error ? null : data.signedUrl;
}

/** Copies a stored file to a local temp path (ffmpeg and the renderer need real files). Caller removes the dir. */
export async function toLocalFile(key: string): Promise<{ file: string; cleanup: () => Promise<void> }> {
  if (!isSupabase()) return { file: localPath(key), cleanup: async () => {} };
  const data = await readFile(key);
  if (!data) throw new Error("file_missing");
  const dir = await mkdtemp(path.join(tmpdir(), "rp-file-"));
  const file = path.join(dir, path.basename(key));
  await writeFile(file, data);
  return { file, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export async function deleteUserFiles(userId: string) {
  if (!isSupabase()) { const p = localPath(`${userId}/x`); await rm(path.dirname(p), { recursive: true, force: true }); return; }
  const bucket = adminClient().storage.from(MEDIA_BUCKET);
  for (const folder of ["uploads", "renders"]) {
    // renders are nested one level deeper (<user>/renders/<renderId>/<file>)
    const { data } = await bucket.list(`${userId}/${folder}`, { limit: 1000 });
    const paths: string[] = [];
    for (const o of data ?? []) {
      if (o.id) paths.push(`${userId}/${folder}/${o.name}`);
      else { const { data: inner } = await bucket.list(`${userId}/${folder}/${o.name}`, { limit: 1000 }); for (const i of inner ?? []) paths.push(`${userId}/${folder}/${o.name}/${i.name}`); }
    }
    for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
  }
}
