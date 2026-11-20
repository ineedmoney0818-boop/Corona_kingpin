import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { latestRenders, listGenerations } from "@/lib/data";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Library" };
const STATUS: Record<string, string> = { queued: "In line", rendering: "Rendering", succeeded: "Ready", failed: "Didn't render · refunded", canceled: "Canceled" };

async function Grid() {
  const user = await requireUser();
  const [gens, renders] = await Promise.all([listGenerations(user.id), latestRenders(user.id)]);
  if (gens.length === 0) return <EmptyState title="Nothing made yet" action={<ButtonLink href="/app">Make your first reel</ButtonLink>}>Your reels and carousels land here.</EmptyState>;
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {gens.map((g) => {
        const r = renders.get(g.id);
        const thumb = r?.status === "succeeded" ? r.outputKeys[0] : null;
        return (
          <li key={g.id}>
            <Link href={`/app/generations/${g.id}`} className="block overflow-hidden rounded-lg border border-border bg-surface hover:shadow-card">
              <div className="grid aspect-[4/5] place-items-center bg-surface-2">
                {thumb && g.kind === "carousel"
                  // eslint-disable-next-line @next/next/no-img-element -- private, owner-only file
                  ? <img src={`/api/files/${thumb}`} alt="" className="h-full w-full object-cover" />
                  : thumb ? <video src={`/api/files/${thumb}#t=0.5`} muted preload="metadata" className="h-full w-full object-cover" aria-hidden="true" />
                  : <span className="px-3 text-center text-sm text-text-muted">{r ? STATUS[r.status] : "Not rendered"}</span>}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold" title={g.plan.hook}>{g.plan.hook || "Untitled"}</p>
                <p className="text-xs text-text-muted">{g.kind === "reel" ? "Reel" : "Carousel"} · {r ? STATUS[r.status] : "Not rendered"}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[var(--layout-content-max)] px-4 py-6">
      <h1 className="text-2xl font-bold">Library</h1>
      <div className="mt-6"><Suspense fallback={<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>}><Grid /></Suspense></div>
    </div>
  );
}
