import { z } from "zod";
import { hitRateLimit } from "@/lib/data";
import { adminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { checkUpload } from "@/lib/api/upload-rules";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ name: z.string().min(1).max(200), type: z.string().max(100), size: z.number().int().nonnegative() });
// Step 1 of a direct upload: checks type and size, then signs an upload URL for a key in the user's folder.
export const POST = withUser(async (user, req: Request) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Pick a file to upload.");
  if (!(await hitRateLimit(`upload:${user.id}`, 60, 30))) return err(429, "rate_limited", "That's a lot of uploads at once. Wait a minute and try again.");
  const c = checkUpload(user.id, b.data.name, b.data.type, b.data.size);
  if ("status" in c) return err(c.status, c.code, c.message);
  const { data, error } = await adminClient().storage.from(MEDIA_BUCKET).createSignedUploadUrl(c.key);
  if (error || !data) return err(503, "storage_unavailable", "Uploads are unavailable right now. Try again in a moment.");
  return json({ key: c.key, token: data.token, path: data.path });
});
