import { adminClient } from "@/lib/supabase/admin";
import { grantMonthly, logJobFailure } from "@/lib/data/system";
import { PLAN_GRANTS } from "@/lib/pricing";
import { emails, sendEmail } from "@/lib/email/send";
import { stripe, stripeEnabled } from "@/lib/billing/stripe";
import { cronAuthorized } from "@/lib/api/cron";

// Daily (UTC):
//  1. Monthly credits for users not paid by a Stripe invoice this month: Try plan, and annual plans.
//  2. Renewal reminders: 3 days before monthly renewals, 7 days before annual ones. Sent once per period.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });
  const db = adminClient();
  const month = new Date().toISOString().slice(0, 7);
  let granted = 0, reminded = 0, failed = 0;

  const { data: due } = await db.from("credit_accounts").select("user_id, profiles!inner(plan)").lte("next_grant_at", new Date().toISOString()).limit(1000);
  for (const row of due ?? []) {
    const userId = row.user_id as string;
    const plan = (row.profiles as unknown as { plan: keyof typeof PLAN_GRANTS }).plan;
    try {
      if (plan === "try") { await grantMonthly(userId, PLAN_GRANTS.try, `free-${userId}-${month}`); granted++; continue; }
      const { data: sub } = await db.from("subscriptions").select("interval").eq("user_id", userId).in("status", ["active", "trialing"]).maybeSingle();
      if (sub?.interval === "year") { await grantMonthly(userId, PLAN_GRANTS[plan], `annual-${userId}-${month}`); granted++; }
      // monthly plans are granted by invoice.paid
    } catch (e) { failed++; await logJobFailure("monthly_grant", userId, (e as Error).message); }
  }

  if (stripeEnabled()) {
    const now = Date.now();
    const { data: subs } = await db.from("subscriptions").select("*").in("status", ["active", "trialing"]).eq("cancel_at_period_end", false);
    for (const s of subs ?? []) {
      const end = new Date(s.current_period_end as string).getTime();
      const lead = (s.interval === "year" ? 7 : 3) * 864e5;
      if (end - now > lead || end < now || s.reminder_sent_for === s.current_period_end) continue;
      try {
        const sub = await stripe().subscriptions.retrieve(s.stripe_subscription_id as string);
        const item = sub.items.data[0];
        const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: item.price.currency.toUpperCase() }).format((item.price.unit_amount ?? 0) / 100);
        const { data: u } = await db.auth.admin.getUserById(s.user_id as string);
        if (u.user?.email) {
          const date = new Date(end).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
          await sendEmail(u.user.email, emails.renewalReminder(String(s.plan), amount, date), `renewal-${s.id}-${s.current_period_end}`);
          await db.from("subscriptions").update({ reminder_sent_for: s.current_period_end }).eq("id", s.id);
          reminded++;
        }
      } catch (e) { failed++; await logJobFailure("renewal_reminder", String(s.id), (e as Error).message); }
    }
  }
  return Response.json({ granted, reminded, failed });
}
