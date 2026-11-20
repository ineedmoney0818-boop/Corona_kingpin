import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export const inputClass = "w-full h-10 px-3 rounded-md border border-border-input bg-bg text-text text-base placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[invalid=true]:border-danger";

export function Field({ label, help, error, className, ...input }:
  InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode; error?: string | null }) {
  const id = useId();
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5">{label}</label>
      <input id={id} className={inputClass} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {help && <p id={`${id}-help`} className="text-sm text-text-muted mt-1.5">{help}</p>}
      {error && <p id={`${id}-err`} className="text-sm text-danger mt-1.5">{error}</p>}
    </div>
  );
}
