import { z } from "zod";
import { createQuote } from "@/lib/data";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ kind: z.enum(["new-reel", "new-carousel", "re-render"]) });
export const POST = withUser(async (user, req: Request) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Unknown kind of quote.");
  return json({ quote: await createQuote(user.id, b.data.kind) });
});
