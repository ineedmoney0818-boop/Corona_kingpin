import { z } from "zod";
import { checkoutUrl, PRICES, stripeEnabled, type PriceKey } from "@/lib/billing/stripe";
import { siteUrl } from "@/lib/auth";
import { err, json, withUser } from "@/lib/api/http";

const Body = z.object({ price: z.enum(Object.keys(PRICES) as [PriceKey, ...PriceKey[]]) });
export const POST = withUser(async (user, req: Request) => {
  if (!stripeEnabled()) return err(503, "billing_off", "Billing isn't switched on yet. Nothing was charged.");
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return err(400, "bad_request", "Unknown plan.");
  return json({ url: await checkoutUrl(user.id, user.email, b.data.price, siteUrl()) });
});
