"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CostChip } from "@/components/ui/CostChip";
import { Notice } from "@/components/ui/Notice";
import type { Quote } from "@/lib/data/types";

export function ReRender({ generationId, reason }: { generationId: string; reason: "retry" | "edits" }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const router = useRouter();
  async function fetchQuote(): Promise<Quote | null> {
    const r = await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "re-render" }) }).catch(() => null);
    return r?.ok ? (await r.json()).quote : null;
  }
  const getQuote = async () => setQuote(await fetchQuote());
  useEffect(() => {
    let live = true;
    void fetchQuote().then((q) => { if (live) setQuote(q); });
    return () => { live = false; };
  }, []);
  async function go() {
    if (!quote) return;
    key.current ??= crypto.randomUUID();
    setBusy(true); setError(null);
    const r = await fetch(`/api/generations/${generationId}/renders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quoteId: quote.id, idempotencyKey: key.current }) });
    const j = await r.json().catch(() => null);
    setBusy(false);
    if (!r.ok) { setError(j?.error?.message ?? "That didn't work. Nothing was charged."); if (j?.error?.code === "quote_expired") void getQuote(); return; }
    key.current = null; router.refresh();
  }
  return (
    <div>
      {error && <Notice kind="danger" role="alert" className="mb-2">{error}</Notice>}
      <Button onClick={go} disabled={!quote} loading={busy}>
        {reason === "retry" ? "Try again" : "Render my edits"} {quote && <CostChip credits={quote.credits} />}
      </Button>
    </div>
  );
}
