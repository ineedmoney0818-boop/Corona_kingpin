import Stripe from "stripe";
import { adminClient } from "@/lib/supabase/admin";
import { addTopup, grantMonthly } from "@/lib/data/system";
import { PLAN_GRANTS, type PlanId } from "@/lib/pricing";
import { sendEmail, emails } from "@/lib/email/send";

// Stripe: Checkout for plans and credit packs, Customer Portal for changes and one-click cancel,
// webhooks as the only writer of subscription state. Test keys until replica-deploy.
let client: Stripe | null = null;
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

/** Prices are found by lookup key, created in the Stripe dashboard (see replica/launch/pricing.md). */
export const PRICES = {
  creator_monthly: { plan: "creator" as PlanId, mode: "subscription" as const },
  creator_annual: { plan: "creator" as PlanId, mode: "subscription" as const },
  studio_monthly: { plan: "studio" as PlanId, mode: "subscription" as const },
  studio_annual: { plan: "studio" as PlanId, mode: "subscription" as const },
  credits_50: { credits: 50, mode: "payment" as const },
  credits_200: { credits: 200, mode: "payment" as const },
} as const;
export type PriceKey = keyof typeof PRICES;

async function customerFor(userId: string, email: string): Promise<string> {
  const db = adminClient();
  const { data } = await db.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const c = await stripe().customers.create({ email, metadata: { user_id: userId } }, { idempotencyKey: `customer-${userId}` });
  await db.from("profiles").update({ stripe_customer_id: c.id }).eq("id", userId);
  return c.id;
}

export async function checkoutUrl(userId: string, email: string, key: PriceKey, siteUrl: string): Promise<string> {
  const price = (await stripe().prices.list({ lookup_keys: [key], active: true, limit: 1 })).data[0];
  if (!price) throw new Error(`price ${key} not found in Stripe`);
  const conf = PRICES[key];
  const session = await stripe().checkout.sessions.create({
    mode: conf.mode,
    customer: await customerFor(userId, email),
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: userId,
    metadata: { user_id: userId, price_key: key },
    ...(conf.mode === "subscription" ? { subscription_data: { metadata: { user_id: userId } } } : {}),
    success_url: `${siteUrl}/app/settings?billing=success`,
    cancel_url: `${siteUrl}/app/settings?billing=canceled`,
  });
  return session.url!;
}

export async function portalUrl(userId: string, email: string, siteUrl: string): Promise<string> {
  const s = await stripe().billingPortal.sessions.create({ customer: await customerFor(userId, email), return_url: `${siteUrl}/app/settings` });
  return s.url;
}

/** Used by account deletion: stop all billing immediately. */
export async function cancelSubscriptionsNow(userId: string) {
  if (!stripeEnabled()) return;
  const { data } = await adminClient().from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (!data?.stripe_customer_id) return;
  for await (const sub of stripe().subscriptions.list({ customer: data.stripe_customer_id, status: "all" })) {
    if (!["canceled", "incomplete_expired"].includes(sub.status)) await stripe().subscriptions.cancel(sub.id);
  }
}

// ---------------------------------------------------------------- webhook handling
const planFromSub = (sub: Stripe.Subscription) => {
  const item = sub.items.data[0];
  const key = (item?.price.lookup_key ?? "") as PriceKey;
  const conf = PRICES[key] as { plan?: PlanId } | undefined;
  return { plan: conf?.plan ?? null, interval: item?.price.recurring?.interval === "year" ? "year" : "month", periodEnd: item?.current_period_end ?? null };
};
async function userIdForCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  const id = typeof customer === "string" ? customer : customer?.id;
  if (!id) return null;
  const { data } = await adminClient().from("profiles").select("id").eq("stripe_customer_id", id).maybeSingle();
  return data?.id ?? null;
}
const LIVE = ["trialing", "active", "past_due"];

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = (sub.metadata?.user_id as string | undefined) ?? (await userIdForCustomer(sub.customer));
  if (!userId) throw new Error(`no user for customer on ${sub.id}`);
  const { plan, interval, periodEnd } = planFromSub(sub);
  if (!plan) throw new Error(`unknown price on ${sub.id}`);
  const status = ["trialing", "active", "past_due", "canceled", "incomplete", "unpaid"].includes(sub.status) ? sub.status : "canceled";
  const db = adminClient();
  const r = await db.from("subscriptions").upsert({
    user_id: userId, stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id, plan, interval, status, cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: new Date((periodEnd ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  }, { onConflict: "stripe_subscription_id" });
  if (r.error) throw new Error(`subscription upsert: ${r.error.message}`);
  // The plan a user has is whatever live subscription they hold; none means Try.
  const { data: live } = await db.from("subscriptions").select("plan").eq("user_id", userId).in("status", LIVE).limit(1);
  const current = (live?.[0]?.plan as PlanId | undefined) ?? "try";
  await db.from("profiles").update({ plan: current }).eq("id", userId);
  await db.from("credit_accounts").update({ monthly_grant: PLAN_GRANTS[current] }).eq("user_id", userId);
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const key = s.metadata?.price_key as PriceKey | undefined;
      const conf = key ? (PRICES[key] as { credits?: number }) : undefined;
      if (s.mode === "payment" && conf?.credits && s.payment_status === "paid" && s.client_reference_id) {
        await addTopup(s.client_reference_id, conf.credits, s.id); // unique per checkout session
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "invoice.paid": {
      const inv = event.data.object;
      const subRef = inv.parent?.subscription_details?.subscription;
      if (!subRef) break;
      const sub = typeof subRef === "string" ? await stripe().subscriptions.retrieve(subRef) : subRef;
      await syncSubscription(sub);
      const { plan } = planFromSub(sub);
      const userId = (sub.metadata?.user_id as string | undefined) ?? (await userIdForCustomer(sub.customer));
      if (plan && userId) await grantMonthly(userId, PLAN_GRANTS[plan], inv.id); // one grant per invoice
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object;
      const userId = await userIdForCustomer(inv.customer);
      if (userId && inv.customer_email) await sendEmail(inv.customer_email, emails.paymentFailed(), `payment-failed-${inv.id}`);
      break;
    }
    default:
      break; // ignored event types are still recorded, so retries are no-ops
  }
}
