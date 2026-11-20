import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Asset } from "@/lib/data/types";
import { toLocalFile } from "@/lib/storage";
import { Plan, type Plan as PlanT } from "./schema";

const run = promisify(execFile);
export const PLANNER_MODEL = "claude-opus-5-5";

export class PlannerError extends Error {
  constructor(public code: "refused" | "truncated" | "invalid" | "unavailable", message: string) { super(message); }
}

// Frozen system prompt: no dates, ids or user data, so it caches across requests.
const SYSTEM = `You plan short social posts for Reelplain, an app that turns a creator's own clips and photos into Instagram-style reels and carousels.

You get the creator's request and their media (photos, and up to three still frames from each video). Return a plan:
- hook: the opening line shown on the first scene. Under 60 characters. Specific to the request, not generic hype.
- scenes: in the order they should play. Each uses one of the creator's media by asset_id, or "none" for a plain colour card when there is nothing suitable. Use each asset at most once unless the creator asks otherwise. Never invent media.
- text on each scene: short (under 70 characters), readable on a phone, one idea per scene. The first scene's text is the hook.
- duration_seconds (reels): 2 to 5 seconds for photos; for a video, no longer than the video.
- caption: the post caption, 1 to 4 short paragraphs, plain and specific, ending with one clear call to action. No hashtags inside the caption.
- hashtags: up to 5, relevant, no '#' symbol.

Write in the creator's language. Keep their facts; do not add claims, numbers or results they did not give you. Avoid clichés like "game-changer", "unlock", "level up".`;

const POSITIONS = { top: 0.18, middle: 0.45, bottom: 0.8 } as const;

function outputSchema(assetIds: string[], kind: "reel" | "carousel") {
  const ids = assetIds.length ? (["none", ...assetIds] as [string, ...string[]]) : (["none"] as [string]);
  return z.object({
    hook: z.string(),
    scenes: z.array(z.object({
      asset_id: z.enum(ids),
      text: z.string(),
      text_position: z.enum(["top", "middle", "bottom"]),
      text_style: z.enum(["pill", "shadow", "plain"]),
      duration_seconds: kind === "reel" ? z.number() : z.number().nullable(),
    })),
    caption: z.string(),
    hashtags: z.array(z.string()),
  });
}

async function previewJpeg(file: string, seekSeconds: number | null): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "rp-prev-"));
  const out = path.join(dir, "p.jpg");
  try {
    const args = ["-v", "error", "-y", ...(seekSeconds !== null ? ["-ss", String(seekSeconds)] : []), "-i", file, "-frames:v", "1", "-vf", "scale='min(512,iw)':-2", "-q:v", "5", out];
    await run("ffmpeg", args);
    return (await readFile(out)).toString("base64");
  } finally { await rm(dir, { recursive: true, force: true }); }
}

/** Content blocks describing the user's media: small JPEG previews, 3 frames per video. */
async function mediaBlocks(assets: Asset[]): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const a of assets) {
    const local = await toLocalFile(a.storageKey);
    const file = local.file;
    try {
    if (a.kind === "image") {
      blocks.push({ type: "text", text: `asset_id ${a.id}: photo "${a.fileName}"` });
      blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: await previewJpeg(file, null) } });
    } else {
      const secs = (a.durationMs ?? 3000) / 1000;
      blocks.push({ type: "text", text: `asset_id ${a.id}: video "${a.fileName}", ${secs.toFixed(1)} s long. Frames at 10%, 50% and 90%:` });
      for (const f of [0.1, 0.5, 0.9]) {
        blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: await previewJpeg(file, Math.max(0, secs * f)) } });
      }
    }
    } finally { await local.cleanup(); }
  }
  return blocks;
}

let client: Anthropic | null = null;
// Base URL pinned so the app never inherits an ANTHROPIC_BASE_URL meant for something else on the machine.
const anthropic = () => (client ??= new Anthropic({ baseURL: process.env.REELPLAIN_ANTHROPIC_BASE_URL || "https://api.anthropic.com", maxRetries: 2, timeout: 120_000 }));

export async function claudePlan(prompt: string, assets: Asset[], kind: "reel" | "carousel"): Promise<{ plan: PlanT; usage: { input: number; output: number; cacheRead: number } }> {
  const schema = outputSchema(assets.map((a) => a.id), kind);
  let res;
  try {
    res = await anthropic().beta.messages.parse({
      model: PLANNER_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: [
          ...(await mediaBlocks(assets)),
          { type: "text", text: `Make a ${kind === "reel" ? "reel (9:16 video)" : "carousel (4:5 slides, no durations needed)"}. ${assets.length ? "" : "There is no media; use colour cards. "}Creator's request:\n${prompt}` },
        ],
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new PlannerError("unavailable", `Planner unavailable (${e.status ?? "network"})`);
    throw new PlannerError("invalid", "The plan didn't come back in the right shape.");
  }
  if (res.stop_reason === "refusal") throw new PlannerError("refused", "That request can't be planned.");
  if (res.stop_reason === "max_tokens") throw new PlannerError("truncated", "The plan was cut off.");
  const out = res.parsed_output;
  if (!out || out.scenes.length === 0) throw new PlannerError("invalid", "The plan didn't come back in the right shape.");

  // Map the model's answer into our Plan; ids and limits are ours, never the model's.
  const byId = new Map(assets.map((a) => [a.id, a]));
  const scenes = out.scenes.slice(0, 12).map((s, i) => {
    const a = s.asset_id === "none" ? undefined : byId.get(s.asset_id); // enum already guarantees ownership
    const maxSecs = a?.kind === "video" ? Math.max(0.5, (a.durationMs ?? 3000) / 1000) : 15;
    const secs = kind === "reel" ? Math.min(Math.max(s.duration_seconds ?? 3, 1), maxSecs, 15) : 3;
    const text = (i === 0 ? out.hook || s.text : s.text).trim().slice(0, 140) || " ";
    return {
      id: randomUUID(),
      durationMs: Math.round(secs * 1000),
      background: a ? { kind: a.kind, assetId: a.id, color: null } : { kind: "color" as const, assetId: null, color: "accent" },
      layers: [{ id: randomUUID(), kind: "text" as const, text, x: 0.5, y: POSITIONS[s.text_position], size: i === 0 ? "lg" as const : "md" as const, style: s.text_style }],
    };
  });
  const parsed = Plan.safeParse({
    version: 1, kind, aspect: kind === "reel" ? "9:16" : "4:5",
    hook: out.hook.trim().slice(0, 140), scenes,
    caption: out.caption.trim().slice(0, 2200),
    hashtags: out.hashtags.map((h) => h.replace(/^#/, "").trim().slice(0, 40)).filter(Boolean).slice(0, 10),
  });
  if (!parsed.success) throw new PlannerError("invalid", "The plan didn't pass checks.");
  const u = res.usage;
  return { plan: parsed.data, usage: { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0 } };
}
