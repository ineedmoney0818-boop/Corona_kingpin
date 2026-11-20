import type { PostgrestError } from "@supabase/supabase-js";
import type { Plan } from "@/lib/plan/schema";
import { adminClient } from "@/lib/supabase/admin";
import { InsufficientCredits, NotFound, type Asset, type Generation, type Render } from "./types";

// Service-role data functions with no Next.js dependency: shared by the web app and the render worker.
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
const toAsset = (r: Row): Asset => ({
  id: s(r.id), userId: s(r.user_id), projectId: (r.project_id as string) ?? null, kind: r.kind as Asset["kind"], source: r.source as Asset["source"],
  storageKey: s(r.storage_path), fileName: s(r.file_name ?? r.storage_path), mimeType: s(r.mime_type), bytes: n(r.bytes ?? 0),
  width: (r.width as number) ?? null, height: (r.height as number) ?? null, durationMs: (r.duration_ms as number) ?? null,
  status: r.status as Asset["status"], description: (r.description as string) ?? null, createdAt: s(r.created_at),
});
const toGeneration = (r: Row): Generation => ({ id: s(r.id), userId: s(r.user_id), chatId: (r.chat_id as string) ?? null, messageId: (r.message_id as string) ?? null, kind: r.kind as Generation["kind"], plan: r.plan as Plan, planVersion: n(r.plan_version), originalOnly: !!r.original_only, createdAt: s(r.created_at), updatedAt: s(r.updated_at) });
const toRender = (r: Row): Render => ({
  id: s(r.id), generationId: s(r.generation_id), userId: s(r.user_id), planVersion: n(r.plan_version), status: r.status as Render["status"],
  creditsQuoted: n(r.credits_quoted), watermark: !!r.watermark, progress: n(r.progress ?? 0), outputKeys: (r.output_paths as string[]) ?? [],
  errorCode: (r.error_code as string) ?? null, errorDetail: (r.error_detail as string) ?? null, idempotencyKey: s(r.idempotency_key),
  startedAt: (r.started_at as string) ?? null, finishedAt: (r.finished_at as string) ?? null, createdAt: s(r.created_at),
});

export async function refundRender(renderId: string, note: string): Promise<boolean> {
  check(await adminClient().rpc("refund_render", { p_render_id: renderId, p_note: note }), "refund");
  return true;
}
export async function addTopup(userId: string, amount: number, ref: string) {
  check(await adminClient().rpc("add_topup", { p_user_id: userId, p_amount: amount, p_ref: ref }), "topup");
}
export async function grantMonthly(userId: string, grant: number, ref: string) {
  check(await adminClient().rpc("grant_monthly_credits", { p_user_id: userId, p_grant: grant, p_ref: ref }), "grant");
}
// ---------------------------------------------------------------- worker / system (service role)
export async function updateRenderSystem(id: string, patch: Partial<Render>) {
  const row: Row = {};
  if (patch.status) row.status = patch.status;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.outputKeys) row.output_paths = patch.outputKeys;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.finishedAt !== undefined) row.finished_at = patch.finishedAt;
  if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
  if (patch.errorDetail !== undefined) row.error_detail = patch.errorDetail;
  return toRender(check(await adminClient().from("renders").update(row).eq("id", id).select().single(), "render") as Row);
}
export async function failRenderSystem(id: string, code: string, detail: string) {
  check(await adminClient().rpc("fail_render", { p_render: id, p_code: code, p_detail: detail }), "fail render");
}
export async function claimNextRender(): Promise<Render | null> {
  const rows = check(await adminClient().rpc("claim_next_render"), "claim") as Row[];
  return rows.length ? toRender(rows[0]) : null;
}
export async function reapStuckRenders(olderThanMinutes: number): Promise<number> {
  return check(await adminClient().rpc("reap_stuck_renders", { p_older_than: `${olderThanMinutes} minutes` }), "reap") as number;
}
export async function stuckRenders(): Promise<Render[]> { return []; } // the SQL reaper replaces the in-process scan
export async function getGenerationSystem(id: string) {
  return toGeneration(check(await adminClient().from("generations").select("*").eq("id", id).single(), "generation") as Row);
}
export async function getAssetsSystem(ids: string[]) {
  if (!ids.length) return [];
  return (check(await adminClient().from("assets").select("*").in("id", ids), "assets") as Row[]).map(toAsset);
}
export async function logJobFailure(job: string, ref: string | null, error: string, attempts = 1) {
  await adminClient().from("job_failures").insert({ job, ref, error: error.slice(0, 2000), attempts });
}
export async function hitRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const r = await adminClient().rpc("hit_rate_limit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  return r.error ? true : !!r.data; // fail open on limiter errors, never block on our own outage
}
