"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, currentUser, hashPassword, SESSION_COOKIE, siteUrl } from "@/lib/auth";
import { createSession, createUser, deleteSession, findCredential, hitRateLimit } from "@/lib/data";
import { isSupabase } from "@/lib/supabase/env";
import { userClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { deleteUserFiles } from "@/lib/storage";
import { cancelSubscriptionsNow } from "@/lib/billing/stripe";

export type AuthState = { error?: string; notice?: string; fieldErrors?: { email?: string; password?: string; name?: string }; email?: string } | undefined;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ipLimited(action: string, max: number) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return !(await hitRateLimit(`${action}:${ip}`, 15 * 60, max));
}
async function startFakeSession(userId: string) {
  const token = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Add your name.";
  if (!EMAIL.test(email)) fieldErrors.email = "That doesn't look like an email address.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };
  if (await ipLimited("signup", 10)) return { error: "Too many sign-ups from here. Try again in 15 minutes.", email };
  if (isSupabase()) {
    const db = await userClient();
    const { data, error } = await db.auth.signUp({ email, password, options: { data: { full_name: name.slice(0, 60) }, emailRedirectTo: `${siteUrl()}/auth/confirm?next=/app` } });
    if (error) return { error: error.message.includes("already") ? "There's already an account with this email. Sign in instead." : "We couldn't make that account. Try again.", email };
    if (!data.session) return { notice: `Check ${email} for a link to confirm your account.`, email };
    redirect("/app");
  }
  try {
    const user = await createUser(email, hashPassword(password), name.slice(0, 60));
    await startFakeSession(user.id);
  } catch (e) {
    if ((e as Error).message === "email_taken") return { fieldErrors: { email: "There's already an account with this email. Sign in instead." }, email };
    throw e;
  }
  redirect("/app");
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (await ipLimited("signin", 20)) return { error: "Too many tries. Wait 15 minutes, or reset your password.", email };
  if (isSupabase()) {
    const db = await userClient();
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: error.code === "email_not_confirmed" ? "Confirm your email first. We sent you a link." : "That email and password don't match an account.", email };
    redirect("/app");
  }
  const cred = await findCredential(email);
  if (!cred || !checkPassword(password, cred.passwordHash)) return { error: "That email and password don't match an account.", email };
  await startFakeSession(cred.userId);
  redirect("/app");
}

export async function signInWithGoogle() {
  if (!isSupabase()) redirect("/sign-in");
  const db = await userClient();
  const { data, error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${siteUrl()}/auth/callback?next=/app` } });
  if (error || !data.url) redirect("/sign-in?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  if (!EMAIL.test(email)) return { fieldErrors: { email: "That doesn't look like an email address." }, email };
  if (await ipLimited("reset", 5)) return { error: "Too many requests. Try again in 15 minutes.", email };
  if (isSupabase()) {
    const db = await userClient();
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password` });
  }
  // Same answer whether or not the account exists, so this can't be used to find accounts.
  return { notice: `If there's an account for ${email}, a reset link is on its way.`, email };
}

export async function setNewPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters." } };
  if (!isSupabase()) return { error: "Password reset needs the live database." };
  const db = await userClient();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "That link has expired. Ask for a new one." };
  redirect("/app");
}

export async function signOut(form?: FormData) {
  const everywhere = form?.get("scope") === "global";
  if (isSupabase()) {
    const db = await userClient();
    await db.auth.signOut({ scope: everywhere ? "global" : "local" });
  } else {
    const jar = await cookies();
    const t = jar.get(SESSION_COOKIE)?.value;
    if (t) await deleteSession(t);
    jar.delete(SESSION_COOKIE);
  }
  redirect("/sign-in");
}

/** Deletes the account for real: stops billing, removes files, then the auth user (rows cascade). */
export async function deleteAccount(_: AuthState, form: FormData): Promise<AuthState> {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
    return { fieldErrors: { email: "Type your email exactly to confirm." } };
  }
  if (!isSupabase()) return { error: "Account deletion needs the live database." };
  await cancelSubscriptionsNow(user.id);
  await deleteUserFiles(user.id);
  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) return { error: "We couldn't delete the account. Contact support and we'll do it by hand." };
  const db = await userClient();
  await db.auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/?deleted=1");
}
