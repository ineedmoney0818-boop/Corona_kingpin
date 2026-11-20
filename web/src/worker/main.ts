// Production render worker: `npm run worker` (Fly.io machine with Chrome + ffmpeg).
// Claims queued renders from Postgres, renders, uploads, and refunds anything that fails.
import { claimNextRender, logJobFailure, reapStuckRenders } from "@/lib/data/system";
import { processRender } from "@/lib/render/core";

const IDLE_MS = 2000;
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function main() {
  let lastReap = 0;
  console.log(JSON.stringify({ evt: "worker_start" }));
  while (!stopping) {
    try {
      if (Date.now() - lastReap > 5 * 60_000) { lastReap = Date.now(); const n = await reapStuckRenders(15); if (n) console.log(JSON.stringify({ evt: "reaped", n })); }
      const job = await claimNextRender();
      if (!job) { await new Promise((r) => setTimeout(r, IDLE_MS)); continue; }
      const t0 = Date.now();
      const status = await processRender(job);
      console.log(JSON.stringify({ evt: "render", id: job.id, status, ms: Date.now() - t0 }));
    } catch (e) {
      await logJobFailure("worker_loop", null, String((e as Error)?.message ?? e)).catch(() => {});
      await new Promise((r) => setTimeout(r, IDLE_MS * 5));
    }
  }
  console.log(JSON.stringify({ evt: "worker_stop" }));
}
void main();
