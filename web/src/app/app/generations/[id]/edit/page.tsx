import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Editor } from "@/components/app/Editor";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { getAssets, getGeneration, NotFound } from "@/lib/data";
import type { MediaMap } from "@/remotion/Reel";

async function Load({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const gen = await getGeneration(user.id, (await params).id).catch((e) => { if (e instanceof NotFound) notFound(); throw e; });
  const ids = gen.plan.scenes.map((s) => s.background.assetId).filter((x): x is string => !!x);
  const media: MediaMap = {};
  for (const a of await getAssets(user.id, ids)) media[a.id] = { kind: a.kind, src: `/api/files/${a.storageKey}`, isStatic: false };
  return <Editor generationId={gen.id} initialPlan={gen.plan} baseVersion={gen.planVersion} media={media} />;
}
export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="p-4"><Skeleton className="h-[70dvh]" /></div>}><Load params={params} /></Suspense>;
}
