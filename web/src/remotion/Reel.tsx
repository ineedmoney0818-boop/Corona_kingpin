import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, Video, getRemotionEnvironment, staticFile } from "remotion";
import tokens from "@/styles/tokens.json";
import { FPS, type Plan, type TextLayer } from "@/lib/plan/schema";

/** Media for each asset id. In the browser preview `src` is an app URL; in a server render it is a
 *  file name inside the job's public dir (resolved with staticFile). */
export type MediaMap = Record<string, { kind: "image" | "video"; src: string; isStatic: boolean }>;
export type ReelProps = { plan: Plan; media: MediaMap; watermark: boolean };

const C = tokens.color;
const SIZE: Record<TextLayer["size"], number> = { sm: 0.034, md: 0.046, lg: 0.062 };

function Layer({ layer, width }: { layer: TextLayer; width: number }) {
  const fontSize = Math.round(width * SIZE[layer.size]);
  const pill = layer.style === "pill";
  return (
    <div style={{ position: "absolute", left: `${layer.x * 100}%`, top: `${layer.y * 100}%`, transform: "translate(-50%, -50%)", width: "86%", display: "flex", justifyContent: "center" }}>
      <span style={{
        fontFamily: tokens.font.display, fontWeight: 800, fontSize, lineHeight: 1.2, textAlign: "center",
        color: pill ? C.text : C["on-accent"], background: pill ? C.bg : "transparent",
        padding: pill ? `${fontSize * 0.25}px ${fontSize * 0.5}px` : 0, borderRadius: pill ? fontSize * 0.5 : 0,
        textShadow: layer.style === "shadow" ? `0 2px ${fontSize * 0.2}px ${C.overlay}` : undefined,
        boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone",
      }}>{layer.text}</span>
    </div>
  );
}

function Background({ scene, media }: { scene: Plan["scenes"][number]; media: MediaMap }) {
  const m = scene.background.assetId ? media[scene.background.assetId] : undefined;
  if (!m) {
    const role = (scene.background.color ?? "accent") as keyof typeof C;
    return <AbsoluteFill style={{ background: C[role] ?? C.accent }} />;
  }
  const src = m.isStatic ? staticFile(m.src) : m.src;
  const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
  if (m.kind === "image") return <Img src={src} style={fill} />;
  // OffthreadVideo is frame-accurate for server renders; <Video> plays in the browser preview.
  return getRemotionEnvironment().isRendering ? <OffthreadVideo src={src} style={fill} muted /> : <Video src={src} style={fill} muted />;
}

export const Reel: React.FC<ReelProps> = ({ plan, media, watermark }) => {
  const frames = plan.scenes.map((s) => Math.max(1, Math.round((s.durationMs / 1000) * FPS)));
  const starts = frames.map((_, i) => frames.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <AbsoluteFill style={{ background: C.text }}>
      {plan.scenes.map((scene, i) => {
        return (
          <Sequence key={scene.id} from={starts[i]} durationInFrames={frames[i]}>
            <Background scene={scene} media={media} />
            <AbsoluteFill>{scene.layers.map((l) => <Layer key={l.id} layer={l} width={1080} />)}</AbsoluteFill>
          </Sequence>
        );
      })}
      {watermark && (
        <div style={{ position: "absolute", right: 32, bottom: 40, fontFamily: tokens.font.sans, fontWeight: 600, fontSize: 30, color: C["on-accent"], opacity: 0.85, textShadow: `0 1px 6px ${C.overlay}` }}>
          Made with Reelplain
        </div>
      )}
    </AbsoluteFill>
  );
};
