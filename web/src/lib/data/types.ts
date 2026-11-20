import type { Plan } from "@/lib/plan/schema";
import type { PlanId } from "@/lib/pricing";

export type User = { id: string; email: string; displayName: string; plan: PlanId; createdAt: string };
export type CreditAccount = { userId: string; planCredits: number; topupCredits: number; monthlyGrant: number; nextGrantAt: string };
export type LedgerKind = "grant" | "rollover_trim" | "topup" | "spend" | "refund" | "adjust";
export type LedgerEntry = {
  id: string; userId: string; kind: LedgerKind; planDelta: number; topupDelta: number;
  renderId: string | null; ref: string | null; note: string | null; createdAt: string;
};
export type Project = { id: string; userId: string; name: string; createdAt: string; updatedAt: string };
export type Asset = {
  id: string; userId: string; projectId: string | null; kind: "image" | "video"; source: "upload" | "url" | "stock";
  storageKey: string; fileName: string; mimeType: string; bytes: number;
  width: number | null; height: number | null; durationMs: number | null;
  status: "pending" | "ready" | "failed"; description: string | null; createdAt: string;
};
export type Chat = { id: string; userId: string; projectId: string | null; title: string; createdAt: string; updatedAt: string };
export type Message = {
  id: string; chatId: string; userId: string; role: "user" | "assistant"; content: string;
  attachmentIds: string[]; generationId: string | null; feedback: "up" | "down" | null; createdAt: string;
};
export type Generation = {
  id: string; userId: string; chatId: string | null; messageId: string | null; kind: "reel" | "carousel";
  plan: Plan; planVersion: number; originalOnly: boolean; createdAt: string; updatedAt: string;
};
export type RenderStatus = "queued" | "rendering" | "succeeded" | "failed" | "canceled";
export type Render = {
  id: string; generationId: string; userId: string; planVersion: number; status: RenderStatus;
  creditsQuoted: number; watermark: boolean; progress: number; outputKeys: string[];
  errorCode: string | null; errorDetail: string | null; idempotencyKey: string;
  startedAt: string | null; finishedAt: string | null; createdAt: string;
};
export type Quote = { id: string; userId: string; kind: import("@/lib/pricing").QuoteKind; credits: number; watermark: boolean; balanceAfter: number; expiresAt: string };

export class InsufficientCredits extends Error {
  constructor(public needed: number, public available: number) { super("insufficient_credits"); }
}
export class NotFound extends Error { constructor(what: string) { super(`${what} not found`); } }
