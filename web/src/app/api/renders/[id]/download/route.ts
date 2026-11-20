import path from "node:path";
import { getRender } from "@/lib/data";
import { readFile } from "@/lib/storage";
import { err, withUser } from "@/lib/api/http";

export const GET = withUser(async (user, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const r = await getRender(user.id, (await ctx.params).id);
  const i = Number(new URL(req.url).searchParams.get("i") ?? 0);
  const key = r.status === "succeeded" ? r.outputKeys[i] : undefined;
  const data = key ? readFile(key) : null;
  if (!data) return err(404, "not_ready", "That file isn't ready.");
  const name = `reelplain-${r.id.slice(0, 8)}${r.outputKeys.length > 1 ? `-${i + 1}` : ""}${path.extname(key!)}`;
  return new Response(new Uint8Array(data), { headers: { "content-type": key!.endsWith(".mp4") ? "video/mp4" : "image/png", "content-disposition": `attachment; filename="${name}"` } });
});
