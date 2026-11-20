"use client";
import { Suspense, useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { LinkErrorNotice } from "./LinkErrorNotice";
import { requestPasswordReset, setNewPassword, signIn, signInWithGoogle, signUp, type AuthState } from "./actions";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";
const ACTIONS = { "sign-in": signIn, "sign-up": signUp, forgot: requestPasswordReset, reset: setNewPassword };
const COPY: Record<Mode, { h: string; sub: string; cta: string }> = {
  "sign-up": { h: "Make your account", sub: "10 free credits a month. No card.", cta: "Make my account" },
  "sign-in": { h: "Welcome back", sub: "Sign in to keep making.", cta: "Sign in" },
  forgot: { h: "Reset your password", sub: "We'll email you a link.", cta: "Send reset link" },
  reset: { h: "Choose a new password", sub: "At least 8 characters.", cta: "Save password" },
};

export function AuthForm({ mode, google }: { mode: Mode; google: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(ACTIONS[mode], undefined);
  const c = COPY[mode];
  const needsEmail = mode !== "reset", needsPassword = mode !== "forgot";
  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-display text-xl font-extrabold">reel<span className="text-accent">plain</span></Link>
      <h1 className="mt-8 text-2xl font-bold">{c.h}</h1>
      <p className="mt-1 text-sm text-text-muted">{c.sub}</p>
      <Suspense fallback={null}><LinkErrorNotice /></Suspense>
      {(mode === "sign-in" || mode === "sign-up") && (
        <>
          <form action={signInWithGoogle} className="mt-6">
            <Button type="submit" variant="secondary" className="w-full" disabled={!google} aria-describedby={google ? undefined : "google-note"}>Continue with Google</Button>
          </form>
          {!google && <p id="google-note" className="mt-1.5 text-xs text-text-muted">Google sign-in turns on when the live database is connected.</p>}
          <div className="my-5 flex items-center gap-3 text-xs text-text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
        </>
      )}
      {state?.notice ? <Notice kind="success" role="status" className="mt-6">{state.notice}</Notice> : (
        <form action={action} className="mt-4 space-y-4" noValidate>
          {state?.error && <Notice kind="danger" role="alert">{state.error}</Notice>}
          {mode === "sign-up" && <Field label="Name" name="name" autoComplete="name" required error={state?.fieldErrors?.name} />}
          {needsEmail && <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} error={state?.fieldErrors?.email} />}
          {needsPassword && <Field label={mode === "reset" ? "New password" : "Password"} name="password" type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8}
            help={mode === "sign-up" ? "At least 8 characters." : undefined} error={state?.fieldErrors?.password} />}
          <Button type="submit" size="lg" className="w-full" loading={pending}>{c.cta}</Button>
        </form>
      )}
      <div className="mt-6 space-y-2 text-sm text-text-muted">
        {mode === "sign-in" && <p><Link className="font-semibold text-accent hover:underline" href="/forgot-password">Forgot your password?</Link></p>}
        {mode === "sign-up" ? <p>Already have an account? <Link className="font-semibold text-accent hover:underline" href="/sign-in">Sign in</Link></p>
          : <p>New here? <Link className="font-semibold text-accent hover:underline" href="/sign-up">Make an account</Link></p>}
      </div>
    </div>
  );
}
