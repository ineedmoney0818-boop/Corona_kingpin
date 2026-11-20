import { Suspense } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { Skeleton } from "@/components/ui/Skeleton";

function SidebarSkeleton() {
  return <div className="space-y-3 p-4"><Skeleton className="h-7 w-28" /><Skeleton className="h-10" />{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8" />)}</div>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[var(--layout-sidebar)_1fr] min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-bg focus:p-2">Skip to content</a>
      <aside className="hidden lg:block sticky top-0 h-dvh border-r border-border bg-surface">
        <Suspense fallback={<SidebarSkeleton />}><Sidebar /></Suspense>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-bg px-2 lg:hidden">
          <Suspense fallback={<span className="size-10" aria-hidden="true" />}><MobileNav><Suspense fallback={<SidebarSkeleton />}><Sidebar /></Suspense></MobileNav></Suspense>
          <Link href="/app" className="font-display text-lg font-extrabold">reel<span className="text-accent">plain</span></Link>
        </header>
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
