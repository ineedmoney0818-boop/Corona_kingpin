import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/marketing/LegalPage";
import { COSTS, PLAN_GRANTS } from "@/lib/pricing";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      effective="November 22, 2026"
      intro={<p>These terms are an agreement between you and Outta The Madness Consulting Services LLC, a Kentucky limited liability company that operates Reelplain (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using Reelplain you agree to them. If you don&rsquo;t agree, don&rsquo;t use the service.</p>}
    >
      <h2>The service</h2>
      <p>Reelplain turns your own photos and videos into short social posts (reels and carousels) and suggests ideas for them, using AI to plan the edit. We may change, add or remove features over time.</p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 to use Reelplain, and at least 18 (or have a parent or guardian&rsquo;s permission) to buy a plan or credits.</li>
        <li>Give a real email address and keep your password private. You&rsquo;re responsible for what happens under your account.</li>
        <li>One person per account. Don&rsquo;t create accounts to collect extra free credits.</li>
      </ul>

      <h2>Credits</h2>
      <ul>
        <li>Actions cost credits, and the cost is shown before anything runs. Today a new reel costs {COSTS.newReel}, a carousel {COSTS.newCarousel}, a re-render {COSTS.reRender} and an ideas reply {COSTS.ideas}. We may change these; new prices only apply to actions you start after the change.</li>
        <li>Each plan grants credits every month (Try: {PLAN_GRANTS.try}, Creator: {PLAN_GRANTS.creator}, Studio: {PLAN_GRANTS.studio}). Unused plan credits carry over, up to one month&rsquo;s grant. Credits from credit packs don&rsquo;t expire while your account is open.</li>
        <li>If a render fails, its credits are returned automatically.</li>
        <li>Credits have no cash value, can&rsquo;t be transferred, and end when your account is deleted.</li>
      </ul>

      <h2>Plans, payment and cancelling</h2>
      <ul>
        <li>Paid plans renew automatically each month or year until you cancel. Prices are on the <Link href="/pricing">pricing page</Link>, plus any tax. Payments are processed by Stripe.</li>
        <li>We email you before each renewal with the amount and a way to cancel.</li>
        <li>Cancel anytime in Settings. You keep your plan and credits until the end of the period you&rsquo;ve paid for, and you won&rsquo;t be charged again.</li>
        <li>Payments aren&rsquo;t refundable, except where the law requires it or a charge was our mistake. If you think you were charged wrongly, email us and we&rsquo;ll look at it.</li>
        <li>If a payment fails, we&rsquo;ll retry and let you know. If it keeps failing, your plan may move back to Try.</li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>You own what you upload and the posts made from it. We don&rsquo;t claim ownership.</li>
        <li>You give us permission to store, process, display back to you and render your content, only as needed to run Reelplain for you. This permission ends when you delete the content or your account.</li>
        <li>You confirm you have the rights to everything you upload, including people&rsquo;s faces, voices and any music in your videos.</li>
        <li>AI suggestions can be wrong or not fit for your purpose. Review every post before you publish it; you&rsquo;re responsible for what you post.</li>
      </ul>

      <h2>What you can&rsquo;t do</h2>
      <ul>
        <li>Upload anything illegal, anything sexual involving minors, or content that harasses, threatens or exploits others.</li>
        <li>Upload content that infringes someone else&rsquo;s copyright, trademark or privacy.</li>
        <li>Use Reelplain to make spam, scams or content that impersonates someone.</li>
        <li>Try to break, overload, reverse-engineer or get around the limits or security of the service, or reach other people&rsquo;s data.</li>
      </ul>
      <p>We may remove content or suspend or close accounts that break these rules. If we close your account for a reason other than a breach of these terms, we&rsquo;ll refund the unused part of any prepaid plan.</p>

      <h2>Ending your account</h2>
      <p>You can delete your account anytime in Settings. That cancels any subscription and deletes your files and data, as described in the <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Disclaimers</h2>
      <p>Reelplain is provided &ldquo;as is&rdquo;. We work to keep it running and your files safe, but we don&rsquo;t promise it will always be available, error-free, or that results will meet your expectations. Keep your own copies of anything important.</p>

      <h2>Limit of liability</h2>
      <p>To the extent the law allows, we aren&rsquo;t liable for indirect or consequential losses, such as lost profits, followers or data, and our total liability for any claim is limited to the amount you paid us in the 12 months before it. Nothing here limits liability that the law doesn&rsquo;t allow us to limit.</p>

      <h2>Your responsibility to us</h2>
      <p>If someone brings a claim against us because of content you uploaded or posted, or because you broke these terms, you agree to cover the reasonable costs of that claim.</p>

      <h2>Changes to these terms</h2>
      <p>If we change these terms in a way that matters, we&rsquo;ll update the date above and tell you by email or in the app at least 14 days before the change applies. Using Reelplain after that means you accept the new terms.</p>

      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of the Commonwealth of Kentucky, USA. Please email us first so we can try to sort things out. Any court case will be heard in the state or federal courts located in Kentucky, unless the law where you live gives you the right to bring it there.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </LegalPage>
  );
}
