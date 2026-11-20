import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Editor, type LibraryItem } from "@/components/app/Editor";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { getGeneration, listAssets, NotFound } from "@/lib/data";

async function Load({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const gen = await getGeneration(user.id, (await params).id).catch((e) => { if (e instanceof NotFound) notFound(); throw e; });
  // The user's own media only: the picker and the preview both come from this list.
  const library: LibraryItem[] = (await listAssets(user.id)).filter((a) => a.status === "ready")
    .map((a) => ({ id: a.id, kind: a.kind, src: `/api/files/${a.storageKey}`, name: a.fileName, durationMs: a.durationMs }));
  return <Editor generationId={gen.id} initialPlan={gen.plan} baseVersion={gen.planVersion} library={library} />;
}
export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="p-4"><Skeleton className="h-[70dvh]" /></div>}><Load params={params} /></Suspense>;
}
