import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Idea } from "@/lib/data/types";
import { PlannerError } from "./claude-planner";

/** An ideas reply: a short intro and up to 5 idea cards. Same contract for the AI and the stand-in. */
export type IdeasReply = { intro: string; ideas: Idea[] };
const MODEL = "claude-opus-5-5";

const SYSTEM = `You help creators decide what to post. Given their request, suggest up to 5 specific post ideas for Instagram reels or carousels.
Each idea: a short title, the opening hook line (under 60 characters, specific, no hype), the angle in one sentence, and the best format (reel or carousel).
Start with a one-sentence intro. Use the creator's language and facts; don't invent results or numbers. Avoid clichés like "game-changer", "unlock", "level up".`;

const Schema = z.object({
  intro: z.string(),
  ideas: z.array(z.object({ title: z.string(), hook: z.string(), angle: z.string(), format: z.enum(["reel", "carousel"]) })),
});

let client: Anthropic | null = null;
async function claudeIdeas(prompt: string): Promise<IdeasReply> {
  client ??= new Anthropic({ baseURL: process.env.REELPLAIN_ANTHROPIC_BASE_URL || "https://api.anthropic.com", maxRetries: 2, timeout: 60_000 });
  let res;
  try {
    res = await client.beta.messages.parse({
      model: MODEL, max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new PlannerError("unavailable", `Ideas unavailable (${e.status ?? "network"})`);
    throw new PlannerError("invalid", "The ideas didn't come back in the right shape.");
  }
  if (res.stop_reason === "refusal") throw new PlannerError("refused", "That request can't be answered.");
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new PlannerError("truncated", "The ideas were cut off.");
  return clean(res.parsed_output);
}

/** Stand-in for development: deterministic, clearly generic, no AI. */
function fakeIdeas(prompt: string): IdeasReply {
  const topic = prompt.replace(/\s+/g, " ").trim().split(/[.!?\n]/)[0].slice(0, 50) || "your topic";
  return clean({
    intro: `Here are a few starting points for "${topic}".`,
    ideas: [
      { title: "The quick list", hook: `3 things nobody tells you about ${topic}`.slice(0, 60), angle: "Three short, specific tips, one per scene.", format: "reel" },
      { title: "Before and after", hook: `${topic}: what changed`.slice(0, 60), angle: "Show where you started and where you are now.", format: "carousel" },
      { title: "Common mistake", hook: `The mistake I made with ${topic}`.slice(0, 60), angle: "One honest mistake and what you do instead.", format: "reel" },
    ],
  });
}

function clean(r: IdeasReply): IdeasReply {
  const t = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);
  return {
    intro: t(r.intro, 300) || "Here are a few ideas.",
    ideas: r.ideas.slice(0, 5).map((i) => ({ title: t(i.title, 80), hook: t(i.hook, 100), angle: t(i.angle, 240), format: (i.format === "carousel" ? "carousel" : "reel") as Idea["format"] }))
      .filter((i) => i.title && i.hook),
  };
}

export async function makeIdeas(prompt: string): Promise<IdeasReply> {
  if (process.env.ANTHROPIC_API_KEY) return claudeIdeas(prompt);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_FAKE_PLANNER !== "1") throw new PlannerError("unavailable", "Planner not configured");
  return fakeIdeas(prompt);
}
