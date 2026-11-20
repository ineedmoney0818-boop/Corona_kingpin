import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Plan } from "@/lib/plan/schema";
import { creditsFor, QUOTE_TTL_MS, type PlanId, type QuoteKind } from "@/lib/pricing";
import { adminClient } from "@/lib/supabase/admin";
import { userClient } from "@/lib/supabase/server";
import {
  InsufficientCredits, NotFound,
  type Asset, type Chat, type CreditAccount, type Generation, type LedgerEntry, type Message,
  type Project, type Quote, type Render, type User,
} from "./types";

/**
 * Supabase implementation of the data layer. Same exports and signatures as fake-store.ts.
 * - User-facing reads and writes use the signed-in user's client: RLS applies to every query.
 * - Charging, quotes, worker updates and webhooks use the service role, through the SQL functions
 *   in supabase/migrations (spend/refund/grant are only executable by service_role).
 * - Every function still filters by user id: defence in depth if a policy is ever loosened.
 */

type Row = Record<string, unknown>;
const s = (v: unknown) => v as string;
const n = (v: unknown) => v as number;
function check<T>(r: { data: T; error: PostgrestError | null }, what: string): T {
  if (r.error) {
    if (r.error.message.includes("insufficient_credits")) throw new InsufficientCredits(0, 0);
    if (r.error.message.includes("quote_expired")) throw new Error("quote_expired");
    if (/_not_found/.test(r.error.message) || r.error.code === "PGRST116") throw new NotFound(what);
    throw new Error(`${what}: ${r.error.message}`);
  }
  return r.data;
}

// ---------------------------------------------------------------- mappers
const toAccount = (r: Row): CreditAccount => ({ userId: s(r.user_id), planCredits: n(r.plan_credits), topupCredits: n(r.topup_credits), monthlyGrant: n(r.monthly_grant), nextGrantAt: s(r.next_grant_at) });
const toLedger = (r: Row): LedgerEntry => ({ id: s(r.id), userId: s(r.user_id), kind: r.kind as LedgerEntry["kind"], planDelta: n(r.plan_delta), topupDelta: n(r.topup_delta), renderId: (r.render_id as string) ?? null, ref: (r.stripe_ref as string) ?? null, note: (r.note as string) ?? null, createdAt: s(r.created_at) });
const toProject = (r: Row): Project => ({ id: s(r.id), userId: s(r.user_id), name: s(r.name), createdAt: s(r.created_at), updatedAt: s(r.updated_at) });
const toAsset = (r: Row): Asset => ({
  id: s(r.id), userId: s(r.user_id), projectId: (r.project_id as string) ?? null, kind: r.kind as Asset["kind"], source: r.source as Asset["source"],
  storageKey: s(r.storage_path), fileName: s(r.file_name ?? r.storage_path), mimeType: s(r.mime_type), bytes: n(r.bytes ?? 0),
  width: (r.width as number) ?? null, height: (r.height as number) ?? null, durationMs: (r.duration_ms as number) ?? null,
  status: r.status as Asset["status"], description: (r.description as string) ?? null, createdAt: s(r.created_at),
});
const toChat = (r: Row): Chat => ({ id: s(r.id), userId: s(r.user_id), projectId: (r.project_id as string) ?? null, title: s(r.title), createdAt: s(r.created_at), updatedAt: s(r.updated_at) });
const toMessage = (r: Row): Message => ({ id: s(r.id), chatId: s(r.chat_id), userId: s(r.user_id), role: r.role as Message["role"], content: s(r.content), attachmentIds: (r.attachment_ids as string[]) ?? [], generationId: (r.generation_id as string) ?? null, feedback: (r.feedback as Message["feedback"]) ?? null, createdAt: s(r.created_at), ideas: (r.ideas as Message["ideas"]) ?? null });
const toGeneration = (r: Row): Generation => ({ id: s(r.id), userId: s(r.user_id), chatId: (r.chat_id as string) ?? null, messageId: (r.message_id as string) ?? null, kind: r.kind as Generation["kind"], plan: r.plan as Plan, planVersion: n(r.plan_version), originalOnly: !!r.original_only, createdAt: s(r.created_at), updatedAt: s(r.updated_at) });
const toRender = (r: Row): Render => ({
  id: s(r.id), generationId: s(r.generation_id), userId: s(r.user_id), planVersion: n(r.plan_version), status: r.status as Render["status"],
  creditsQuoted: n(r.credits_quoted), watermark: !!r.watermark, progress: n(r.progress ?? 0), outputKeys: (r.output_paths as string[]) ?? [],
  errorCode: (r.error_code as string) ?? null, errorDetail: (r.error_detail as string) ?? null, idempotencyKey: s(r.idempotency_key),
  startedAt: (r.started_at as string) ?? null, finishedAt: (r.finished_at as string) ?? null, createdAt: s(r.created_at),
});
const toQuote = (r: Row): Quote => ({ id: s(r.id), userId: s(r.user_id), kind: r.kind as QuoteKind, credits: n(r.credits), watermark: !!r.watermark, balanceAfter: 0, expiresAt: s(r.expires_at) });

// ---------------------------------------------------------------- users
export async function getProfile(userId: string, email: string): Promise<User> {
  const db = await userClient();
  const p = check(await db.from("profiles").select("*").eq("id", userId).single(), "profile") as Row;
  return { id: userId, email, displayName: (p.display_name as string) || email.split("@")[0], plan: p.plan as PlanId, createdAt: s(p.created_at) };
}

// ---------------------------------------------------------------- credits
export async function getAccount(userId: string): Promise<CreditAccount> {
  const db = await userClient();
  return toAccount(check(await db.from("credit_accounts").select("*").eq("user_id", userId).single(), "credit account") as Row);
}
export async function listLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const db = await userClient();
  return (check(await db.from("credit_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit), "ledger") as Row[]).map(toLedger);
}
export async function assertCanAfford(userId: string, credits: number) {
  const a = await getAccount(userId);
  if (a.planCredits + a.topupCredits < credits) throw new InsufficientCredits(credits, a.planCredits + a.topupCredits);
}

// ---------------------------------------------------------------- quotes (server-issued; users can only read theirs)
export async function createQuote(userId: string, kind: QuoteKind): Promise<Quote> {
  const [a, profile] = await Promise.all([getAccount(userId), adminClient().from("profiles").select("plan").eq("id", userId).single()]);
  const credits = creditsFor(kind);
  const row = check(await adminClient().from("quotes").insert({
    user_id: userId, kind, credits, watermark: (check(profile, "profile") as Row).plan === "try",
    expires_at: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }).select().single(), "quote") as Row;
  return { ...toQuote(row), balanceAfter: a.planCredits + a.topupCredits - credits };
}
export async function getQuote(userId: string, id: string): Promise<Quote> {
  const db = await userClient();
  const q = toQuote(check(await db.from("quotes").select("*").eq("id", id).eq("user_id", userId).single(), "quote") as Row);
  if (new Date(q.expiresAt).getTime() < Date.now()) throw new Error("quote_expired");
  return q;
}

// ---------------------------------------------------------------- projects and assets
export async function listProjects(userId: string) {
  const db = await userClient();
  return (check(await db.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }), "projects") as Row[]).map(toProject);
}
export async function createProject(userId: string, name: string): Promise<Project> {
  const db = await userClient();
  return toProject(check(await db.from("projects").insert({ user_id: userId, name: name.trim().slice(0, 120) || "Untitled project" }).select().single(), "project") as Row);
}
export async function createAsset(a: Omit<Asset, "id" | "createdAt">): Promise<Asset> {
  const db = await userClient();
  return toAsset(check(await db.from("assets").insert({
    user_id: a.userId, project_id: a.projectId, kind: a.kind, source: a.source, storage_path: a.storageKey, file_name: a.fileName,
    mime_type: a.mimeType, bytes: a.bytes, width: a.width, height: a.height, duration_ms: a.durationMs, status: a.status, description: a.description,
  }).select().single(), "asset") as Row);
}
export async function updateAsset(userId: string, id: string, patch: Partial<Asset>) {
  const db = await userClient();
  const row: Row = {};
  if (patch.status) row.status = patch.status;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  return toAsset(check(await db.from("assets").update(row).eq("id", id).eq("user_id", userId).select().single(), "asset") as Row);
}
export async function getAssets(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const db = await userClient();
  return (check(await db.from("assets").select("*").eq("user_id", userId).in("id", ids), "assets") as Row[]).map(toAsset);
}
export async function listAssets(userId: string, projectId?: string) {
  const db = await userClient();
  let q = db.from("assets").select("*").eq("user_id", userId);
  if (projectId !== undefined) q = q.eq("project_id", projectId);
  return (check(await q.order("created_at", { ascending: false }), "assets") as Row[]).map(toAsset);
}
export async function assetByKey(userId: string, key: string) {
  const db = await userClient();
  const r = await db.from("assets").select("*").eq("user_id", userId).eq("storage_path", key).maybeSingle();
  return r.data ? toAsset(r.data as Row) : null;
}

// ---------------------------------------------------------------- chats and messages
export async function listChats(userId: string) {
  const db = await userClient();
  return (check(await db.from("chats").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100), "chats") as Row[]).map(toChat);
}
export async function getChat(userId: string, id: string) {
  const db = await userClient();
  return toChat(check(await db.from("chats").select("*").eq("id", id).eq("user_id", userId).single(), "chat") as Row);
}
export async function createChat(userId: string, title: string): Promise<Chat> {
  const db = await userClient();
  return toChat(check(await db.from("chats").insert({ user_id: userId, title: title.slice(0, 80) || "New chat" }).select().single(), "chat") as Row);
}
export async function listMessages(userId: string, chatId: string) {
  await getChat(userId, chatId);
  const db = await userClient();
  return (check(await db.from("messages").select("*").eq("chat_id", chatId).eq("user_id", userId).order("created_at"), "messages") as Row[]).map(toMessage);
}
export async function addMessage(userId: string, m: Omit<Message, "id" | "createdAt" | "userId" | "feedback">): Promise<Message> {
  if ((await getAssets(userId, m.attachmentIds)).length !== m.attachmentIds.length) throw new NotFound("attachment");
  const db = await userClient(); // RLS also checks the chat belongs to the user
  const row = check(await db.from("messages").insert({
    chat_id: m.chatId, user_id: userId, role: m.role, content: m.content, attachment_ids: m.attachmentIds, generation_id: m.generationId,
  }).select().single(), "message") as Row;
  await db.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", m.chatId).eq("user_id", userId);
  return toMessage(row);
}
export async function setFeedback(userId: string, messageId: string, feedback: "up" | "down" | null) {
  const db = await userClient();
  check(await db.from("messages").update({ feedback }).eq("id", messageId).eq("user_id", userId).select("id").single(), "message");
}

// ---------------------------------------------------------------- generations and renders
export async function getGeneration(userId: string, id: string) {
  const db = await userClient();
  return toGeneration(check(await db.from("generations").select("*").eq("id", id).eq("user_id", userId).single(), "generation") as Row);
}
export async function listGenerations(userId: string) {
  const db = await userClient();
  return (check(await db.from("generations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200), "generations") as Row[]).map(toGeneration);
}
export async function listRenders(userId: string, generationId: string) {
  const db = await userClient();
  return (check(await db.from("renders").select("*").eq("user_id", userId).eq("generation_id", generationId).order("created_at", { ascending: false }), "renders") as Row[]).map(toRender);
}
export async function getRender(userId: string, id: string) {
  const db = await userClient();
  return toRender(check(await db.from("renders").select("*").eq("id", id).eq("user_id", userId).single(), "render") as Row);
}
export async function latestRenders(userId: string) {
  const db = await userClient();
  const rows = (check(await db.from("renders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500), "renders") as Row[]).map(toRender);
  const out = new Map<string, Render>();
  for (const r of rows) if (!out.has(r.generationId)) out.set(r.generationId, r);
  return out;
}
export async function renderByIdempotencyKey(userId: string, key: string) {
  const db = await userClient();
  const r = await db.from("renders").select("*").eq("user_id", userId).eq("idempotency_key", key).maybeSingle();
  return r.data ? toRender(r.data as Row) : null;
}

/** One transaction in SQL: replay check, quote check, generation + render insert, charge. */
export async function createGenerationAndRender(input: {
  userId: string; chatId: string; messageId: string; kind: "reel" | "carousel"; plan: Plan; quoteId: string; idempotencyKey: string;
}): Promise<{ generation: Generation; render: Render; replayed: boolean }> {
  const before = await getAccount(input.userId);
  const res = await adminClient().rpc("create_generation_and_render", {
    p_user: input.userId, p_chat: input.chatId, p_message: input.messageId, p_kind: input.kind,
    p_plan: input.plan, p_quote: input.quoteId, p_key: input.idempotencyKey,
  });
  if (res.error?.message.includes("insufficient_credits")) {
    const q = await getQuote(input.userId, input.quoteId).catch(() => null);
    throw new InsufficientCredits(q?.credits ?? 0, before.planCredits + before.topupCredits);
  }
  const row = (check(res, "generation") as Row[])[0];
  const generation = await getGeneration(input.userId, s(row.generation_id));
  const render = await getRender(input.userId, s(row.render_id));
  return { generation, render, replayed: !!row.replayed };
}
export async function savePlan(userId: string, generationId: string, plan: Plan, baseVersion: number) {
  const db = await userClient();
  // Optimistic concurrency: only applies if nobody saved a newer version in between.
  const r = await db.from("generations").update({ plan, caption: plan.caption, plan_version: baseVersion + 1 })
    .eq("id", generationId).eq("user_id", userId).eq("plan_version", baseVersion).select().maybeSingle();
  if (r.error) throw new Error(`save plan: ${r.error.message}`);
  if (!r.data) { await getGeneration(userId, generationId); throw new Error("version_conflict"); }
  return toGeneration(r.data as Row);
}
export async function createReRender(userId: string, generationId: string, quoteId: string, idempotencyKey: string) {
  const before = await getAccount(userId);
  const res = await adminClient().rpc("create_rerender", { p_user: userId, p_generation: generationId, p_quote: quoteId, p_key: idempotencyKey });
  if (res.error?.message.includes("insufficient_credits")) throw new InsufficientCredits(1, before.planCredits + before.topupCredits);
  const row = (check(res, "render") as Row[])[0];
  return { render: await getRender(userId, s(row.render_id)), replayed: !!row.replayed };
}

// ---------------------------------------------------------------- worker / system (service role)
export {
  grantMonthly, addTopup, refundRender,
  updateRenderSystem, failRenderSystem, claimNextRender, reapStuckRenders, stuckRenders,
  getGenerationSystem, getAssetsSystem, logJobFailure, hitRateLimit,
} from "./supabase-system";

/** Cleanup for a request that lost an idempotency race: remove the chat/message it created. */
export async function discardMessage(userId: string, messageId: string, chatId: string | null) {
  const db = await userClient();
  await db.from("messages").delete().eq("id", messageId).eq("user_id", userId);
  if (chatId) await db.from("chats").delete().eq("id", chatId).eq("user_id", userId);
}

/** Ideas reply: both messages and the charge in one SQL transaction (create_ideas_reply). */
export async function createIdeasReply(userId: string, i: { chatId: string | null; title: string; prompt: string; reply: string; ideas: NonNullable<Message["ideas"]>; quoteId: string; idempotencyKey: string }) {
  const before = await getAccount(userId);
  const res = await adminClient().rpc("create_ideas_reply", {
    p_user: userId, p_chat: i.chatId, p_title: i.title, p_prompt: i.prompt, p_reply: i.reply, p_ideas: i.ideas, p_quote: i.quoteId, p_key: i.idempotencyKey,
  });
  if (res.error?.message.includes("insufficient_credits")) throw new InsufficientCredits(1, before.planCredits + before.topupCredits);
  const row = (check(res, "ideas") as Row[])[0];
  return { chatId: s(row.chat_id), messageId: s(row.message_id), replayed: !!row.replayed };
}
