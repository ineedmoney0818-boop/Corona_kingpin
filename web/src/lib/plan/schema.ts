import { z } from "zod";

/** A text layer on a scene. Positions are fractions of the frame (0..1) so plans survive aspect changes. */
export const TextLayer = z.object({
  id: z.string(),
  kind: z.literal("text"),
  text: z.string().min(1).max(140),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  size: z.enum(["sm", "md", "lg"]),
  style: z.enum(["pill", "plain", "shadow"]),
});

export const Scene = z.object({
  id: z.string(),
  durationMs: z.number().int().min(500).max(15000),
  background: z.object({
    kind: z.enum(["image", "video", "color"]),
    assetId: z.string().nullable(), // must reference one of the user's own assets ("original only")
    color: z.string().nullable(),   // token name for colour backgrounds, never a raw hex
  }),
  layers: z.array(TextLayer).max(4),
});

export const Plan = z.object({
  version: z.literal(1),
  kind: z.enum(["reel", "carousel"]),
  aspect: z.enum(["9:16", "1:1", "4:5"]),
  hook: z.string().max(140),
  scenes: z.array(Scene).min(1).max(12),
  caption: z.string().max(2200),
  hashtags: z.array(z.string().max(40)).max(10),
});
export type Plan = z.infer<typeof Plan>;
export type Scene = z.infer<typeof Scene>;
export type TextLayer = z.infer<typeof TextLayer>;

export const ASPECT_SIZE: Record<Plan["aspect"], { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
};
export const FPS = 30;
export const planDurationFrames = (p: Plan) =>
  Math.max(1, Math.round(p.scenes.reduce((n, s) => n + s.durationMs, 0) / (1000 / FPS)));
