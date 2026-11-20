// Bundle the Remotion template once (image build), so renders skip webpack. Usage: node scripts/prebundle.mjs <outDir>
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleTo } from "./render-job.mjs";

const out = path.resolve(process.argv[2] ?? ".remotion-bundle");
const emptyPublic = mkdtempSync(path.join(tmpdir(), "rp-public-"));
mkdirSync(out, { recursive: true });
await bundleTo(out, emptyPublic);
console.log(`bundled to ${out}`);
