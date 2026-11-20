import { portalUrl, stripeEnabled } from "@/lib/billing/stripe";
import { siteUrl } from "@/lib/auth";
import { err, json, withUser } from "@/lib/api/http";

// Stripe Customer Portal: change plan, update card, and cancel in one click.
export const POST = withUser(async (user) => {
  if (!stripeEnabled()) return err(503, "billing_off", "Billing isn't switched on yet.");
  return json({ url: await portalUrl(user.id, user.email, siteUrl()) });
});
