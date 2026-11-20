import { z } from "zod";
import { assertCanAfford, createIdeasReply, getChat, getQuote, hitRateLimit } from "@/lib/data";
import { makeIdeas } from "@/lib/plan/ideas";
import { PlannerError } from "@/lib/plan";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({
  chatId: z.string().uuid().nullable(),
  prompt: z.string().trim().min(1, "Say what you want ideas for.").max(2000),
  quoteId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(100),
});

// Ideas in chat: answer first, then save both messages and charge in one step. A failed answer costs nothing.
export const POST = withUser(async (user, req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues[0]?.message ?? "Something's missing.");
  const b = parsed.data;
  if (!(await hitRateLimit(`ideas:${user.id}`, 60, 20))) return err(429, "rate_limited", "That's a lot of requests. Wait a minute and try again.");
  const q = await getQuote(user.id, b.quoteId);
  if (q.kind !== "ideas") return err(409, "quote_expired", "That price is for something else. Here's a fresh one.");
  if (b.chatId) await getChat(user.id, b.chatId);
  await assertCanAfford(user.id, q.credits);
  let reply;
  try {
    reply = await makeIdeas(b.prompt);
  } catch (e) {
    if (e instanceof PlannerError) {
      return err(e.code === "refused" ? 422 : 503, `planner_${e.code}`,
        e.code === "refused" ? "I can't help with that one. Try asking differently. Nothing was charged." : "I couldn't come up with ideas just now. Nothing was charged. Try again in a moment.");
    }
    throw e;
  }
  const r = await createIdeasReply(user.id, {
    chatId: b.chatId, title: b.prompt.split("\n")[0].slice(0, 60), prompt: b.prompt,
    reply: reply.intro, ideas: reply.ideas, quoteId: q.id, idempotencyKey: b.idempotencyKey,
  });
  return json(r, r.replayed ? 200 : 201);
});
