import { Resend } from "resend";

// Transactional email through Resend, from your own domain (EMAIL_FROM). Copy written fresh, in the brand voice.
// Without RESEND_API_KEY (local dev) emails are logged instead of sent.
type Mail = { subject: string; text: string };
let client: Resend | null = null;

export async function sendEmail(to: string, mail: Mail, idempotencyKey?: string) {
  if (!process.env.RESEND_API_KEY) { console.info(JSON.stringify({ evt: "email_skipped", to: "[redacted]", subject: mail.subject })); return; }
  client ??= new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "Reelplain <hello@reelplain.com>";
  const { error } = await client.emails.send({ from, to, subject: mail.subject, text: mail.text }, idempotencyKey ? { idempotencyKey } : undefined);
  if (error) throw new Error(`email failed: ${error.message}`);
}

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const emails = {
  renderRefunded: (credits: number): Mail => ({
    subject: "That render didn't finish. Your credits are back.",
    text: `One of your renders stopped before it finished. We've put the ${credits} credit${credits === 1 ? "" : "s"} back in your account.\n\nTry it again: ${site()}/app/library\n\n- Reelplain`,
  }),
  renewalReminder: (plan: string, amount: string, date: string): Mail => ({
    subject: `Your ${plan} plan renews on ${date}`,
    text: `Heads up: your Reelplain ${plan} plan renews on ${date} for ${amount}.\n\nNothing to do if you want to keep it. To change or cancel, it's one click: ${site()}/app/settings\n\n- Reelplain`,
  }),
  paymentFailed: (): Mail => ({
    subject: "Your payment didn't go through",
    text: `We couldn't charge your card for Reelplain. Your plan stays on while we retry.\n\nUpdate your card: ${site()}/app/settings\n\n- Reelplain`,
  }),
};
