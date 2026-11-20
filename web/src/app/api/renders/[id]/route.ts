import { getRender } from "@/lib/data";
import { json, withUser } from "@/lib/api/http";

export const GET = withUser(async (user, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const r = await getRender(user.id, (await ctx.params).id);
  return json({ render: { id: r.id, status: r.status, progress: r.progress, creditsQuoted: r.creditsQuoted, outputKeys: r.outputKeys, errorCode: r.errorCode } });
});
