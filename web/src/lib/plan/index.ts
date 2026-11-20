import "server-only";
import type { Asset } from "@/lib/data/types";
import { claudePlan, PlannerError } from "./claude-planner";
import { fakePlan } from "./fake-planner";
import type { Plan } from "./schema";

export { PlannerError };
export const plannerMode = () => (process.env.ANTHROPIC_API_KEY ? "claude" : "fake") as "claude" | "fake";

/** Real planner when a key is configured. The stand-in is allowed in development only. */
export async function makePlan(prompt: string, assets: Asset[], kind: "reel" | "carousel"): Promise<Plan> {
  if (plannerMode() === "claude") {
    const { plan, usage } = await claudePlan(prompt, assets, kind);
    console.info(JSON.stringify({ evt: "plan", kind, scenes: plan.scenes.length, tokens_in: usage.input, tokens_out: usage.output, cache_read: usage.cacheRead }));
    return plan;
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_FAKE_PLANNER !== "1") {
    throw new PlannerError("unavailable", "Planner not configured");
  }
  return fakePlan(prompt, assets, kind);
}
