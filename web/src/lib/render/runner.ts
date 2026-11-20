import "server-only";
import { claimNextRender, reapStuckRenders } from "@/lib/data/system";
import { processRender } from "./core";

/**
 * In-process runner for local development (fake store or local Supabase): when a render is queued,
 * drain the queue in this process. Production runs `npm run worker` on a separate machine instead
 * (set RENDER_IN_PROCESS=0 on the web app). Both claim jobs with claim_next_render (SKIP LOCKED).
 */
type State = { draining: boolean; again: boolean; reaper: boolean };
const g = globalThis as unknown as { __reelplainRunner?: State };
const state: State = (g.__reelplainRunner ??= { draining: false, again: false, reaper: false });

/** Called after a render is queued. The id is not needed: the runner claims the oldest queued job. */
export function enqueueRender() {
  if (process.env.RENDER_IN_PROCESS === "0") return; // the worker picks it up
  if (!state.reaper) {
    state.reaper = true;
    void reapStuckRenders(15).catch(() => {});
    setInterval(() => void reapStuckRenders(15).catch(() => {}), 5 * 60 * 1000).unref();
  }
  void drain();
}

async function drain() {
  // A wake-up that arrives while draining sets `again`, so a job queued just as the loop saw an
  // empty queue is never missed.
  if (state.draining) { state.again = true; return; }
  state.draining = true;
  try {
    do {
      state.again = false;
      for (let r = await claimNextRender(); r; r = await claimNextRender()) await processRender(r);
    } while (state.again);
  } finally {
    state.draining = false;
  }
}
