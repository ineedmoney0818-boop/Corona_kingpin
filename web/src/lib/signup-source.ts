import "server-only";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";

/** First-touch attribution cookie, set by proxy.ts from ?utm_source=&utm_campaign=. */
export const SOURCE_COOKIE = "rp_src";
const CLEAN = /^[a-z0-9_.-]{1,40}$/;

function cleanTag(v: string | null | undefined): string | null {
  const t = (v ?? "").trim().toLowerCase();
  return CLEAN.test(t) ? t : null;
}

export async function readSource(): Promise<{ signup_source: string; signup_campaign: string | null } | null> {
  const raw = (await cookies()).get(SOURCE_COOKIE)?.value;
  if (!raw) return null;
  const [s, c] = decodeURIComponent(raw).split("|");
  const source = cleanTag(s);
  return source ? { signup_source: source, signup_campaign: cleanTag(c) } : null;
}

/** Google sign-ups: tag the profile if it was created in the last 15 minutes and has no source yet. */
export async function attributeNewProfile(userId: string): Promise<void> {
  const src = await readSource();
  if (!src) return;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await adminClient().from("profiles").update(src).eq("id", userId).is("signup_source", null).gte("created_at", since);
}
