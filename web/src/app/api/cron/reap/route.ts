import { reapStuckRenders } from "@/lib/data/system";
import { cronAuthorized } from "@/lib/api/cron";
// Every 5 minutes: renders stuck over 15 minutes fail and are refunded.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  return Response.json({ reaped: await reapStuckRenders(15) });
}
