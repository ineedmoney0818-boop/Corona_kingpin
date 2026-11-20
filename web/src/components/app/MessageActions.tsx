"use client";
import { useState } from "react";
import { cn } from "@/components/ui/cn";

export function MessageActions({ id, text, feedback: initial }: { id: string; text: string; feedback: "up" | "down" | null }) {
  const [fb, setFb] = useState(initial);
  const [copied, setCopied] = useState(false);
  async function set(v: "up" | "down") {
    const next = fb === v ? null : v; setFb(next);
    await fetch(`/api/messages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ feedback: next }) });
  }
  const btn = "rounded-sm px-2 py-1 text-xs text-text-muted hover:bg-surface-2";
  return (
    <div className="mt-2 flex gap-1">
      <button type="button" className={btn} onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
      <button type="button" className={cn(btn, fb === "up" && "text-accent")} aria-pressed={fb === "up"} aria-label="Good answer" onClick={() => set("up")}>👍</button>
      <button type="button" className={cn(btn, fb === "down" && "text-accent")} aria-pressed={fb === "down"} aria-label="Bad answer" onClick={() => set("down")}>👎</button>
    </div>
  );
}
