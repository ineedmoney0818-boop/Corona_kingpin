// Render worker: node scripts/render-job.mjs <job.json>
// job.json: { props, kind: "reel"|"carousel", outDir, publicDir, scale }
// Prints one JSON object per line: {"progress":0.42} ... then {"done":true,"outputs":[...]} or {"error":"..."}.
// Runs as its own process so a crash, timeout or OOM never takes the web server down.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const emit = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const browserExecutable = process.env.REMOTION_BROWSER || undefined;

function srcHash() {
  const h = createHash("sha256");
  const walk = (d) => { for (const f of readdirSync(d).sort()) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else h.update(f).update(readFileSync(p)); } };
  walk(path.join(ROOT, "src/remotion")); h.update(readFileSync(path.join(ROOT, "src/styles/tokens.json"))); h.update(readFileSync(path.join(ROOT, "src/lib/plan/schema.ts")));
  return h.digest("hex").slice(0, 16);
}

const webpackOverride = (c) => ({ ...c, resolve: { ...c.resolve, alias: { ...(c.resolve?.alias ?? {}), "@": path.join(ROOT, "src") } } });
const PREBUILT = process.env.REMOTION_BUNDLE_DIR;
const copied = [];

export async function bundleTo(outDir, publicDir) {
  return bundle({ entryPoint: path.join(ROOT, "src/remotion/index.ts"), publicDir, outDir, webpackOverride, onProgress: () => {} });
}

async function serveUrl(publicDir) {
  // Production: the template was bundled once at image build (scripts/prebundle.mjs). Webpack needs ~1.3 GB,
  // which per job would double a render's memory. Drop this job's media into the bundle's public/ instead;
  // file names are asset ids, so jobs never collide, and they're removed when the job ends.
  if (PREBUILT && existsSync(path.join(PREBUILT, "index.html"))) {
    const pub = path.join(PREBUILT, "public");
    mkdirSync(pub, { recursive: true });
    for (const f of readdirSync(publicDir)) { const to = path.join(pub, f); copyFileSync(path.join(publicDir, f), to); copied.push(to); }
    return PREBUILT;
  }
  // Dev: bundle per job so the job's public dir (the user's media) is included. Webpack's cache keeps repeats fast.
  return bundleTo(path.join(path.dirname(publicDir), "bundle"), publicDir);
}
const cleanup = () => { for (const f of copied) rmSync(f, { force: true }); };

if (import.meta.url === `file://${process.argv[1]}`) try {
  const job = JSON.parse(readFileSync(process.argv[2], "utf8"));
  mkdirSync(job.outDir, { recursive: true });
  emit({ stage: "bundling", hash: srcHash() });
  const url = await serveUrl(job.publicDir);
  const composition = await selectComposition({ serveUrl: url, id: "Reel", inputProps: job.props, browserExecutable });
  const outputs = [];
  if (job.kind === "reel") {
    const out = path.join(job.outDir, "reel.mp4");
    await renderMedia({
      serveUrl: url, composition, inputProps: job.props, codec: "h264", outputLocation: out, browserExecutable,
      scale: job.scale ?? 1, concurrency: 2,
      // Remotion sizes this cache from host memory by default, which can exceed the container limit.
      offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024, onProgress: ({ progress }) => emit({ progress }),
    });
    outputs.push(out);
  } else {
    let frame = 0;
    for (const [i, s] of job.props.plan.scenes.entries()) {
      const out = path.join(job.outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
      await renderStill({ serveUrl: url, composition, inputProps: job.props, frame: frame + 1, output: out, browserExecutable, scale: job.scale ?? 1 });
      frame += Math.max(1, Math.round((s.durationMs / 1000) * composition.fps));
      outputs.push(out); emit({ progress: (i + 1) / job.props.plan.scenes.length });
    }
  }
  emit({ done: true, outputs });
  cleanup();
  process.exit(0);
} catch (e) {
  emit({ error: String(e?.message ?? e).slice(0, 500) });
  cleanup();
  process.exit(1);
}
