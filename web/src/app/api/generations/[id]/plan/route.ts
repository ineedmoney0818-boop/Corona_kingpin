import { z } from "zod";
import { getAssets, savePlan } from "@/lib/data";
import { Plan } from "@/lib/plan/schema";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ plan: Plan, baseVersion: z.number().int().min(1) });
// Saving edits is free. Only rendering costs credits.
export const PUT = withUser(async (user, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Some of those edits aren't valid: " + (b.error.issues[0]?.message ?? ""));
  const ids = b.data.plan.scenes.map((s) => s.background.assetId).filter((x): x is string => !!x);
  if ((await getAssets(user.id, ids)).length !== new Set(ids).size) return err(404, "not_found", "One of those files isn't yours or is gone.");
  const gen = await savePlan(user.id, (await ctx.params).id, b.data.plan, b.data.baseVersion);
  return json({ generation: { id: gen.id, planVersion: gen.planVersion } });
});
