import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

/** Width, height and duration from ffprobe. Accepts a local path or a (signed) https URL. */
export async function probe(input: string): Promise<{ width: number | null; height: number | null; durationMs: number | null } | null> {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", input], { timeout: 30_000 });
    const j = JSON.parse(stdout);
    if (!j.streams?.length) return null;
    return { width: j.streams[0].width ?? null, height: j.streams[0].height ?? null, durationMs: j.format?.duration ? Math.round(Number(j.format.duration) * 1000) : null };
  } catch { return null; }
}
