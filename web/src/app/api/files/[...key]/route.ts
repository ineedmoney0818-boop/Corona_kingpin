import { assetByKey, getRender } from "@/lib/data";
import { contentTypeFor, readFile, signedUrl } from "@/lib/storage";
import { isSupabase } from "@/lib/supabase/env";
import { err, withUser } from "@/lib/api/http";

// Owner-only file access. Supabase: redirect to a short-lived signed URL. Fake mode: stream from disk.
export const GET = withUser(async (user, _req: Request, ctx: { params: Promise<{ key: string[] }> }) => {
  const key = (await ctx.params).key.join("/");
  if (!key.startsWith(`${user.id}/`)) return err(404, "not_found", "We couldn't find that.");
  const parts = key.split("/");
  const owned = parts[1] === "renders" ? await getRender(user.id, parts[2]).then(() => true).catch(() => false) : !!(await assetByKey(user.id, key));
  if (!owned) return err(404, "not_found", "We couldn't find that.");
  if (isSupabase()) {
    const url = await signedUrl(key, 3600);
    return url ? Response.redirect(url, 302) : err(404, "not_found", "We couldn't find that.");
  }
  const data = await readFile(key);
  if (!data) return err(404, "not_found", "We couldn't find that.");
  return new Response(new Uint8Array(data), { headers: { "content-type": contentTypeFor(key), "cache-control": "private, max-age=3600" } });
});
