"use client";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { inputClass } from "./Field";

/** Password input with a show/hide toggle (spec: components.md "Password field"). */
export function PasswordField({ label, help, error, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode; error?: string | null }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <input id={id} {...input} type={shown ? "text" : "password"} className={inputClass + " pr-20"}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
        <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-controls={id}
          className="absolute right-1 top-1 h-8 rounded-sm px-2 text-sm font-semibold text-text-muted hover:bg-surface-2">
          {shown ? "Hide" : "Show"}<span className="sr-only"> password</span>
        </button>
      </div>
      {help && <p id={`${id}-help`} className="mt-1.5 text-sm text-text-muted">{help}</p>}
      {error && <p id={`${id}-err`} className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
