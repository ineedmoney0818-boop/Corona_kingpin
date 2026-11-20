"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import type { Render } from "@/lib/data/types";

type R = Pick<Render, "id" | "status" | "progress" | "creditsQuoted" | "outputKeys" | "errorCode">;
const FAIL_COPY: Record<string, string> = {
  timeout: "This one took too long and stopped.",
  abandoned: "This one was interrupted on our side.",
  render_failed: "This one didn't render.",
  internal_error: "This one didn't render.",
};

export function RenderCard({ initial, generationId, kind, caption, showOpen = true }: { initial: R; generationId: string; kind: "reel" | "carousel"; caption: string; showOpen?: boolean }) {
  const [r, setR] = useState<R>(initial);
  const [slide, setSlide] = useState(0);
  const router = useRouter();
  const active = r.status === "queued" || r.status === "rendering";

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/renders/${r.id}`).catch(() => null);
      if (res?.ok) {
        const next = (await res.json()).render as R;
        setR(next);
        if (next.status !== "queued" && next.status !== "rendering") router.refresh(); // balance in the sidebar changes on refund
      }
    }, 1500);
    return () => clearInterval(t);
  }, [active, r.id, router]);

  return (
    <div className="max-w-sm rounded-lg border border-border bg-surface p-3 shadow-card">
      {active && (
        <div role="status" aria-live="polite" className="py-6">
          <p className="text-sm mb-2">{r.status === "queued" ? "In line…" : `Rendering… ${Math.round(r.progress * 100)}%`}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Render progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.progress * 100)}>
            <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.max(4, r.progress * 100)}%` }} />
          </div>
        </div>
      )}
      {r.status === "failed" && (
        <Notice kind="success" role="status">
          <strong>{FAIL_COPY[r.errorCode ?? ""] ?? "This one didn't render."} Your {r.creditsQuoted} credit{r.creditsQuoted === 1 ? "" : "s"} {r.creditsQuoted === 1 ? "is" : "are"} back.</strong>
          <div className="mt-2"><Link href={`/app/generations/${generationId}`} className={buttonClass("secondary", "sm")}>Try again</Link></div>
        </Notice>
      )}
      {r.status === "succeeded" && kind === "reel" && (
        <video controls playsInline preload="metadata" className="aspect-[9/16] w-full rounded-md bg-text" src={`/api/files/${r.outputKeys[0]}`} aria-label="Your reel">
          Your browser can&apos;t play this. Download it instead.
        </video>
      )}
      {r.status === "succeeded" && kind === "carousel" && (
        <div role="region" aria-roledescription="carousel" aria-label="Your carousel">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, owner-only file */}
          <img src={`/api/files/${r.outputKeys[slide]}`} alt={`Slide ${slide + 1} of ${r.outputKeys.length}`} className="aspect-[4/5] w-full rounded-md object-cover" />
          <div className="mt-2 flex items-center justify-between">
            <button type="button" className={buttonClass("ghost", "sm")} disabled={slide === 0} onClick={() => setSlide((s) => s - 1)} aria-label="Previous slide">←</button>
            <span className="text-sm text-text-muted" aria-live="polite">Slide {slide + 1} of {r.outputKeys.length}</span>
            <button type="button" className={buttonClass("ghost", "sm")} disabled={slide >= r.outputKeys.length - 1} onClick={() => setSlide((s) => s + 1)} aria-label="Next slide">→</button>
          </div>
        </div>
      )}
      {r.status === "succeeded" && (
        <>
          <p className="mt-3 whitespace-pre-line text-sm">{caption}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.outputKeys.length === 1
              ? <a className={buttonClass("primary", "sm")} href={`/api/renders/${r.id}/download`} download>Download</a>
              : <a className={buttonClass("primary", "sm")} href={`/api/renders/${r.id}/download?i=${slide}`} download>Download slide {slide + 1}</a>}
            <Link className={buttonClass("secondary", "sm")} href={`/app/generations/${generationId}/edit`}>Edit</Link>
            {showOpen && <Link className={buttonClass("ghost", "sm")} href={`/app/generations/${generationId}`}>Open</Link>}
          </div>
        </>
      )}
    </div>
  );
}
