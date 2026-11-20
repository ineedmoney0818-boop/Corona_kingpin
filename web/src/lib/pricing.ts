/** One place for every price in the app. The UI only ever shows a cost that came from quote(). */
export const PLAN_GRANTS = { try: 10, creator: 120, studio: 400 } as const;
export type PlanId = keyof typeof PLAN_GRANTS;

export const COSTS = {
  newReel: 4,       // plan + first render
  newCarousel: 3,
  reRender: 1,      // after edits; saving edits is free
  ideas: 1,         // one ideas reply in chat (no render)
} as const;

export type QuoteKind = "new-reel" | "new-carousel" | "re-render" | "ideas";
export function creditsFor(kind: QuoteKind): number {
  return kind === "new-reel" ? COSTS.newReel : kind === "new-carousel" ? COSTS.newCarousel : kind === "ideas" ? COSTS.ideas : COSTS.reRender;
}
export const QUOTE_TTL_MS = 5 * 60 * 1000;
