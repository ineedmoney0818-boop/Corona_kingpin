import Link from "next/link";
import type { CreditAccount } from "@/lib/data";
import type { PlanId } from "@/lib/pricing";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function CreditBalance({ account, plan }: { account: CreditAccount; plan: PlanId }) {
  const total = account.planCredits + account.topupCredits;
  return (
    <Link href="/app/settings#credits" className="block rounded-md px-3 py-2 hover:bg-surface-2">
      <p className="text-sm"><strong>{total} credit{total === 1 ? "" : "s"}</strong>{" "}
        <span className="text-text-muted">· {plan === "try" ? `${account.monthlyGrant} free a month` : `renews ${fmt(account.nextGrantAt)}`}</span></p>
      {total === 0 ? <p className="mt-1 text-xs font-semibold text-danger">Out of credits. Get more</p>
        : total < 5 ? <p className="mt-1 text-xs font-semibold text-warning">{total} left</p> : null}
    </Link>
  );
}
