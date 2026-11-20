// Render one claimed job. Shared by the in-process dev runner and the standalone worker (no Next.js imports).
// Rule: every way this ends without success goes through failRenderSystem, which fails AND refunds in one step.
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { failRenderSystem, getAssetsSystem, getGenerationSystem, logJobFailure, updateRenderSystem } from "@/lib/data/system";
import type { Render } from "@/lib/data/types";
import { putFile, toLocalFile } from "@/lib/storage";
import type { MediaMap, ReelProps } from "@/remotion/Reel";
import { isSupabase } from "@/lib/supabase/env";
import { adminClient } from "@/lib/supabase/admin";
import { emails, sendEmail } from "@/lib/email/send";

const ROOT = process.env.REELPLAIN_ROOT ?? process.cwd();
const TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS ?? 10 * 60 * 1000);
const SCALE = Number(process.env.RENDER_SCALE ?? (process.env.NODE_ENV === "production" ? 1 : 0.5));
const BROWSER = process.env.REMOTION_BROWSER ?? (() => {
  const p = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
  return existsSync(p) ? p : undefined;
})();

export async function processRender(render: Render): Promise<"succeeded" | "failed"> {
  const jobDir = path.join(tmpdir(), "reelplain-jobs", render.id);
  const cleanups: (() => Promise<void>)[] = [];
  try {
    const gen = await getGenerationSystem(render.generationId);
    const ids = gen.plan.scenes.map((s) => s.background.assetId).filter((x): x is string => !!x);
    const assets = (await getAssetsSystem(ids)).filter((a) => a.userId === render.userId); // owner's media only
    if (assets.length !== new Set(ids).size) return fail(render, "missing_media", "A file in this plan is gone.");
    const publicDir = path.join(jobDir, "public");
    await mkdir(publicDir, { recursive: true });
    const media: MediaMap = {};
    for (const a of assets) {
      const local = await toLocalFile(a.storageKey);
      cleanups.push(local.cleanup);
      const name = `${a.id}${path.extname(a.storageKey) || (a.kind === "image" ? ".jpg" : ".mp4")}`;
      await copyFile(local.file, path.join(publicDir, name));
      media[a.id] = { kind: a.kind, src: name, isStatic: true };
    }
    const props: ReelProps = { plan: gen.plan, media, watermark: render.watermark };
    const jobFile = path.join(jobDir, "job.json");
    await (await import("node:fs/promises")).writeFile(jobFile, JSON.stringify({ props, kind: gen.kind, outDir: path.join(jobDir, "out"), publicDir, scale: SCALE }));

    let last = 0;
    const result = await runWorker(jobFile, (p) => {
      if (p - last >= 0.05) { last = p; void updateRenderSystem(render.id, { progress: Math.min(0.99, p) }).catch(() => {}); }
    });
    if (!result.ok) return fail(render, result.code, result.detail);

    const keys: string[] = [];
    for (const out of result.outputs) {
      const key = `${render.userId}/renders/${render.id}/${path.basename(out)}`;
      await putFile(key, await readFile(out));
      keys.push(key);
    }
    await updateRenderSystem(render.id, { status: "succeeded", progress: 1, outputKeys: keys, finishedAt: new Date().toISOString() });
    return "succeeded";
  } catch (e) {
    return fail(render, "internal_error", String((e as Error)?.message ?? e));
  } finally {
    for (const c of cleanups) await c().catch(() => {});
    await rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function fail(render: Render, code: string, detail: string): Promise<"failed"> {
  try {
    await failRenderSystem(render.id, code, detail);
    await notifyRefund(render).catch(() => {}); // best effort: the refund already happened
  } catch (e) {
    // The refund itself failed: log to the dead-letter table so a human (or the reaper) finishes it.
    await logJobFailure("render_refund", render.id, `${code}: ${detail} | refund error: ${(e as Error).message}`).catch(() => {});
  }
  return "failed";
}

async function notifyRefund(render: Render) {
  if (!isSupabase() || render.creditsQuoted === 0) return;
  const { data } = await adminClient().auth.admin.getUserById(render.userId);
  if (data.user?.email) await sendEmail(data.user.email, emails.renderRefunded(render.creditsQuoted), `refund-${render.id}`);
}

function runWorker(jobFile: string, onProgress: (p: number) => void): Promise<{ ok: true; outputs: string[] } | { ok: false; code: string; detail: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts/render-job.mjs"), jobFile], {
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
          if (typeof m.progress === "number") onProgress(m.progress);
          if (m.done) outputs = m.outputs;
          if (m.error) error = m.error;
        } catch { /* log line */ }
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
