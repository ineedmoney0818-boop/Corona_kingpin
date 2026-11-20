import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plan } from "@/lib/plan/schema";
import { creditsFor, PLAN_GRANTS, QUOTE_TTL_MS, type QuoteKind } from "@/lib/pricing";
import {
  InsufficientCredits, NotFound,
  type Asset, type Chat, type CreditAccount, type Generation, type LedgerEntry, type Message,
  type Project, type Quote, type Render, type User,
} from "./types";

/**
 * Fake data layer for local development. Same function signatures the Supabase layer will have
 * (replica-backend swaps it in; no screen code changes).
 *
 * Rules mirrored from replica/schema.sql, which is the source of truth:
 *  - every read and write is scoped to the owner (RLS equivalent);
 *  - spend once per render, refund once per render, refund returns to the same buckets;
 *  - balances never go negative; one render per idempotency key; grants unique per ref.
 * State lives in memory and is saved to .data/db.json so a dev-server restart keeps it.
 */

type Db = {
  users: User[]; credentials: { email: string; passwordHash: string; userId: string }[];
  sessions: { token: string; userId: string; createdAt: string }[];
  accounts: CreditAccount[]; ledger: LedgerEntry[]; projects: Project[]; assets: Asset[];
  chats: Chat[]; messages: Message[]; generations: Generation[]; renders: Render[]; quotes: Quote[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const empty = (): Db => ({ users: [], credentials: [], sessions: [], accounts: [], ledger: [], projects: [], assets: [], chats: [], messages: [], generations: [], renders: [], quotes: [] });

const g = globalThis as unknown as { __reelplainDb?: Db };
function db(): Db {
  if (!g.__reelplainDb) {
    g.__reelplainDb = existsSync(DB_FILE) ? { ...empty(), ...JSON.parse(readFileSync(DB_FILE, "utf8")) } : empty();
  }
  return g.__reelplainDb!;
}
let saveTimer: NodeJS.Timeout | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DB_FILE, JSON.stringify(db()));
  }, 50);
}
const now = () => new Date().toISOString();
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

// ---------------------------------------------------------------- users and sessions
export async function createUser(email: string, passwordHash: string, displayName: string): Promise<User> {
  const d = db();
  const e = email.trim().toLowerCase();
  if (d.credentials.some((c) => c.email === e)) throw new Error("email_taken");
  const user: User = { id: randomUUID(), email: e, displayName, plan: "try", createdAt: now() };
  d.users.push(user);
  d.credentials.push({ email: e, passwordHash, userId: user.id });
  d.accounts.push({ userId: user.id, planCredits: 0, topupCredits: 0, monthlyGrant: PLAN_GRANTS.try, nextGrantAt: now() });
  grantMonthly(user.id, PLAN_GRANTS.try, `signup-${user.id}`);
  save();
  return user;
}
export async function findCredential(email: string) {
  return db().credentials.find((c) => c.email === email.trim().toLowerCase()) ?? null;
}
export async function createSession(userId: string): Promise<string> {
  const token = randomUUID() + randomUUID();
  db().sessions.push({ token, userId, createdAt: now() });
  save();
  return token;
}
export async function deleteSession(token: string) {
  const d = db(); d.sessions = d.sessions.filter((s) => s.token !== token); save();
}
export async function userForSession(token: string): Promise<User | null> {
  const s = db().sessions.find((x) => x.token === token);
  return s ? db().users.find((u) => u.id === s.userId) ?? null : null;
}

// ---------------------------------------------------------------- credits (mirror schema.sql functions)
export async function getAccount(userId: string): Promise<CreditAccount> {
  const a = db().accounts.find((x) => x.userId === userId);
  if (!a) throw new NotFound("credit account");
  return { ...a };
}
export async function listLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  return db().ledger.filter((l) => l.userId === userId).sort(byNewest).slice(0, limit);
}
function ledger(e: Omit<LedgerEntry, "id" | "createdAt">) {
  db().ledger.push({ ...e, id: randomUUID(), createdAt: now() });
}
/** grant_monthly_credits: new plan balance = min(left over, one grant) + grant. Idempotent per ref. */
export function grantMonthly(userId: string, grant: number, ref: string) {
  const d = db();
  const a = d.accounts.find((x) => x.userId === userId)!;
  if (d.ledger.some((l) => l.ref === ref && l.kind === "grant")) return;
  const trimmed = Math.max(a.planCredits - a.monthlyGrant, 0);
  if (trimmed > 0) ledger({ userId, kind: "rollover_trim", planDelta: -trimmed, topupDelta: 0, renderId: null, ref, note: null });
  ledger({ userId, kind: "grant", planDelta: grant, topupDelta: 0, renderId: null, ref, note: null });
  a.planCredits = a.planCredits - trimmed + grant;
  a.monthlyGrant = grant;
  a.nextGrantAt = new Date(Date.now() + 30 * 864e5).toISOString();
  save();
}
/** spend_credits: plan bucket first, then top-ups. Throws if short. Once per render. */
function spend(render: Render) {
  const d = db();
  if (d.ledger.some((l) => l.renderId === render.id && l.kind === "spend")) throw new Error("already_spent");
  const a = d.accounts.find((x) => x.userId === render.userId)!;
  const total = a.planCredits + a.topupCredits;
  if (total < render.creditsQuoted) throw new InsufficientCredits(render.creditsQuoted, total);
  const fromPlan = Math.min(a.planCredits, render.creditsQuoted);
  const fromTopup = render.creditsQuoted - fromPlan;
  a.planCredits -= fromPlan; a.topupCredits -= fromTopup;
  ledger({ userId: render.userId, kind: "spend", planDelta: -fromPlan, topupDelta: -fromTopup, renderId: render.id, ref: null, note: null });
}
/** refund_render: returns exactly what that render took, to the same buckets. Idempotent. */
export async function refundRender(renderId: string, note: string): Promise<boolean> {
  const d = db();
  const s = d.ledger.find((l) => l.renderId === renderId && l.kind === "spend");
  if (!s) return false;
  if (d.ledger.some((l) => l.renderId === renderId && l.kind === "refund")) return false;
  const a = d.accounts.find((x) => x.userId === s.userId)!;
  a.planCredits -= s.planDelta; a.topupCredits -= s.topupDelta;
  ledger({ userId: s.userId, kind: "refund", planDelta: -s.planDelta, topupDelta: -s.topupDelta, renderId, ref: null, note });
  save();
  return true;
}

// ---------------------------------------------------------------- quotes
export async function createQuote(userId: string, kind: QuoteKind): Promise<Quote> {
  const a = await getAccount(userId);
  const user = db().users.find((u) => u.id === userId)!;
  const credits = creditsFor(kind);
  const q: Quote = {
    id: randomUUID(), userId, kind, credits, watermark: user.plan === "try",
    balanceAfter: a.planCredits + a.topupCredits - credits, expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  };
  db().quotes.push(q); save();
  return q;
}
export async function getQuote(userId: string, id: string): Promise<Quote> {
  const q = db().quotes.find((x) => x.id === id && x.userId === userId);
  if (!q) throw new NotFound("quote");
  if (new Date(q.expiresAt).getTime() < Date.now()) throw new Error("quote_expired");
  return q;
}

// ---------------------------------------------------------------- projects and assets
export async function listProjects(userId: string) { return db().projects.filter((p) => p.userId === userId).sort(byNewest); }
export async function createProject(userId: string, name: string): Promise<Project> {
  const p: Project = { id: randomUUID(), userId, name: name.trim().slice(0, 120) || "Untitled project", createdAt: now(), updatedAt: now() };
  db().projects.push(p); save(); return p;
}
export async function createAsset(a: Omit<Asset, "id" | "createdAt">): Promise<Asset> {
  if (a.projectId && !db().projects.some((p) => p.id === a.projectId && p.userId === a.userId)) throw new NotFound("project");
  const asset: Asset = { ...a, id: randomUUID(), createdAt: now() };
  db().assets.push(asset); save(); return asset;
}
export async function updateAsset(userId: string, id: string, patch: Partial<Asset>) {
  const a = db().assets.find((x) => x.id === id && x.userId === userId);
  if (!a) throw new NotFound("asset");
  Object.assign(a, patch, { id: a.id, userId: a.userId }); save(); return { ...a };
}
export async function getAssets(userId: string, ids: string[]) { return db().assets.filter((a) => a.userId === userId && ids.includes(a.id)); }
export async function listAssets(userId: string, projectId?: string) {
  return db().assets.filter((a) => a.userId === userId && (projectId === undefined || a.projectId === projectId)).sort(byNewest);
}
/** Lookup used by the file route: returns the asset only to its owner. */
export async function assetByKey(userId: string, key: string) { return db().assets.find((a) => a.storageKey === key && a.userId === userId) ?? null; }

// ---------------------------------------------------------------- chats and messages
export async function listChats(userId: string) { return db().chats.filter((c) => c.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export async function getChat(userId: string, id: string) {
  const c = db().chats.find((x) => x.id === id && x.userId === userId);
  if (!c) throw new NotFound("chat");
  return c;
}
export async function createChat(userId: string, title: string): Promise<Chat> {
  const c: Chat = { id: randomUUID(), userId, projectId: null, title: title.slice(0, 80) || "New chat", createdAt: now(), updatedAt: now() };
  db().chats.push(c); save(); return c;
}
export async function listMessages(userId: string, chatId: string) {
  await getChat(userId, chatId);
  return db().messages.filter((m) => m.chatId === chatId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function addMessage(userId: string, m: Omit<Message, "id" | "createdAt" | "userId" | "feedback">): Promise<Message> {
  const chat = await getChat(userId, m.chatId); // ownership check: no posting into someone else's chat
  const own = await getAssets(userId, m.attachmentIds);
  if (own.length !== m.attachmentIds.length) throw new NotFound("attachment");
  const msg: Message = { ...m, userId, feedback: null, id: randomUUID(), createdAt: now() };
  db().messages.push(msg); chat.updatedAt = now(); save(); return msg;
}
export async function setFeedback(userId: string, messageId: string, feedback: "up" | "down" | null) {
  const m = db().messages.find((x) => x.id === messageId && x.userId === userId);
  if (!m) throw new NotFound("message");
  m.feedback = feedback; save();
}

// ---------------------------------------------------------------- generations and renders
export async function getGeneration(userId: string, id: string) {
  const gen = db().generations.find((x) => x.id === id && x.userId === userId);
  if (!gen) throw new NotFound("generation");
  return gen;
}
export async function listGenerations(userId: string) { return db().generations.filter((x) => x.userId === userId).sort(byNewest); }
export async function listRenders(userId: string, generationId: string) {
  return db().renders.filter((r) => r.userId === userId && r.generationId === generationId).sort(byNewest);
}
export async function getRender(userId: string, id: string) {
  const r = db().renders.find((x) => x.id === id && x.userId === userId);
  if (!r) throw new NotFound("render");
  return r;
}
export async function latestRenders(userId: string) {
  const out = new Map<string, Render>();
  for (const r of db().renders.filter((x) => x.userId === userId).sort(byNewest)) if (!out.has(r.generationId)) out.set(r.generationId, r);
  return out;
}

/**
 * Create a generation and its first render, and charge for it, as one step.
 * Same idempotency key twice returns the first render instead of charging again.
 */
export async function createGenerationAndRender(input: {
  userId: string; chatId: string; messageId: string; kind: "reel" | "carousel"; plan: Plan; quoteId: string; idempotencyKey: string;
}): Promise<{ generation: Generation; render: Render; replayed: boolean }> {
  const d = db();
  const prior = d.renders.find((r) => r.userId === input.userId && r.idempotencyKey === input.idempotencyKey);
  if (prior) return { generation: await getGeneration(input.userId, prior.generationId), render: prior, replayed: true };
  const q = await getQuote(input.userId, input.quoteId);
  await getChat(input.userId, input.chatId);
  const gen: Generation = {
    id: randomUUID(), userId: input.userId, chatId: input.chatId, messageId: input.messageId, kind: input.kind,
    plan: input.plan, planVersion: 1, originalOnly: true, createdAt: now(), updatedAt: now(),
  };
  const render = newRender(gen, q.credits, q.watermark, input.idempotencyKey);
  spend(render); // throws InsufficientCredits before anything is stored
  d.generations.push(gen); d.renders.push(render); save();
  return { generation: gen, render, replayed: false };
}
export async function savePlan(userId: string, generationId: string, plan: Plan, baseVersion: number) {
  const gen = await getGeneration(userId, generationId);
  if (gen.planVersion !== baseVersion) throw new Error("version_conflict");
  gen.plan = plan; gen.planVersion += 1; gen.updatedAt = now(); save();
  return gen;
}
export async function createReRender(userId: string, generationId: string, quoteId: string, idempotencyKey: string) {
  const prior = db().renders.find((r) => r.userId === userId && r.idempotencyKey === idempotencyKey);
  if (prior) return { render: prior, replayed: true };
  const gen = await getGeneration(userId, generationId);
  const q = await getQuote(userId, quoteId);
  const render = newRender(gen, q.credits, q.watermark, idempotencyKey);
  spend(render);
  db().renders.push(render); save();
  return { render, replayed: false };
}
function newRender(gen: Generation, credits: number, watermark: boolean, idempotencyKey: string): Render {
  return {
    id: randomUUID(), generationId: gen.id, userId: gen.userId, planVersion: gen.planVersion, status: "queued",
    creditsQuoted: credits, watermark, progress: 0, outputKeys: [], errorCode: null, errorDetail: null,
    idempotencyKey, startedAt: null, finishedAt: null, createdAt: now(),
  };
}
/** Worker-side update (service role equivalent): not scoped by user. */
export async function updateRenderSystem(id: string, patch: Partial<Render>) {
  const r = db().renders.find((x) => x.id === id);
  if (!r) throw new NotFound("render");
  Object.assign(r, patch, { id: r.id, userId: r.userId }); save(); return { ...r };
}
export async function stuckRenders(olderThanMs: number) {
  const cutoff = Date.now() - olderThanMs;
  return db().renders.filter((r) => (r.status === "queued" || r.status === "rendering") && new Date(r.createdAt).getTime() < cutoff);
}
export async function getGenerationSystem(id: string) {
  const gen = db().generations.find((x) => x.id === id);
  if (!gen) throw new NotFound("generation");
  return gen;
}
export async function getAssetsSystem(ids: string[]) { return db().assets.filter((a) => ids.includes(a.id)); }

export async function renderByIdempotencyKey(userId: string, key: string) {
  return db().renders.find((r) => r.userId === userId && r.idempotencyKey === key) ?? null;
}
/** Throws InsufficientCredits without changing anything; the real charge still happens in spend(). */
export async function assertCanAfford(userId: string, credits: number) {
  const a = await getAccount(userId);
  if (a.planCredits + a.topupCredits < credits) throw new InsufficientCredits(credits, a.planCredits + a.topupCredits);
}
