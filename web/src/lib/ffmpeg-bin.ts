import { existsSync } from "node:fs";
import path from "node:path";

// Vercel has no system ffmpeg/ffprobe. Remotion ships both with the renderer (Linux glibc build, no TLS),
// so use them when present; FFMPEG_DIR overrides; plain names on PATH are the fallback (local dev).
// Routes that call this list the binaries in next.config.ts outputFileTracingIncludes.
export function ffBin(name: "ffmpeg" | "ffprobe"): { bin: string; env: NodeJS.ProcessEnv } {
  const dirs = [process.env.FFMPEG_DIR, path.join(process.cwd(), "node_modules/@remotion/compositor-linux-x64-gnu")];
  for (const dir of dirs) {
    if (dir && existsSync(path.join(dir, name))) {
      return { bin: path.join(dir, name), env: { ...process.env, LD_LIBRARY_PATH: [dir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":") } };
    }
  }
  return { bin: name, env: process.env };
}
