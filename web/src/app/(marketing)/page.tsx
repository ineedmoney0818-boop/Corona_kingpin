import { ButtonLink } from "@/components/ui/Button";
import { PricingTable } from "@/components/marketing/PricingTable";

const FAQ = [
  ["Do I need a card to try it?", "No. The free plan is the trial."],
  ["What's a credit?", "One unit of work. Every button shows how many it uses before you tap it."],
  ["What if a render fails?", "Your credits come back automatically, and you'll see a note saying so."],
  ["Do unused credits expire?", "They roll over for one month."],
  ["How do I cancel?", "Settings, Plan, Cancel. You keep everything until the period ends."],
  ["Can I bring videos from other apps?", "Yes. Upload any MP4, MOV or WebM, or photos."],
];
const FEATURES = [
  ["The price is on the button", "See what an action costs before you tap it."],
  ["Failed renders are free", "If it breaks, your credits come back automatically."],
  ["Export is never a trap", "Everything you make can be exported, even on the free plan, with a small watermark."],
  ["Cancel in one tap", "You keep your plan and credits until the period ends."],
  ["Edit on your phone", "The first draft is a starting point. Trim, retype and move captions."],
  ["Your footage stays yours", "No AI-generated replacements unless you ask for them."],
];

export default function Landing() {
  return (
    <>
      <section className="py-14 md:py-20">
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-5xl">Turn your clips into reels. See the price before you start.</h1>
        <p className="mt-4 max-w-2xl text-lg text-text-muted">Reelplain cuts, captions and formats your videos and photos into reels and carousels. Every action shows its cost first, failed renders are free, and you cancel in one tap.</p>
        <ButtonLink href="/sign-up" size="lg" className="mt-6">Start free, no card</ButtonLink>
      </section>
      <section className="border-t border-border py-12">
        <h2 className="text-2xl font-bold">The problem with most AI video apps</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-5"><h3 className="font-bold">You do the work, then they ask for money</h3><p className="mt-1 text-text-muted">An hour of editing, and the export button turns into a paywall.</p></div>
          <div className="rounded-lg border border-border bg-surface p-5"><h3 className="font-bold">Credits disappear on broken renders</h3><p className="mt-1 text-text-muted">The app fails, the credits are gone, and you start over.</p></div>
        </div>
      </section>
      <section className="border-t border-border py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li><strong>Drop in</strong> a video or a few photos.</li>
          <li><strong>Reelplain drafts</strong> clips or a carousel with captions. Each step shows its cost before it runs.</li>
          <li><strong>Change anything</strong>, then export.</li>
        </ol>
      </section>
      <section className="border-t border-border py-12">
        <h2 className="text-2xl font-bold">What&apos;s different</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([t, d]) => <li key={t} className="rounded-lg border border-border bg-surface p-5"><h3 className="font-bold">{t}</h3><p className="mt-1 text-text-muted">{d}</p></li>)}</ul>
      </section>
      <section className="border-t border-border py-12"><h2 className="mb-6 text-2xl font-bold">Pricing</h2><PricingTable /></section>
      <section className="border-t border-border py-12">
        <h2 className="text-2xl font-bold">Questions</h2>
        <div className="mt-4">{FAQ.map(([q, a]) => <details key={q} className="border-b border-border py-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-text-muted">{a}</p></details>)}</div>
      </section>
      <section className="py-12 text-center">
        <h2 className="text-2xl font-bold">Make your first reel. See what it costs before it costs anything.</h2>
        <ButtonLink href="/sign-up" size="lg" className="mt-6">Start free, no card</ButtonLink>
      </section>
    </>
  );
}
