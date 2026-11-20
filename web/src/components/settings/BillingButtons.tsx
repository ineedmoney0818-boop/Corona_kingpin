"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";

export function BillingButtons({ plan, enabled }: { plan: "try" | "creator" | "studio"; enabled: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function go(path: string, body?: object, tag = path) {
    setBusy(tag); setError(null);
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r?.ok && j?.url) { window.location.href = j.url; return; }
    setBusy(null); setError(j?.error?.message ?? "That didn't work. Nothing was charged.");
  }
  if (!enabled) return <Notice className="mt-3">Paid plans and one-tap cancel switch on when billing is connected. Nothing is charged until then.</Notice>;
  return (
    <div className="mt-3 space-y-3">
      {error && <Notice kind="danger" role="alert">{error}</Notice>}
      {plan === "try" ? (
        <div className="flex flex-wrap gap-2">
          <Button loading={busy === "creator"} onClick={() => go("/api/billing/checkout", { price: "creator_monthly" }, "creator")}>Creator · $19/month</Button>
          <Button variant="secondary" loading={busy === "studio"} onClick={() => go("/api/billing/checkout", { price: "studio_monthly" }, "studio")}>Studio · $49/month</Button>
        </div>
      ) : (
        <Button variant="secondary" loading={busy === "portal"} onClick={() => go("/api/billing/portal", undefined, "portal")}>Manage or cancel plan</Button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Need more now?</span>
        <Button size="sm" variant="secondary" loading={busy === "c50"} onClick={() => go("/api/billing/checkout", { price: "credits_50" }, "c50")}>50 credits · $6</Button>
        <Button size="sm" variant="secondary" loading={busy === "c200"} onClick={() => go("/api/billing/checkout", { price: "credits_200" }, "c200")}>200 credits · $20</Button>
      </div>
      <p className="text-xs text-text-muted">Cancel any time in one click. You keep your plan and credits until the period ends.</p>
    </div>
  );
}
