import { z } from "zod";
import { setFeedback } from "@/lib/data";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ feedback: z.enum(["up", "down"]).nullable() });
export const PATCH = withUser(async (user, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Unknown feedback.");
  await setFeedback(user.id, (await ctx.params).id, b.data.feedback);
  return json({ ok: true });
});
