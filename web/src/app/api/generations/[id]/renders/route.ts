import { z } from "zod";
import { createReRender, getQuote } from "@/lib/data";
import { enqueueRender } from "@/lib/render/runner";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ quoteId: z.string().uuid(), idempotencyKey: z.string().min(8).max(100) });
export const POST = withUser(async (user, req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Something's missing.");
  const q = await getQuote(user.id, b.data.quoteId);
  if (q.kind !== "re-render") return err(409, "quote_expired", "That price is for something else. Here's a fresh one.");
  const { render, replayed } = await createReRender(user.id, (await ctx.params).id, q.id, b.data.idempotencyKey);
  if (!replayed) enqueueRender();
  return json({ renderId: render.id }, replayed ? 200 : 201);
});
