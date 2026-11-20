import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getAccount, listLedger } from "@/lib/data";
import { Skeleton } from "@/components/ui/Skeleton";
import { LocalDate } from "@/components/ui/LocalDate";
import { ButtonLink } from "@/components/ui/Button";
import { BillingButtons } from "@/components/settings/BillingButtons";
import { DangerZone } from "@/components/settings/DangerZone";
import { stripeEnabled } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Settings" };
const LABEL: Record<string, string> = { grant: "Monthly credits", rollover_trim: "Rollover limit", topup: "Credit pack", spend: "Used", refund: "Refunded", adjust: "Adjustment" };

async function Content() {
  const user = await requireUser();
  const [a, ledger] = await Promise.all([getAccount(user.id), listLedger(user.id)]);
  const total = a.planCredits + a.topupCredits;
  return (
    <>
      <section aria-labelledby="acct" className="rounded-lg border border-border bg-surface p-4">
        <h2 id="acct" className="text-lg font-bold">Account</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-text-muted">Name</dt><dd className="break-words">{user.displayName}</dd>
          <dt className="text-text-muted">Email</dt><dd className="break-all">{user.email}</dd>
          <dt className="text-text-muted">Plan</dt><dd className="capitalize">{user.plan === "try" ? "Try (free)" : user.plan}</dd>
        </dl>
      </section>
      <section aria-labelledby="plan" className="rounded-lg border border-border bg-surface p-4">
        <h2 id="plan" className="text-lg font-bold">Plan</h2>
        <p className="mt-2 text-sm">{user.plan === "try" ? "You're on the free plan: 10 credits a month and a small watermark on exports." : `You're on ${user.plan === "creator" ? "Creator" : "Studio"}: ${a.monthlyGrant} credits a month, no watermark.`}</p>
        <BillingButtons plan={user.plan} enabled={stripeEnabled()} />
        {user.plan === "try" && <ButtonLink href="/pricing" variant="ghost" size="sm" className="mt-2">Compare plans</ButtonLink>}
      </section>
      <section id="credits" aria-labelledby="cr" className="rounded-lg border border-border bg-surface p-4">
        <h2 id="cr" className="text-lg font-bold">Credits</h2>
        <p className="mt-2 text-sm"><strong className="text-2xl font-display">{total}</strong> available
          <span className="text-text-muted"> · {a.planCredits} monthly{a.topupCredits ? ` + ${a.topupCredits} from packs` : ""}</span></p>
        <p className="text-sm text-text-muted">Unused monthly credits roll over for one month. Every credit in and out is listed here.</p>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Credit history</caption>
          <thead className="text-text-muted"><tr><th className="py-2 font-medium">When</th><th className="py-2 font-medium">What</th><th className="py-2 text-right font-medium">Credits</th></tr></thead>
          <tbody>
            {ledger.map((l) => {
              const d = l.planDelta + l.topupDelta;
              return (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 pr-2 whitespace-nowrap"><LocalDate iso={l.createdAt} /></td>
                  <td className="py-2 pr-2">{LABEL[l.kind]}{l.kind === "refund" ? " · render didn't finish" : ""}</td>
                  <td className={"py-2 text-right font-semibold tabular-nums " + (d >= 0 ? "text-success" : "")}>{d > 0 ? `+${d}` : d}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section aria-labelledby="acct-danger" className="rounded-lg border border-border bg-surface p-4">
        <h2 id="acct-danger" className="text-lg font-bold">Sign-in and account</h2>
        <div className="mt-3"><DangerZone email={user.email} /></div>
      </section>
    </>
  );
}
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[var(--layout-chat-max)] space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>}><Content /></Suspense>
    </div>
  );
}
