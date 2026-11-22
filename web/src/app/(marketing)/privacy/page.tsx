import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      effective="November 22, 2026"
      intro={<p>Reelplain is operated by its owner as a sole proprietorship based in Kentucky, USA (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This page says what we collect, why, who else sees it, and how to delete it. We don&rsquo;t sell your data and we don&rsquo;t show ads.</p>}
    >
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, and password. Passwords are stored hashed by our authentication provider; we never see them.</li>
        <li><strong>Your media:</strong> the photos and videos you upload, and the reels and carousels we make from them.</li>
        <li><strong>What you ask for:</strong> your prompts, chats, plans, edits and captions.</li>
        <li><strong>Billing records:</strong> your plan, credit balance and history, and a Stripe customer ID. Card details go straight to Stripe; we never receive or store your card number.</li>
        <li><strong>Technical data:</strong> basic logs our hosting providers keep (such as IP address, browser and request times) to run the service and stop abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: sign you in, store your files, plan and render your posts, and keep your credit balance right.</li>
        <li>To bill you through Stripe and give credits back automatically when a render fails.</li>
        <li>To send account emails: sign-up confirmation, password resets, renewal reminders, payment problems and refund notices. We don&rsquo;t send marketing email.</li>
        <li>To prevent abuse, such as rate-limiting and blocking accounts that break the <Link href="/terms">Terms</Link>.</li>
      </ul>

      <h2>AI processing</h2>
      <p>When you ask for a reel, carousel or ideas, we send your prompt and small preview images of the media you attached (for videos, a few still frames) to Anthropic&rsquo;s Claude API, which writes the plan. Under Anthropic&rsquo;s commercial terms, data sent through its API isn&rsquo;t used to train its models. Your full-size files are not sent to Anthropic; the final video is rendered on our own servers.</p>

      <h2>Who else processes your data</h2>
      <p>We use these service providers, only for the purpose listed:</p>
      <ul>
        <li><strong>Supabase:</strong> database, sign-in and file storage (United States).</li>
        <li><strong>Vercel:</strong> hosts the website and its servers.</li>
        <li><strong>Railway:</strong> runs the servers that render your videos.</li>
        <li><strong>Anthropic:</strong> plans your posts, as described above.</li>
        <li><strong>Stripe:</strong> payments and subscriptions.</li>
        <li><strong>Resend:</strong> sends our emails.</li>
      </ul>
      <p>We may also disclose information if the law requires it, or to protect people from harm.</p>

      <h2>Cookies</h2>
      <p>We only use the cookies needed to keep you signed in and secure. There are no advertising or analytics trackers.</p>

      <h2>How long we keep it</h2>
      <p>We keep your account, files and history until you delete your account or ask us to delete them.Deleting your account (Settings, then Delete account) cancels any subscription, deletes your files and removes your account data right away. Stripe keeps payment records it is legally required to keep, and copies can remain in our providers&rsquo; backups and logs for a limited time before they&rsquo;re overwritten.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Delete your whole account, with all its files, in Settings. To delete particular files without closing your account, email us and we&rsquo;ll remove them.</li>
        <li>Email us to ask for a copy of your data, to correct it, or to have it deleted. Depending on where you live, you may have further rights under laws such as the GDPR or CCPA; we&rsquo;ll honor requests made under them.</li>
      </ul>

      <h2>Security</h2>
      <p>Your files are stored privately and only you can open them. Connections are encrypted, and each account can only reach its own data. No system is perfectly secure, so use a strong password you don&rsquo;t use elsewhere.</p>

      <h2>Children</h2>
      <p>Reelplain isn&rsquo;t for anyone under 13, and we don&rsquo;t knowingly collect data from them. If you think a child has an account, email us and we&rsquo;ll delete it.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&rsquo;ll update the date above and tell you by email or in the app before it takes effect.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
