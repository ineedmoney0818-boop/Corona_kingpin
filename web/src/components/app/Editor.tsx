"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Player } from "@remotion/player";
import { Reel, type MediaMap } from "@/remotion/Reel";
import { ASPECT_SIZE, FPS, Plan, planDurationFrames, type Plan as PlanT } from "@/lib/plan/schema";
import { Button, buttonClass } from "@/components/ui/Button";
import { CostChip } from "@/components/ui/CostChip";
import { Notice } from "@/components/ui/Notice";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";

const POS = { top: 0.18, middle: 0.45, bottom: 0.8 } as const;
const posOf = (y: number) => (y < 0.3 ? "top" : y < 0.65 ? "middle" : "bottom");

export function Editor({ generationId, initialPlan, baseVersion, media }: { generationId: string; initialPlan: PlanT; baseVersion: number; media: MediaMap }) {
  const [plan, setPlan] = useState(initialPlan);
  const [version, setVersion] = useState(baseVersion);
  const [sel, setSel] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const size = ASPECT_SIZE[plan.aspect];
  const scene = plan.scenes[sel];
  const layer = scene?.layers[0];
  const inputProps = useMemo(() => ({ plan, media, watermark: false }), [plan, media]);

  function update(fn: (p: PlanT) => void) {
    const next = structuredClone(plan); fn(next); setPlan(next); setSaved(false);
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d; if (j < 0 || j >= plan.scenes.length) return;
    update((p) => { [p.scenes[i], p.scenes[j]] = [p.scenes[j], p.scenes[i]]; }); setSel(j);
  }
  async function save() {
    const v = Plan.safeParse(plan);
    if (!v.success) { setError("Something's off: " + v.error.issues[0]?.message); return; }
    setSaving(true); setError(null);
    const r = await fetch(`/api/generations/${generationId}/plan`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: v.data, baseVersion: version }) });
    const j = await r.json().catch(() => null);
    setSaving(false);
    if (!r.ok) { setError(j?.error?.message ?? "Couldn't save. Your edits are still here."); return; }
    setVersion(j.generation.planVersion); setSaved(true);
  }

  return (
    <div className="mx-auto max-w-[var(--layout-content-max)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/app/generations/${generationId}`} className={buttonClass("ghost", "sm")}>← Back</Link>
          <h1 className="text-lg font-bold">Edit {plan.kind}</h1>
          <span className="text-xs text-text-muted" aria-live="polite">{saving ? "Saving…" : saved ? "All changes saved" : "Unsaved changes"}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={save} loading={saving} disabled={saved}>Save changes <span className="text-xs text-text-muted">· free</span></Button>
          <Link href={`/app/generations/${generationId}`} aria-disabled={!saved} onClick={(e) => { if (!saved) e.preventDefault(); }}
            className={buttonClass("primary", "md", !saved ? "pointer-events-none opacity-50" : "")}>Render <CostChip credits={1} /></Link>
        </div>
      </div>
      {error && <Notice kind="danger" role="alert" className="mt-3">{error}</Notice>}
      <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr_var(--layout-editor-panel)]">
        <section aria-label="Scenes" className="order-2 lg:order-1">
          <h2 className="mb-2 text-sm font-semibold">{plan.kind === "reel" ? "Scenes" : "Slides"}</h2>
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {plan.scenes.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button type="button" onClick={() => setSel(i)} aria-current={i === sel ? "true" : undefined}
                  className={cn("flex w-44 items-center justify-between gap-2 rounded-md border bg-bg px-3 py-2.5 text-left text-sm lg:w-full", i === sel ? "border-2 border-accent" : "border-border")}>
                  <span className="truncate">{i + 1}. {s.layers[0]?.text ?? "No text"}</span>
                  <span className="shrink-0 text-xs text-text-muted">{(s.durationMs / 1000).toFixed(1)}s</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section aria-label="Preview" className="order-1 lg:order-2">
          <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-border">
            <Player component={Reel} inputProps={inputProps} durationInFrames={planDurationFrames(plan)} fps={FPS}
              compositionWidth={size.width} compositionHeight={size.height} style={{ width: "100%" }} controls loop />
          </div>
          <p className="mt-2 text-center text-xs text-text-muted">Preview without watermark. The render uses the same layout.</p>
        </section>
        {scene && (
          <section aria-label={`${plan.kind === "reel" ? "Scene" : "Slide"} ${sel + 1} settings`} className="order-3 space-y-4 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">{plan.kind === "reel" ? "Scene" : "Slide"} {sel + 1}</h2>
            {layer && (
              <div>
                <label htmlFor="layer-text" className="mb-1.5 block text-sm font-semibold">Text</label>
                <textarea id="layer-text" rows={3} maxLength={140} value={layer.text} className={cn(inputClass, "h-auto py-2")}
                  onChange={(e) => update((p) => { p.scenes[sel].layers[0].text = e.target.value || " "; })} />
              </div>
            )}
            {layer && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold">Text position</legend>
                <div className="inline-flex rounded-md bg-surface-2 p-0.5">
                  {(Object.keys(POS) as (keyof typeof POS)[]).map((k) => (
                    <button key={k} type="button" aria-pressed={posOf(layer.y) === k} onClick={() => update((p) => { p.scenes[sel].layers[0].y = POS[k]; })}
                      className={cn("rounded-sm px-3 py-1 text-sm font-semibold capitalize", posOf(layer.y) === k ? "bg-bg text-text shadow-card" : "text-text-muted")}>{k}</button>
                  ))}
                </div>
              </fieldset>
            )}
            {layer && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-semibold">Text style</legend>
                <div className="inline-flex rounded-md bg-surface-2 p-0.5">
                  {(["pill", "shadow", "plain"] as const).map((k) => (
                    <button key={k} type="button" aria-pressed={layer.style === k} onClick={() => update((p) => { p.scenes[sel].layers[0].style = k; })}
                      className={cn("rounded-sm px-3 py-1 text-sm font-semibold capitalize", layer.style === k ? "bg-bg text-text shadow-card" : "text-text-muted")}>{k}</button>
                  ))}
                </div>
              </fieldset>
            )}
            {plan.kind === "reel" && (
              <div>
                <label htmlFor="dur" className="mb-1.5 block text-sm font-semibold">Length (seconds)</label>
                <input id="dur" type="number" inputMode="decimal" min={0.5} max={15} step={0.5} className={inputClass} value={scene.durationMs / 1000}
                  onChange={(e) => { const s = Number(e.target.value); if (s >= 0.5 && s <= 15) update((p) => { p.scenes[sel].durationMs = Math.round(s * 1000); }); }} />
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="secondary" size="sm" onClick={() => move(sel, -1)} disabled={sel === 0}>Move up</Button>
              <Button variant="secondary" size="sm" onClick={() => move(sel, 1)} disabled={sel === plan.scenes.length - 1}>Move down</Button>
              <Button variant="ghost" size="sm" disabled={plan.scenes.length === 1}
                onClick={() => { update((p) => { p.scenes.splice(sel, 1); }); setSel((s) => Math.max(0, s - 1)); }}>Delete</Button>
            </div>
            <div>
              <label htmlFor="caption" className="mb-1.5 block text-sm font-semibold">Post caption</label>
              <textarea id="caption" rows={4} maxLength={2200} value={plan.caption} className={cn(inputClass, "h-auto py-2")}
                onChange={(e) => update((p) => { p.caption = e.target.value; })} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
