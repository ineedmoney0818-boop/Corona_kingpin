import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RenderCard } from "@/components/app/RenderCard";
import { ReRender } from "@/components/app/ReRender";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { getGeneration, listRenders, NotFound } from "@/lib/data";

async function View({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const gen = await getGeneration(user.id, (await params).id).catch((e) => { if (e instanceof NotFound) notFound(); throw e; });
  const renders = await listRenders(user.id, gen.id);
  const latest = renders[0];
  return (
    <>
      <p className="text-sm"><Link className="text-accent hover:underline" href={gen.chatId ? `/app/chats/${gen.chatId}` : "/app/library"}>← Back</Link></p>
      <h1 className="mt-2 text-xl font-bold">{gen.plan.hook || "Untitled"}</h1>
      <p className="text-sm text-text-muted">{gen.kind === "reel" ? "Reel" : "Carousel"} · {gen.plan.scenes.length} {gen.kind === "reel" ? "scenes" : "slides"} · version {gen.planVersion}</p>
      <div className="mt-4">{latest && <RenderCard key={latest.id} initial={latest} generationId={gen.id} kind={gen.kind} caption={gen.plan.caption} showOpen={false} />}</div>
      {(!latest || latest.status === "failed" || latest.planVersion < gen.planVersion) && <div className="mt-4"><ReRender generationId={gen.id} reason={latest?.status === "failed" ? "retry" : "edits"} /></div>}
      {renders.length > 1 && (
        <details className="mt-6 text-sm"><summary className="cursor-pointer font-semibold">Render history ({renders.length})</summary>
          <ul className="mt-2 space-y-1 text-text-muted">{renders.map((r) => <li key={r.id}>{new Date(r.createdAt).toLocaleString()} · v{r.planVersion} · {r.status}{r.status === "failed" ? ` · ${r.creditsQuoted} credits refunded` : ` · ${r.creditsQuoted} credits`}</li>)}</ul>
        </details>
      )}
    </>
  );
}
export default function GenerationPage({ params }: { params: Promise<{ id: string }> }) {
  return <div className="mx-auto max-w-[var(--layout-chat-max)] px-4 py-6"><Suspense fallback={<Skeleton className="aspect-[9/16] max-w-sm" />}><View params={params} /></Suspense></div>;
}
