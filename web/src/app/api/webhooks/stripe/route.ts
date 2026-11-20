import type Stripe from "stripe";
import { handleStripeEvent, stripe } from "@/lib/billing/stripe";
import { adminClient } from "@/lib/supabase/admin";
import { logJobFailure } from "@/lib/data/system";

// Verifies the signature on the raw body, records the event id, then handles it.
// Stripe retries failures, so: a duplicate already processed is a no-op; a failure returns 500 to get a retry.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("missing signature", { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  const db = adminClient();
  await db.from("stripe_events").upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true });
  const { data: seen } = await db.from("stripe_events").select("processed_at").eq("id", event.id).single();
  if (seen?.processed_at) return Response.json({ received: true, duplicate: true });
  try {
    await handleStripeEvent(event);
    await db.from("stripe_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return Response.json({ received: true });
  } catch (e) {
    await logJobFailure("stripe_webhook", event.id, `${event.type}: ${(e as Error).message}`).catch(() => {});
    return new Response("handler failed", { status: 500 });
  }
}
