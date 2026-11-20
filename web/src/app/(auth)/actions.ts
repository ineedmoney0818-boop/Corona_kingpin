"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { createSession, createUser, deleteSession, findCredential } from "@/lib/data";

export type AuthState = { error?: string; fieldErrors?: { email?: string; password?: string; name?: string }; email?: string } | undefined;

async function startSession(userId: string) {
  const token = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};
  if (!name) fieldErrors.name = "Add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "That doesn't look like an email address.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email };
  try {
    const user = await createUser(email, hashPassword(password), name.slice(0, 60));
    await startSession(user.id);
  } catch (e) {
    if ((e as Error).message === "email_taken") return { fieldErrors: { email: "There's already an account with this email. Sign in instead." }, email };
    throw e;
  }
  redirect("/app");
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const cred = await findCredential(email);
  if (!cred || !checkPassword(password, cred.passwordHash)) return { error: "That email and password don't match an account.", email };
  await startSession(cred.userId);
  redirect("/app");
}

export async function signOut() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) await deleteSession(t);
  jar.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
