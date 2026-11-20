import type { Metadata } from "next";
import { Suspense } from "react";
import { Composer } from "@/components/app/Composer";
import { requireUser } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "New chat" };

async function Greeting() {
  const u = await requireUser();
  return <h1 className="text-2xl font-bold">What are we making, {u.displayName.split(" ")[0]}?</h1>;
}

export default function NewChat() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[var(--layout-chat-max)] flex-col justify-center px-4 py-10 lg:min-h-dvh">
      <Suspense fallback={<Skeleton className="h-8 w-80" />}><Greeting /></Suspense>
      <p className="mt-2 text-text-muted">Attach your clips or photos, say what you want, and pick reel or carousel. The price shows on the button before anything runs.</p>
      <div className="mt-6"><Composer chatId={null} /></div>
      <ul className="mt-6 grid gap-2 text-sm text-text-muted sm:grid-cols-3">
        <li className="rounded-md bg-surface p-3">The cost is on the button.</li>
        <li className="rounded-md bg-surface p-3">Failed renders give your credits back.</li>
        <li className="rounded-md bg-surface p-3">Your footage is used as-is. No AI swaps.</li>
      </ul>
    </div>
  );
}
