import Stripe from "stripe";
import { test, expect, sql, userId, expectOutage } from "./fixtures";

// Webhook side of billing, with events signed by Stripe's own test helper (no Stripe account needed).
// Checkout with real test cards and the live portal are manual (test-plan F06-M*).
const stripe = new Stripe("sk_test_placeholder");
const SECRET = "whsec_local_test_secret";
async function send(event: object, sign = true) {
  const payload = JSON.stringify(event);
  const header = sign ? stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) : "t=1,v1=bad";
  const r = await fetch("http://localhost:3100/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json" }, body: payload });
  return r.status;
}
const ev = (id: string, type: string, object: object) => ({ id, object: "event", type, api_version: "2026-11-18.endive", created: 1, data: { object }, livemode: false, pending_webhooks: 1, request: null });
const sub = (uid: string, status: string, cancel: boolean) => ({
  id: `sub_${uid.slice(0, 8)}`, object: "subscription", status, cancel_at_period_end: cancel, customer: `cus_${uid.slice(0, 8)}`, metadata: { user_id: uid },
  items: { object: "list", data: [{ id: "si_1", object: "subscription_item", current_period_end: Math.floor(Date.now() / 1000) + 2592000, price: { id: "price_1", object: "price", lookup_key: "creator_monthly", recurring: { interval: "month" } } }] },
});

test.describe("F06 billing", () => {
  test("F06-H1 subscription lifecycle drives the plan", async ({ page, user }) => {
    const uid = userId(user.email);
    sql(`update profiles set stripe_customer_id = 'cus_' || left(:'p1', 8) where id = :'p1'`, [uid]);
    const plan = () => sql(`select plan from profiles where id = :'p1'`, [uid]);
    expect(await send(ev(`evt_a_${uid}`, "customer.subscription.created", sub(uid, "active", false)))).toBe(200);
    expect(plan()).toBe("creator");
    await page.goto("/app/settings");
    await expect(page.getByText("You're on Creator: 120 credits a month, no watermark.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage or cancel plan" })).toBeVisible();
    expect(await send(ev(`evt_b_${uid}`, "customer.subscription.updated", sub(uid, "active", true)))).toBe(200);
    expect(plan()).toBe("creator");
    expect(await send(ev(`evt_c_${uid}`, "customer.subscription.deleted", sub(uid, "canceled", true)))).toBe(200);
    expect(plan()).toBe("try");
  });

  test("F06-E1 duplicate webhook applies once", async ({ user }) => {
    const uid = userId(user.email);
    const e = ev(`evt_pack_${uid}`, "checkout.session.completed", { id: `cs_${uid}`, object: "checkout.session", mode: "payment", payment_status: "paid", client_reference_id: uid, metadata: { user_id: uid, price_key: "credits_50" } });
    expect(await send(e)).toBe(200);
    expect(await send(e)).toBe(200);
    expect(await send({ ...e, id: `evt_pack2_${uid}` })).toBe(200);
    expect(sql(`select topup_credits from credit_accounts where user_id = :'p1'`, [uid])).toBe("50");
  });

  test("F06-N1 bad signature is rejected", async ({ user }) => {
    const uid = userId(user.email);
    const e = ev(`evt_bad_${uid}`, "checkout.session.completed", { id: `cs_bad_${uid}`, object: "checkout.session", mode: "payment", payment_status: "paid", client_reference_id: uid, metadata: { user_id: uid, price_key: "credits_200" } });
    expect(await send(e, false)).toBe(400);
    expect(sql(`select topup_credits from credit_accounts where user_id = :'p1'`, [uid])).toBe("0");
  });

  test("F06-N2 Stripe unreachable: clear billing message, 503 not 500", async ({ page, user, problems }) => {
    await page.goto("/app/settings");
    const [res] = await Promise.all([
      page.waitForResponse("**/api/billing/checkout"),
      page.getByRole("button", { name: /Creator · \$19\/month/ }).click(),
    ]);
    expect(res.status()).toBe(503);
    expect((await res.json()).error.code).toBe("billing_unavailable");
    await expect(page.getByText("Billing is unavailable right now. Nothing was charged.", { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/app\/settings/);
    expectOutage(problems, "/api/billing/checkout", 503); // the one expected upstream outage
  });
});
