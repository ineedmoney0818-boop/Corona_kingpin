"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { CostChip } from "@/components/ui/CostChip";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/components/ui/cn";
import type { Asset, Quote } from "@/lib/data/types";

type Attachment = { localId: string; name: string; status: "uploading" | "ready" | "failed"; asset?: Asset; error?: string };
type Kind = "reel" | "carousel";
const dur = (ms: number | null) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, "0")}` : "");

export function Composer({ chatId }: { chatId: string | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("reel");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<{ message: string; short?: { needed: number; available: number } } | null>(null);
  const [sending, setSending] = useState(false);
  const idemKey = useRef<string | null>(null); // made on first tap, reused on retries, cleared after success
  const fileInput = useRef<HTMLInputElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);

  const fetchQuote = useCallback(async (k: Kind): Promise<Quote | null> => {
    const r = await fetch("/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: k === "reel" ? "new-reel" : "new-carousel" }) }).catch(() => null);
    return r?.ok ? (await r.json()).quote : null;
  }, []);
  const refreshQuote = useCallback(async (k: Kind) => setQuote(await fetchQuote(k)), [fetchQuote]);
  useEffect(() => {
    let live = true;
    void fetchQuote(kind).then((q) => { if (live) setQuote(q); });
    return () => { live = false; };
  }, [kind, fetchQuote]);

  async function upload(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      const localId = crypto.randomUUID();
      setFiles((f) => [...f, { localId, name: file.name, status: "uploading" }]);
      const body = new FormData(); body.append("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      setFiles((f) => f.map((a) => a.localId !== localId ? a
        : r?.ok ? { ...a, status: "ready", asset: j.asset } : { ...a, status: "failed", error: j?.error?.message ?? "Upload failed. Check your connection and try again." }));
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  const liveQuote = quote && quote.kind === (kind === "reel" ? "new-reel" : "new-carousel") ? quote : null;
  const ready = files.filter((f) => f.status === "ready" && f.asset);
  const uploading = files.some((f) => f.status === "uploading");
  const hasVideo = ready.some((f) => f.asset!.kind === "video");
  const carouselBlocked = kind === "carousel" && hasVideo;
  const short = !!liveQuote && liveQuote.balanceAfter < 0;
  const canSend = !!text.trim() && !!liveQuote && !short && !uploading && !sending && !carouselBlocked;

  async function submit() {
    if (!canSend || !liveQuote) return;
    const quote = liveQuote;
    if (new Date(quote.expiresAt).getTime() < Date.now()) { await refreshQuote(kind); return; }
    idemKey.current ??= crypto.randomUUID();
    setSending(true); setError(null);
    const r = await fetch("/api/generations", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId, prompt: text, attachmentIds: ready.map((f) => f.asset!.id), kind, quoteId: quote.id, idempotencyKey: idemKey.current }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setSending(false);
    if (!r || !r.ok) {
      const e = j?.error;
      if (e?.code === "quote_expired") void refreshQuote(kind);
      setError({ message: e?.message ?? "That didn't go through. Nothing was charged. Try again.", short: e?.code === "insufficient_credits" ? { needed: e.needed, available: e.available } : undefined });
      return;
    }
    idemKey.current = null;
    setText(""); setFiles([]); void refreshQuote(kind);
    if (j.chatId && j.chatId !== chatId) router.push(`/app/chats/${j.chatId}`);
    router.refresh();
  }

  const label = kind === "reel" ? "Make reel" : "Make carousel";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-label="Message Reelplain" className="rounded-lg border border-border-input bg-bg p-3 shadow-card">
      {error && (
        <Notice kind={error.short ? "warning" : "danger"} role="alert" className="mb-3">
          {error.short ? <>You have {error.short.available} credit{error.short.available === 1 ? "" : "s"}, this needs {error.short.needed}. <Link href="/app/settings#credits" className="underline">Get credits</Link></> : error.message}
        </Notice>
      )}
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-live="polite">
          {files.map((f) => (
            <li key={f.localId} className={cn("flex max-w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs", f.status === "failed" ? "bg-danger-subtle text-danger" : "bg-surface-2")}>
              <span aria-hidden="true">{f.asset?.kind === "video" ? "🎬" : "🖼"}</span>
              <span className="truncate max-w-48">{f.name}</span>
              {f.asset?.durationMs ? <span className="text-text-muted">· {dur(f.asset.durationMs)}</span> : null}
              {f.status === "uploading" && <span className="text-text-muted">· uploading…</span>}
              {f.status === "failed" && <span>· {f.error}</span>}
              <button type="button" className="ml-1 rounded-sm px-1 hover:bg-bg" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((a) => a.localId !== f.localId))}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <label htmlFor="composer-text" className="sr-only">What do you want to make?</label>
      <textarea
        id="composer-text" ref={textArea} rows={2} value={text} maxLength={2000}
        onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
        placeholder="Drop in a video or a few photos and say what you want. I'll show the cost first."
        className="block w-full resize-none bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
      />
      {carouselBlocked && <p className="mt-2 text-sm text-warning font-semibold">Carousels use photos. Remove the videos, or make a reel.</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input ref={fileInput} id="composer-files" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => void upload(e.target.files)} />
          <label htmlFor="composer-files" className={buttonClass("ghost", "sm", "cursor-pointer")}>
            <span aria-hidden="true">📎</span> Attach
          </label>
          <div role="group" aria-label="What to make" className="inline-flex rounded-md bg-surface-2 p-0.5">
            {(["reel", "carousel"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                className={cn("rounded-sm px-3 py-1 text-sm font-semibold", kind === k ? "bg-bg text-text shadow-card" : "text-text-muted")}>
                {k === "reel" ? "Reel" : "Carousel"}
              </button>
            ))}
          </div>
        </div>
        {short && liveQuote ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">You have {liveQuote.balanceAfter + liveQuote.credits}, this needs {liveQuote.credits}.</span>
            <Link href="/app/settings#credits" className={buttonClass("secondary", "md")}>Get credits</Link>
          </span>
        ) : (
        <Button type="submit" disabled={!canSend} loading={sending}
          aria-label={liveQuote ? `${label}, uses ${liveQuote.credits} credit${liveQuote.credits === 1 ? "" : "s"}` : `${label}, getting the price`}>
          {sending ? "Starting…" : label} {liveQuote ? <CostChip credits={liveQuote.credits} /> : <span className="text-xs opacity-80">pricing…</span>}
        </Button>
        )}
      </div>
      {liveQuote && <p className="mt-2 text-xs text-text-muted">{liveQuote.balanceAfter >= 0 ? `You'll have ${liveQuote.balanceAfter} left.` : ""}{liveQuote.watermark ? " Free plan exports carry a small watermark." : ""} If it fails, the credits come back.</p>}
    </form>
  );
}
