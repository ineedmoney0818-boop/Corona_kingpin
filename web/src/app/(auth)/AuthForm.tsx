"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "sign-in" ? signIn : signUp, undefined);
  const up = mode === "sign-up";
  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="font-display text-xl font-extrabold">reel<span className="text-accent">plain</span></Link>
      <h1 className="text-2xl font-bold mt-8">{up ? "Make your account" : "Welcome back"}</h1>
      <p className="text-sm text-text-muted mt-1">{up ? "10 free credits a month. No card." : "Sign in to keep making."}</p>
      <Button type="button" variant="secondary" className="w-full mt-6" disabled aria-describedby="google-note">Continue with Google</Button>
      <p id="google-note" className="text-xs text-text-muted mt-1.5">Google sign-in turns on when the live database is connected.</p>
      <div className="flex items-center gap-3 my-5 text-xs text-text-muted"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
      <form action={action} className="space-y-4" noValidate>
        {state?.error && <Notice kind="danger" role="alert">{state.error}</Notice>}
        {up && <Field label="Name" name="name" autoComplete="name" required error={state?.fieldErrors?.name} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} error={state?.fieldErrors?.email} />
        <Field label="Password" name="password" type="password" autoComplete={up ? "new-password" : "current-password"} required minLength={8}
          help={up ? "At least 8 characters." : undefined} error={state?.fieldErrors?.password} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>{up ? "Make my account" : "Sign in"}</Button>
      </form>
      <p className="text-sm text-text-muted mt-6">
        {up ? <>Already have an account? <Link className="text-accent font-semibold underline-offset-2 hover:underline" href="/sign-in">Sign in</Link></>
            : <>New here? <Link className="text-accent font-semibold underline-offset-2 hover:underline" href="/sign-up">Make an account</Link></>}
      </p>
    </div>
  );
}
