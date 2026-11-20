import React from "react";
import { Composition } from "remotion";
import { Reel, type ReelProps } from "./Reel";
import { ASPECT_SIZE, FPS, planDurationFrames } from "@/lib/plan/schema";

const demo: ReelProps = {
  watermark: true, media: {},
  plan: { version: 1, kind: "reel", aspect: "9:16", hook: "Preview", caption: "", hashtags: [],
    scenes: [{ id: "s1", durationMs: 2000, background: { kind: "color", assetId: null, color: "accent" }, layers: [{ id: "l1", kind: "text", text: "Preview", x: 0.5, y: 0.45, size: "lg", style: "pill" }] }] },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel" component={Reel} fps={FPS} width={1080} height={1920} durationInFrames={60}
    defaultProps={demo}
    calculateMetadata={({ props }) => ({ durationInFrames: planDurationFrames(props.plan), ...ASPECT_SIZE[props.plan.aspect] })}
  />
);
