import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { userForSession, type User } from "@/lib/data";

// Fake-mode auth: email + password with scrypt hashes and an httpOnly session cookie.
// replica-backend swaps this for Supabase Auth (Google OAuth + email/password).
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
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? userForSession(token) : null;
}
export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/sign-in");
  return u;
}
