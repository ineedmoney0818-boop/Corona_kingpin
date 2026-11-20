import { assetByKey, getRender } from "@/lib/data";
import { readFile } from "@/lib/storage";
import { err, withUser } from "@/lib/api/http";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };

// Serves a stored file to its owner only (Supabase: signed URLs).
export const GET = withUser(async (user, _req: Request, ctx: { params: Promise<{ key: string[] }> }) => {
  const key = (await ctx.params).key.join("/");
  if (!key.startsWith(`${user.id}/`)) return err(404, "not_found", "We couldn't find that.");
  const parts = key.split("/");
  const owned = parts[1] === "renders" ? await getRender(user.id, parts[2]).then(() => true).catch(() => false) : !!(await assetByKey(user.id, key));
  const data = owned ? readFile(key) : null;
  if (!data) return err(404, "not_found", "We couldn't find that.");
  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(data), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "private, max-age=3600" } });
});
