import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[var(--layout-content-max)] px-4">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="font-display text-xl font-extrabold">reel<span className="text-accent">plain</span></Link>
        <nav aria-label="Site" className="flex items-center gap-2">
          <Link href="/pricing" className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Pricing</Link>
          <Link href="/sign-in" className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Sign in</Link>
          <ButtonLink href="/sign-up" size="sm">Start free</ButtonLink>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-16 flex flex-wrap gap-x-4 gap-y-2 border-t border-border py-8 text-sm text-text-muted">
        <span>© Reelplain</span>
        <Link href="/privacy" className="hover:text-text hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:text-text hover:underline">Terms</Link>
        <a href="mailto:hello@outtathemadness.com" className="hover:text-text hover:underline">Support</a>
      </footer>
    </div>
  );
}
