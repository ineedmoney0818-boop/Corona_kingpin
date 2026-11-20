import { execSync } from "node:child_process";
// Fresh database (migrations + seed) and an empty mailbox before every run.
export default async function globalSetup() {
  // Keys for the local stack come from the CLI, so none are stored in the repo.
  const status = execSync("npx supabase@3.2.0 status -o env --workdir ..", { timeout: 60_000 }).toString();
  const secret = status.match(/^SECRET_KEY="?([^"\n]+)"?$/m)?.[1];
  if (!secret) throw new Error("Local Supabase is not running: npm run db:start");
  process.env.E2E_SUPABASE_SECRET_KEY = secret;
  execSync("npx supabase@3.2.0 db reset --workdir ..", { stdio: "ignore", timeout: 300_000 });
  await fetch("http://127.0.0.1:54324/api/v1/messages", { method: "DELETE" }).catch(() => {});
}
