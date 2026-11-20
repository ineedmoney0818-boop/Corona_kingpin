"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Player } from "@remotion/player";
import { Reel, type MediaMap } from "@/remotion/Reel";
import { ASPECT_SIZE, FPS, Plan, planDurationFrames, type Plan as PlanT, type Scene, type TextLayer } from "@/lib/plan/schema";
import { Button, buttonClass } from "@/components/ui/Button";
import { CostChip } from "@/components/ui/CostChip";
import { Notice } from "@/components/ui/Notice";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { uploadOne } from "./Composer";

const POS = { top: 0.18, middle: 0.45, bottom: 0.8 } as const;
const posOf = (y: number) => (y < 0.3 ? "top" : y < 0.65 ? "middle" : "bottom");
const MAX_SCENES = 12, MAX_LAYERS = 4;
/** Colour backgrounds are token roles, never raw hex (the composition resolves them from tokens.json). */
const COLORS = [["accent", "Ember"], ["text", "Ink"], ["surface-2", "Sand"], ["accent-subtle", "Peach"]] as const;

export type LibraryItem = { id: string; kind: "image" | "video"; src: string; name: string; durationMs: number | null };
const newLayer = (text: string, y = 0.45): TextLayer => ({ id: crypto.randomUUID(), kind: "text", text, x: 0.5, y, size: "md", style: "pill" });

export function Editor({ generationId, initialPlan, baseVersion, library: initialLibrary }: { generationId: string; initialPlan: PlanT; baseVersion: number; library: LibraryItem[] }) {
  const [plan, setPlan] = useState(initialPlan);
  const [version, setVersion] = useState(baseVersion);
  const [sel, setSel] = useState(0);
  const [selLayer, setSelLayer] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState(initialLibrary);
  const [picker, setPicker] = useState<null | "new-scene" | "background">(null);
  const pickerRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const size = ASPECT_SIZE[plan.aspect];
  const scene = plan.scenes[sel];
  const li = Math.min(selLayer, Math.max(0, (scene?.layers.length ?? 1) - 1));
  const layer = scene?.layers[li];
  const media: MediaMap = useMemo(() => Object.fromEntries(library.map((m) => [m.id, { kind: m.kind, src: m.src, isStatic: false }])), [library]);
  const inputProps = useMemo(() => ({ plan, media, watermark: false }), [plan, media]);
  const pickable = plan.kind === "carousel" ? library.filter((m) => m.kind === "image") : library;

  function update(fn: (p: PlanT) => void) {
    const next = structuredClone(plan); fn(next); setPlan(next); setSaved(false);
  }
  function selectScene(i: number) { setSel(i); setSelLayer(0); }
  function move(i: number, d: -1 | 1) {
    const j = i + d; if (j < 0 || j >= plan.scenes.length) return;
    update((p) => { [p.scenes[i], p.scenes[j]] = [p.scenes[j], p.scenes[i]]; }); setSel(j);
  }
  function insertScene(s: Scene) {
    update((p) => { p.scenes.splice(sel + 1, 0, s); }); setSel(sel + 1); setSelLayer(0);
  }
  const fitDuration = (bg: Scene["background"], ms: number) => {
    const m = bg.assetId ? library.find((x) => x.id === bg.assetId) : undefined;
    return m?.kind === "video" && m.durationMs ? Math.min(ms, Math.max(500, m.durationMs)) : ms;
  };
  function openPicker(mode: "new-scene" | "background", from: HTMLElement) {
    opener.current = from; setPicker(mode); pickerRef.current?.showModal();
  }
  function closePicker() { pickerRef.current?.close(); }
  function choose(bg: Scene["background"]) {
    if (picker === "new-scene") {
      insertScene({ id: crypto.randomUUID(), durationMs: fitDuration(bg, 3000), background: bg, layers: [newLayer("New scene")] });
    } else {
      update((p) => { p.scenes[sel].background = bg; p.scenes[sel].durationMs = fitDuration(bg, p.scenes[sel].durationMs); });
    }
    closePicker();
  }
  async function uploadInPicker(files: FileList | null) {
    if (!files?.[0]) return;
    setError(null);
    const { r, j } = await uploadOne(files[0]);
    if (!r?.ok || !j?.asset) { setError(j?.error?.message ?? "Upload failed. Check your connection and try again."); return; }
    const a = j.asset;
    setLibrary((l) => [{ id: a.id, kind: a.kind, src: `/api/files/${a.storageKey}`, name: a.fileName, durationMs: a.durationMs }, ...l]);
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
  const unit = plan.kind === "reel" ? "Scene" : "Slide";
  const bgName = (s: Scene) => s.background.assetId ? (library.find((m) => m.id === s.background.assetId)?.name ?? "Your media")
    : (COLORS.find(([k]) => k === s.background.color)?.[1] ?? "Colour");

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
        <section aria-label={`${unit}s`} className="order-2 lg:order-1">
          <h2 className="mb-2 text-sm font-semibold">{unit}s <span className="font-normal text-text-muted">({plan.scenes.length} of {MAX_SCENES})</span></h2>
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {plan.scenes.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button type="button" onClick={() => selectScene(i)} aria-current={i === sel ? "true" : undefined}
                  className={cn("flex w-44 items-center justify-between gap-2 rounded-md border bg-bg px-3 py-2.5 text-left text-sm lg:w-full", i === sel ? "border-2 border-accent" : "border-border")}>
                  <span className="truncate">{i + 1}. {s.layers[0]?.text.trim() || "No text"}</span>
                  <span className="shrink-0 text-xs text-text-muted">{plan.kind === "reel" ? `${(s.durationMs / 1000).toFixed(1)}s` : `${s.layers.length} text`}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={plan.scenes.length >= MAX_SCENES}
              onClick={() => insertScene({ id: crypto.randomUUID(), durationMs: 3000, background: { kind: "color", assetId: null, color: "accent" }, layers: [newLayer("New scene")] })}>
              Add {unit.toLowerCase()}
            </Button>
            <Button variant="secondary" size="sm" disabled={plan.scenes.length >= MAX_SCENES}
              onClick={(e) => openPicker("new-scene", e.currentTarget)}>Add image</Button>
            <Button variant="ghost" size="sm" disabled={!scene || plan.scenes.length >= MAX_SCENES}
              onClick={() => scene && insertScene({ ...structuredClone(scene), id: crypto.randomUUID(), layers: scene.layers.map((l) => ({ ...l, id: crypto.randomUUID() })) })}>Duplicate</Button>
          </div>
        </section>
        <section aria-label="Preview" className="order-1 lg:order-2">
          <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-border">
            <Player component={Reel} inputProps={inputProps} durationInFrames={planDurationFrames(plan)} fps={FPS}
              compositionWidth={size.width} compositionHeight={size.height} style={{ width: "100%" }} controls loop />
          </div>
          <p className="mt-2 text-center text-xs text-text-muted">Preview without watermark. The render uses the same layout.</p>
        </section>
        {scene && (
          <section aria-label={`${unit} ${sel + 1} settings`} className="order-3 space-y-4 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">{unit} {sel + 1}</h2>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Background</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="max-w-40 truncate text-sm text-text-muted" title={bgName(scene)}>{bgName(scene)}</span>
                <Button variant="secondary" size="sm" onClick={(e) => openPicker("background", e.currentTarget)}>Change background</Button>
              </div>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Text layers</legend>
              <div className="flex flex-wrap items-center gap-1">
                {scene.layers.map((l, i) => (
                  <button key={l.id} type="button" aria-pressed={i === li} onClick={() => setSelLayer(i)}
                    className={cn("rounded-sm px-2.5 py-1 text-sm font-semibold", i === li ? "bg-bg text-text shadow-card" : "text-text-muted hover:bg-surface-2")}>Text {i + 1}</button>
                ))}
                <Button variant="ghost" size="sm" disabled={scene.layers.length >= MAX_LAYERS}
                  onClick={() => { update((p) => { p.scenes[sel].layers.push(newLayer("New text", 0.8)); }); setSelLayer(scene.layers.length); }}>Add text</Button>
              </div>
            </fieldset>
            {layer ? (
              <>
                <div>
                  <label htmlFor="layer-text" className="mb-1.5 block text-sm font-semibold">Text</label>
                  <textarea id="layer-text" rows={3} maxLength={140} value={layer.text} className={cn(inputClass, "h-auto py-2")}
                    onChange={(e) => update((p) => { p.scenes[sel].layers[li].text = e.target.value || " "; })} />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">Text position</legend>
                  <div className="inline-flex rounded-md bg-surface-2 p-0.5">
                    {(Object.keys(POS) as (keyof typeof POS)[]).map((k) => (
                      <button key={k} type="button" aria-pressed={posOf(layer.y) === k} onClick={() => update((p) => { p.scenes[sel].layers[li].y = POS[k]; })}
                        className={cn("rounded-sm px-3 py-1 text-sm font-semibold capitalize", posOf(layer.y) === k ? "bg-bg text-text shadow-card" : "text-text-muted")}>{k}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-semibold">Text style</legend>
                  <div className="inline-flex rounded-md bg-surface-2 p-0.5">
                    {(["pill", "shadow", "plain"] as const).map((k) => (
                      <button key={k} type="button" aria-pressed={layer.style === k} onClick={() => update((p) => { p.scenes[sel].layers[li].style = k; })}
                        className={cn("rounded-sm px-3 py-1 text-sm font-semibold capitalize", layer.style === k ? "bg-bg text-text shadow-card" : "text-text-muted")}>{k}</button>
                    ))}
                  </div>
                </fieldset>
                <Button variant="ghost" size="sm" onClick={() => { update((p) => { p.scenes[sel].layers.splice(li, 1); }); setSelLayer(Math.max(0, li - 1)); }}>Remove this text</Button>
              </>
            ) : <p className="text-sm text-text-muted">No text on this {unit.toLowerCase()}. Add some above.</p>}
            {plan.kind === "reel" && (
              <div>
                <label htmlFor="dur" className="mb-1.5 block text-sm font-semibold">Length (seconds)</label>
                <input id="dur" type="number" inputMode="decimal" min={0.5} max={15} step={0.5} className={inputClass} value={scene.durationMs / 1000}
                  onChange={(e) => { const s = Number(e.target.value); if (s >= 0.5 && s <= 15) update((p) => { p.scenes[sel].durationMs = fitDuration(p.scenes[sel].background, Math.round(s * 1000)); }); }} />
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="secondary" size="sm" onClick={() => move(sel, -1)} disabled={sel === 0}>Move up</Button>
              <Button variant="secondary" size="sm" onClick={() => move(sel, 1)} disabled={sel === plan.scenes.length - 1}>Move down</Button>
              <Button variant="ghost" size="sm" disabled={plan.scenes.length === 1}
                onClick={() => { update((p) => { p.scenes.splice(sel, 1); }); setSel((s) => Math.max(0, s - 1)); }}>Delete {unit.toLowerCase()}</Button>
            </div>
            <div>
              <label htmlFor="caption" className="mb-1.5 block text-sm font-semibold">Post caption</label>
              <textarea id="caption" rows={4} maxLength={2200} value={plan.caption} className={cn(inputClass, "h-auto py-2")}
                onChange={(e) => update((p) => { p.caption = e.target.value; })} />
            </div>
          </section>
        )}
      </div>

      <dialog ref={pickerRef} aria-labelledby="picker-title" onClose={() => { setPicker(null); opener.current?.focus(); }}
        className="m-auto w-[min(92vw,40rem)] rounded-lg bg-bg p-0 text-text shadow-pop backdrop:bg-overlay">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="picker-title" className="font-bold">{picker === "new-scene" ? "Add an image as a new " + unit.toLowerCase() : "Choose a background"}</h2>
          <button type="button" onClick={closePicker} className={buttonClass("ghost", "sm")} aria-label="Close">✕</button>
        </div>
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-4">
          <div>
            <input id="picker-upload" type="file" className="sr-only" onChange={(e) => { void uploadInPicker(e.target.files); e.target.value = ""; }}
              accept={plan.kind === "carousel" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"} />
            <label htmlFor="picker-upload" className={buttonClass("secondary", "sm", "cursor-pointer")}>Upload new</label>
            <span className="ml-2 text-xs text-text-muted">{plan.kind === "carousel" ? "Carousels use photos." : "Photos or videos. Your footage is used as-is."}</span>
          </div>
          {pickable.length === 0 ? <p className="text-sm text-text-muted">Nothing uploaded yet. Upload a photo{plan.kind === "reel" ? " or video" : ""} to use it here.</p> : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Your media">
              {pickable.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => choose({ kind: m.kind, assetId: m.id, color: null })} aria-label={m.kind === "video" ? `Video: ${m.name}` : undefined}
                    className="block w-full overflow-hidden rounded-md border border-border hover:border-accent focus-visible:outline-2 focus-visible:outline-focus">
                    {m.kind === "image"
                      // eslint-disable-next-line @next/next/no-img-element -- private, owner-only file
                      ? <img src={m.src} alt={m.name} className="aspect-square w-full object-cover" />
                      : <span className="grid aspect-square w-full place-items-center bg-surface-2 text-xs" aria-hidden="true">🎬 {m.durationMs ? `${Math.round(m.durationMs / 1000)}s` : "video"}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picker === "background" && (
            <div>
              <p className="mb-2 text-sm font-semibold">Or a colour</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(([k, name]) => (
                  <button key={k} type="button" onClick={() => choose({ kind: "color", assetId: null, color: k })} className={buttonClass("secondary", "sm")}>
                    <span aria-hidden="true" className="size-4 rounded-full border border-border" style={{ background: `var(--color-${k})` }} /> {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
