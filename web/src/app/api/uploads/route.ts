import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createAsset } from "@/lib/data";
import { ALLOWED, MAX_BYTES, keyPath, putFile } from "@/lib/storage";
import { err, json, withUser } from "@/lib/api/http";

const run = promisify(execFile);
const mb = (n: number) => `${Math.round(n / 1024 / 1024)} MB`;

async function probe(file: string) {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]);
    const j = JSON.parse(stdout);
    return { width: j.streams?.[0]?.width ?? null, height: j.streams?.[0]?.height ?? null, durationMs: j.format?.duration ? Math.round(Number(j.format.duration) * 1000) : null };
  } catch { return null; }
}

// Fake-mode upload: the file comes straight to this route. With Supabase it becomes a signed upload URL.
export const POST = withUser(async (user, req: Request) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return err(400, "no_file", "Pick a file to upload.");
  const kind = ALLOWED[file.type];
  if (!kind) return err(415, "unsupported_type", "Use a JPG, PNG or WebP photo, or an MP4, MOV or WebM video.");
  if (file.size > MAX_BYTES[kind]) return err(413, "too_large", `That's over ${mb(MAX_BYTES[kind])}. Trim it or pick a smaller file.`);
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || (kind === "image" ? ".jpg" : ".mp4");
  const key = `${user.id}/uploads/${randomUUID()}${ext}`;
  putFile(key, Buffer.from(await file.arrayBuffer()));
  const meta = await probe(keyPath(key));
  if (!meta) return err(422, "unreadable", "We couldn't read that file. Try exporting it again.");
  const asset = await createAsset({
    userId: user.id, projectId: null, kind, source: "upload", storageKey: key, fileName: file.name.slice(0, 200),
    mimeType: file.type, bytes: file.size, width: meta.width, height: meta.height,
    durationMs: kind === "video" ? meta.durationMs : null, status: "ready", description: null,
  });
  return json({ asset });
});
