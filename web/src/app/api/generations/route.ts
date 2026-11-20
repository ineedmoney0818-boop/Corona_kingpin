import { z } from "zod";
import { addMessage, assertCanAfford, createChat, createGenerationAndRender, getAssets, getChat, getGeneration, getQuote, renderByIdempotencyKey } from "@/lib/data";
import { fakePlan } from "@/lib/plan/fake-planner";
import { enqueueRender } from "@/lib/render/runner";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({
  chatId: z.string().uuid().nullable(),
  prompt: z.string().trim().min(1, "Say what you want to make.").max(2000),
  attachmentIds: z.array(z.string().uuid()).max(12),
  kind: z.enum(["reel", "carousel"]),
  quoteId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(100),
});

// Confirm and generate: user message -> plan -> charge -> assistant message -> queue render.
// Charging happens before rendering; every failure after that is refunded by the runner.
export const POST = withUser(async (user, req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues[0]?.message ?? "Something's missing.");
  const b = parsed.data;
  const prior = await renderByIdempotencyKey(user.id, b.idempotencyKey); // double tap: return the first one, charge nothing
  if (prior) return json({ generationId: prior.generationId, renderId: prior.id, chatId: (await getGeneration(user.id, prior.generationId)).chatId }, 200);
  const q = await getQuote(user.id, b.quoteId);
  if (q.kind !== (b.kind === "reel" ? "new-reel" : "new-carousel")) return err(409, "quote_expired", "That price is for something else. Here's a fresh one.");
  const assets = await getAssets(user.id, b.attachmentIds);
  if (assets.length !== b.attachmentIds.length) return err(404, "not_found", "One of those files isn't yours or is gone.");
  if (b.kind === "carousel" && assets.some((a) => a.kind === "video")) return err(400, "bad_request", "Carousels use photos. Remove the videos, or make a reel instead.");

  await assertCanAfford(user.id, q.credits); // before writing anything
  const chat = b.chatId ? await getChat(user.id, b.chatId) : await createChat(user.id, b.prompt.split("\n")[0].slice(0, 60));
  const userMsg = await addMessage(user.id, { chatId: chat.id, role: "user", content: b.prompt, attachmentIds: b.attachmentIds, generationId: null });
  const plan = fakePlan(b.prompt, assets, b.kind);
  const { generation, render, replayed } = await createGenerationAndRender({
    userId: user.id, chatId: chat.id, messageId: userMsg.id, kind: b.kind, plan, quoteId: q.id, idempotencyKey: b.idempotencyKey,
  });
  if (!replayed) {
    const n = plan.scenes.length;
    await addMessage(user.id, {
      chatId: chat.id, role: "assistant", attachmentIds: [], generationId: generation.id,
      content: `Here's the plan: ${n} ${b.kind === "reel" ? "scene" : "slide"}${n === 1 ? "" : "s"}, starting with "${plan.hook}". Rendering now.`,
    });
    enqueueRender(render.id);
  }
  return json({ chatId: chat.id, generationId: generation.id, renderId: render.id }, replayed ? 200 : 201);
});
