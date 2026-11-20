import path from "node:path";
import { getRender } from "@/lib/data";
import { contentTypeFor, readFile, signedUrl } from "@/lib/storage";
import { isSupabase } from "@/lib/supabase/env";
import { err, withUser } from "@/lib/api/http";

export const GET = withUser(async (user, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const r = await getRender(user.id, (await ctx.params).id);
  const i = Number(new URL(req.url).searchParams.get("i") ?? 0);
  const key = r.status === "succeeded" ? r.outputKeys[i] : undefined;
  if (!key) return err(404, "not_ready", "That file isn't ready.");
  const name = `reelplain-${r.id.slice(0, 8)}${r.outputKeys.length > 1 ? `-${i + 1}` : ""}${path.extname(key)}`;
  if (isSupabase()) {
    const url = await signedUrl(key, 300, name);
    return url ? Response.redirect(url, 302) : err(404, "not_ready", "That file isn't ready.");
  }
  const data = await readFile(key);
  if (!data) return err(404, "not_ready", "That file isn't ready.");
  return new Response(new Uint8Array(data), { headers: { "content-type": contentTypeFor(key), "content-disposition": `attachment; filename="${name}"` } });
});
