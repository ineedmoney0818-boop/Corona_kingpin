import { execFile } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { ffBin } from "@/lib/ffmpeg-bin";
const run = promisify(execFile);

// Remotion's ffprobe is built without TLS. For https inputs, serve the file on a loopback http port that
// forwards Range requests, so ffprobe reads only the bytes it needs (headers, plus the index at the end of
// phone videos) instead of downloading a 500 MB file into the function.
async function asHttp<T>(input: string, fn: (url: string) => Promise<T>): Promise<T> {
  if (!input.startsWith("https://")) return fn(input);
  const server = http.createServer(async (req, res) => {
    const ac = new AbortController();
    res.on("close", () => ac.abort());
    try {
      const up = await fetch(input, { headers: req.headers.range ? { range: req.headers.range } : {}, signal: ac.signal });
      const headers: Record<string, string> = {};
      for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) { const v = up.headers.get(k); if (v) headers[k] = v; }
      res.writeHead(up.status, headers);
      if (req.method === "HEAD" || !up.body) { res.end(); return; }
      Readable.fromWeb(up.body as import("node:stream/web").ReadableStream).on("error", () => res.destroy()).pipe(res);
    } catch {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    // Keep the extension: this ffprobe build detects image formats by file name, not content.
    const ext = path.extname(new URL(input).pathname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    return await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}/file${ext}`);
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

/** Width, height and duration from ffprobe. Accepts a local path or a (signed) https URL. */
export async function probe(input: string): Promise<{ width: number | null; height: number | null; durationMs: number | null } | null> {
  try {
    const { bin, env } = ffBin("ffprobe");
    const { stdout } = await asHttp(input, (src) => run(bin, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", src], { timeout: 30_000, env }));
    const j = JSON.parse(stdout);
    if (!j.streams?.length) return null;
    return { width: j.streams[0].width ?? null, height: j.streams[0].height ?? null, durationMs: j.format?.duration ? Math.round(Number(j.format.duration) * 1000) : null };
  } catch { return null; }
}
