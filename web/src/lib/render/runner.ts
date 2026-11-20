import "server-only";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  getAssetsSystem, getGenerationSystem, refundRender, stuckRenders, updateRenderSystem, type Render,
} from "@/lib/data";
import { keyPath, putFile } from "@/lib/storage";
import type { MediaMap, ReelProps } from "@/remotion/Reel";

/**
 * Fake-mode render queue: runs inside the web server process and spawns one worker process per job
 * (scripts/render-job.mjs). In production this is the pg-boss queue on the Fly worker (architecture.md).
 *
 * The rule this file exists to keep: every way a render can end without success refunds its credits.
 *   worker error -> fail + refund      worker crash/exit != 0 -> fail + refund
 *   timeout      -> kill + fail + refund    server restarted mid-render -> reaper fails + refunds
 */
const JOBS_DIR = path.join(process.cwd(), ".data", "jobs");
const TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS ?? 10 * 60 * 1000);
const SCALE = Number(process.env.RENDER_SCALE ?? 0.5); // 0.5 = 540x960 locally; 1 in production
const BROWSER = process.env.REMOTION_BROWSER ?? findHeadlessShell();

function findHeadlessShell() {
  const p = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
  return existsSync(p) ? p : undefined;
}

type State = { queue: string[]; running: boolean; current: string | null; reaperStarted: boolean };
const g = globalThis as unknown as { __reelplainRunner?: State };
const state: State = (g.__reelplainRunner ??= { queue: [], running: false, current: null, reaperStarted: false });

export function enqueueRender(renderId: string) {
  startReaper();
  state.queue.push(renderId);
  void drain();
}

async function drain() {
  if (state.running) return;
  state.running = true;
  try {
    while (state.queue.length) { state.current = state.queue.shift()!; await runOne(state.current); }
  } finally {
    state.current = null;
    state.running = false;
  }
}

async function fail(r: Pick<Render, "id">, code: string, detail: string) {
  await updateRenderSystem(r.id, { status: "failed", errorCode: code, errorDetail: detail.slice(0, 500), finishedAt: new Date().toISOString() });
  await refundRender(r.id, `refund: ${code}`);
}

async function runOne(renderId: string) {
  let render: Render;
  try {
    render = await updateRenderSystem(renderId, { status: "rendering", startedAt: new Date().toISOString(), progress: 0 });
  } catch { return; }
  try {
    const gen = await getGenerationSystem(render.generationId);
    const ids = gen.plan.scenes.map((s) => s.background.assetId).filter((x): x is string => !!x);
    const assets = (await getAssetsSystem(ids)).filter((a) => a.userId === render.userId); // original only: the owner's media
    const jobDir = path.join(JOBS_DIR, render.id);
    const publicDir = path.join(jobDir, "public");
    mkdirSync(publicDir, { recursive: true });
    const media: MediaMap = {};
    for (const a of assets) {
      const name = `${a.id}${path.extname(a.fileName) || (a.kind === "image" ? ".jpg" : ".mp4")}`;
      copyFileSync(keyPath(a.storageKey), path.join(publicDir, name));
      media[a.id] = { kind: a.kind, src: name, isStatic: true };
    }
    const props: ReelProps = { plan: gen.plan, media, watermark: render.watermark };
    const jobFile = path.join(jobDir, "job.json");
    writeFileSync(jobFile, JSON.stringify({ props, kind: gen.kind, outDir: path.join(jobDir, "out"), publicDir, scale: SCALE }));

    const result = await runWorker(jobFile, (p) => void updateRenderSystem(render.id, { progress: p }));
    if (!result.ok) return void (await fail(render, result.code, result.detail));

    const keys: string[] = [];
    for (const out of result.outputs) {
      const key = `${render.userId}/renders/${render.id}/${path.basename(out)}`;
      putFile(key, readFileSync(out));
      keys.push(key);
    }
    await updateRenderSystem(render.id, { status: "succeeded", progress: 1, outputKeys: keys, finishedAt: new Date().toISOString() });
  } catch (e) {
    await fail(render, "internal_error", String((e as Error)?.message ?? e));
  }
}

function runWorker(jobFile: string, onProgress: (p: number) => void): Promise<{ ok: true; outputs: string[] } | { ok: false; code: string; detail: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts/render-job.mjs"), jobFile], {
      env: { ...process.env, ...(BROWSER ? { REMOTION_BROWSER: BROWSER } : {}) }, stdio: ["ignore", "pipe", "pipe"],
    });
    let outputs: string[] | null = null, error: string | null = null, buf = "", stderr = "";
    const timer = setTimeout(() => { error = "timed out"; child.kill("SIGKILL"); }, TIMEOUT_MS);
    child.stdout.on("data", (d: Buffer) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try {
          const m = JSON.parse(line);
          if (typeof m.progress === "number") onProgress(Math.min(0.99, m.progress));
          if (m.done) outputs = m.outputs;
          if (m.error) error = m.error;
        } catch { /* non-JSON log line */ }
      }
    });
    child.stderr.on("data", (d: Buffer) => { stderr = (stderr + d.toString()).slice(-2000); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && outputs) resolve({ ok: true, outputs });
      else resolve({ ok: false, code: error === "timed out" ? "timeout" : "render_failed", detail: error ?? (stderr || `worker exited ${code}`) });
    });
  });
}

/** Renders left queued/rendering by a restarted server will never finish: fail and refund them. */
function startReaper() {
  if (state.reaperStarted) return;
  state.reaperStarted = true;
  const sweep = async () => {
    // Anything queued/rendering for over a minute that this process is not holding is orphaned.
    for (const r of await stuckRenders(60_000)) {
      if (r.id !== state.current && !state.queue.includes(r.id)) await fail(r, "abandoned", "The server restarted while this was rendering.");
    }
  };
  void sweep();
  setInterval(() => void sweep(), 5 * 60 * 1000).unref();
}
