import { z } from "zod";
import { createAsset } from "@/lib/data";
import { ALLOWED, signedUrl } from "@/lib/storage";
import { adminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { probe } from "@/lib/media-probe";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ key: z.string().max(300), name: z.string().min(1).max(200) });
// Step 2: the file is in storage. Verify owner folder, real type and size, read metadata, then record it.
export const POST = withUser(async (user, req: Request) => {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success || !b.data.key.startsWith(`${user.id}/uploads/`)) return err(400, "bad_request", "That upload isn't yours.");
  const bucket = adminClient().storage.from(MEDIA_BUCKET);
  const info = await bucket.info(b.data.key);
  const type = (info.data?.contentType ?? "").split(";")[0];
  const kind = ALLOWED[type];
  const size = info.data?.size ?? 0;
  const url = kind ? await signedUrl(b.data.key, 300) : null;
  const meta = url ? await probe(url) : null;
  if (!info.data || !kind || !meta) {
    await bucket.remove([b.data.key]); // don't keep files we refused
    return err(422, "unreadable", "We couldn't read that file. Use a JPG, PNG, WebP, MP4, MOV or WebM.");
  }
  const asset = await createAsset({
    userId: user.id, projectId: null, kind, source: "upload", storageKey: b.data.key, fileName: b.data.name.slice(0, 200),
    mimeType: type, bytes: size, width: meta.width, height: meta.height, durationMs: kind === "video" ? meta.durationMs : null,
    status: "ready", description: null,
  });
  return json({ asset });
});
