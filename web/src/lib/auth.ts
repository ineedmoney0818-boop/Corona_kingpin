import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getProfile, userForSession, type User } from "@/lib/data";
import { isSupabase } from "@/lib/supabase/env";
import { userClient } from "@/lib/supabase/server";

// Fake-mode: email + password with scrypt hashes and an httpOnly session cookie.
// Supabase mode: Supabase Auth session cookies, checked with the auth server (getUser) on every request.
export const SESSION_COOKIE = "rp_session";

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function currentUser(): Promise<User | null> {
  if (isSupabase()) {
    // getUser() asks the auth server, so a revoked session ("sign out everywhere") is rejected at once.
    // getClaims() only checks the signature and would accept a revoked token until it expires.
    const db = await userClient();
    const { data } = await db.auth.getUser();
    return data.user ? getProfile(data.user.id, data.user.email ?? "") : null;
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? userForSession(token) : null;
}
export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/sign-in");
  return u;
}
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
