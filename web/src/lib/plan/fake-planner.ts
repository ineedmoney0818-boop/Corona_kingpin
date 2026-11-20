import { randomUUID } from "node:crypto";
import type { Asset } from "@/lib/data/types";
import { Plan, type Plan as PlanT } from "./schema";

/**
 * Stand-in planner until the Claude planner is wired (replica-backend). Deterministic, no AI:
 * one scene per asset in the order attached, the prompt's first line as the hook, plain caption.
 * It follows the same contract as the real one: output must pass the Plan schema, and it may only
 * reference the user's own asset ids ("original only").
 */
export function fakePlan(prompt: string, assets: Asset[], kind: "reel" | "carousel"): PlanT {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const hook = (clean.split(/[.!?\n]/)[0] || "Here's what I made").slice(0, 80);
  const sources = assets.length ? assets : [null];
  const scenes = sources.slice(0, 8).map((a, i) => ({
    id: randomUUID(),
    durationMs: a?.kind === "video" ? Math.min(a.durationMs ?? 3000, 5000) : 3000,
    background: a ? { kind: a.kind, assetId: a.id, color: null } : { kind: "color" as const, assetId: null, color: "accent" },
    layers: [{ id: randomUUID(), kind: "text" as const, text: i === 0 ? hook : `Part ${i + 1}`, x: 0.5, y: i === 0 ? 0.42 : 0.8, size: i === 0 ? "lg" as const : "md" as const, style: "pill" as const }],
  }));
  return Plan.parse({
    version: 1, kind, aspect: kind === "reel" ? "9:16" : "4:5", hook, scenes,
    caption: `${hook}.\n\nMade with Reelplain.`, hashtags: [],
  });
}
