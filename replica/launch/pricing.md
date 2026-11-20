# Reelplain pricing

## The market (read 2026-11-20, monthly-billing prices in USD)

| product | free plan | tiers (monthly billing) | annual discount | notable | source |
| --- | --- | --- | --- | --- | --- |
| **Limesnap** (the original) | **none** | Starter Snap $47 (30 generation credits), Pro Snap $67 (90), Creator Lab $197 (300) | 15% | 20% off the first month for joining the mailing list | https://www.limesnap.com/ (pricing section; /pricing returns 404) |
| OpusClip | yes: $0, watermark, no editing, 3-day export window | Starter $15, Pro $29, Business custom | listed separately | free tier deliberately crippled | https://www.opus.pro/pricing |
| Captions | yes, limited (no AI credits) | Max $24.99, Frontier $69.99 / $139.99 / $279.99 | — | AI usage on credits | https://www.captions.ai/pricing |
| Submagic | no | Starter $19, Pro $39 (120 credits), Business $69 | about 40% ($12 / $23 / $41 a month) | API minutes sold as packs | https://www.submagic.co/pricing |
| Predis.ai (carousels + video) | 3-day trial, **card required, charged on day 3** | Core $32, Rise $79, Enterprise $249 | 40–50% | credits per image/video | https://predis.ai/pricing/ |

**Takeaways:**
- **Limesnap is the most expensive entry ticket in this table:** $47 with no free way to try it.
- **Everyone meters with credits,** and credits are what reviewers hate.

## What reviewers said about money (from `../feedback.md`, 922 reviews)

| theme | reviews | sources | avg ★ |
| --- | --- | --- | --- |
| Price and paywalls (mostly paywalls sprung at export) | 124 | 2 | 2.1 |
| Credits, minutes and usage limits | 74 | 2 | 2.1 |
| Billing, cancelling and refunds | 63 | 1 (App Store) | 1.2 |
| Features moved behind a paywall | 20 | 1 | 2.3 |

## The model

**Flat monthly plan + credits you can see + no-loss rules.** Three tiers, named for who they're for.

| | **Try** | **Creator** | **Studio** |
| --- | --- | --- | --- |
| for | seeing if it works for you | posting a few times a week | posting daily, or for clients |
| monthly | $0 | **$19** | **$49** |
| annual (2 months free) | — | $190 / year | $490 / year |
| credits / month | 10 | 120 | 400 |
| export | **always allowed**, small watermark | no watermark | no watermark, bulk export |
| card to start | no | — | — |
| unused credits | — | roll over 1 month | roll over 1 month |
| extra credits | — | top-up packs, no plan change | top-up packs |
| brands / workspaces | 1 | 1 | 3 |

**Why these numbers:**
- **$19** undercuts Limesnap's entry ($47) by more than half, and matches Submagic Starter and Predis Core annual.
- **$49** sits under Limesnap Pro Snap ($67) and gets 4× Starter Snap's credit volume.

**Unverified: your costs.** I have no data on what one generation costs you in AI/GPU spend. Before you publish these prices, measure cost per credit on real jobs and keep gross margin above roughly 70% at full credit use. If it doesn't fit, cut credits, not the no-loss rules.

## Billing rules (the product fixes — these ship, not just get promised)

1. **Price before work:** every action shows its credit cost on the button before it runs ("Make clips · 4 credits").
2. **Failed or rejected = free:** a failed render, or a regeneration the user rejects within the session, returns its credits automatically, with a visible note.
3. **No export paywall:** anything made on Try can always be exported (watermarked). Upgrade prompts never appear after the user has done the work.
4. **One-tap cancel** in the app and on the web. Cancelling keeps the plan and all credits until the period ends. No retention maze.
5. **Renewal email 3 days before** every renewal (7 days before annual), with the amount and a cancel link.
6. **No trial that takes a card.** "Try" is the trial.
7. **Top-ups without a plan change**, because OpusClip users asked for exactly this.

## Stripe objects to create (you create these in the Stripe dashboard)

| product | price id (suggested lookup key) | amount | interval |
| --- | --- | --- | --- |
| Reelplain Creator | `creator_monthly` | $19.00 | month |
| Reelplain Creator | `creator_annual` | $190.00 | year |
| Reelplain Studio | `studio_monthly` | $49.00 | month |
| Reelplain Studio | `studio_annual` | $490.00 | year |
| Credit pack 50 | `credits_50` | $6.00 | one-time |
| Credit pack 200 | `credits_200` | $20.00 | one-time |

**Stripe settings:**
- Customer Portal on, with cancel allowed and "cancel at period end".
- Upcoming-renewal emails on.
- Smart Retries on, so a failed card isn't treated as cancelled.
