import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Composer } from "@/components/app/Composer";
import { RenderCard } from "@/components/app/RenderCard";
import { MessageActions } from "@/components/app/MessageActions";
import { IdeaCards } from "@/components/app/IdeaCards";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { getAssets, getChat, getGeneration, latestRenders, listMessages, NotFound } from "@/lib/data";

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const chat = await getChat(user.id, id).catch((e) => { if (e instanceof NotFound) notFound(); throw e; });
  const [messages, renders] = await Promise.all([listMessages(user.id, chat.id), latestRenders(user.id)]);
  const assets = await getAssets(user.id, messages.flatMap((m) => m.attachmentIds));
  return (
    <>
      <h1 className="truncate text-lg font-bold" title={chat.title}>{chat.title}</h1>
      <ol className="mt-6 space-y-6">
        {await Promise.all(messages.map(async (m) => {
          if (m.role === "user") return (
            <li key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-surface-2 px-4 py-3">
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.attachmentIds.length > 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  {m.attachmentIds.map((a) => assets.find((x) => x.id === a)?.fileName ?? "file").join(" · ")}
                </p>
              )}
            </li>
          );
          const gen = m.generationId ? await getGeneration(user.id, m.generationId) : null;
          const r = gen ? renders.get(gen.id) : undefined;
          return (
            <li key={m.id}>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {m.ideas && <IdeaCards ideas={m.ideas} />}
              {gen && r && <div className="mt-3"><RenderCard initial={r} generationId={gen.id} kind={gen.kind} caption={gen.plan.caption} /></div>}
              <MessageActions id={m.id} text={m.content} feedback={m.feedback} />
            </li>
          );
        }))}
      </ol>
      <div className="sticky bottom-0 bg-bg pb-4 pt-6"><Composer chatId={chat.id} /></div>
    </>
  );
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-[var(--layout-chat-max)] px-4 pt-6">
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-6 w-60" /><Skeleton className="ml-auto h-16 w-3/4" /><Skeleton className="h-24 w-2/3" /></div>}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}
