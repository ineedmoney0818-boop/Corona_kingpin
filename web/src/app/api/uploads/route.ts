import { createAsset, hitRateLimit } from "@/lib/data";
import { putFile, toLocalFile } from "@/lib/storage";
import { probe } from "@/lib/media-probe";
import { checkUpload } from "@/lib/api/upload-rules";
import { isSupabase } from "@/lib/supabase/env";
import { err, json, withUser } from "@/lib/api/http";

// Direct upload (fake mode / small files). With Supabase, the browser uses /api/uploads/sign + /complete
// so large videos never pass through the web server (hosting body limits).
export const POST = withUser(async (user, req: Request) => {
  if (isSupabase()) return err(400, "use_signed_upload", "Uploads go straight to storage. Update the app and try again.");
  if (!(await hitRateLimit(`upload:${user.id}`, 60, 30))) return err(429, "rate_limited", "That's a lot of uploads at once. Wait a minute and try again.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return err(400, "no_file", "Pick a file to upload.");
  const c = checkUpload(user.id, file.name, file.type, file.size);
  if ("status" in c) return err(c.status, c.code, c.message);
  await putFile(c.key, Buffer.from(await file.arrayBuffer()), file.type);
  const local = await toLocalFile(c.key);
  const meta = await probe(local.file); await local.cleanup();
  if (!meta) return err(422, "unreadable", "We couldn't read that file. Try exporting it again.");
  const asset = await createAsset({
    userId: user.id, projectId: null, kind: c.kind, source: "upload", storageKey: c.key, fileName: file.name.slice(0, 200),
    mimeType: file.type, bytes: file.size, width: meta.width, height: meta.height,
    durationMs: c.kind === "video" ? meta.durationMs : null, status: "ready", description: null,
  });
  return json({ asset });
});
