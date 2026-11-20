"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { deleteAccount, signOut, type AuthState } from "@/app/(auth)/actions";

export function DangerZone({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(deleteAccount, undefined);
  const [open, setOpen] = useState(false); // controlled, so a refresh after the action doesn't hide its error
  return (
    <div className="space-y-4">
      <form action={signOut}><input type="hidden" name="scope" value="global" />
        <Button variant="secondary" type="submit">Sign out everywhere</Button>
      </form>
      <details className="rounded-md border border-border p-3" open={open || !!state} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-semibold text-danger">Delete my account</summary>
        <p className="mt-2 text-sm">This deletes your account, every upload and render, and stops billing straight away. It can&apos;t be undone.</p>
        <form action={action} className="mt-3 space-y-3">
          {state?.error && <Notice kind="danger" role="alert">{state.error}</Notice>}
          <Field label={`Type ${email} to confirm`} name="confirm" autoComplete="off" error={state?.fieldErrors?.email} />
          <Button variant="danger" type="submit" loading={pending}>Delete everything</Button>
        </form>
      </details>
    </div>
  );
}
