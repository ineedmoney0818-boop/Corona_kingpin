# Parity: Reelplain vs Limesnap

**Date:** 2026-11-20. **Build:** 4802e9a. **Tools:** `parity.py` and `imgdiff.py` (replica-diff).

## Verdict: not shippable yet

| | |
| --- | --- |
| **Feature parity** | **68.5 / 100** |
| Must-haves | **5 of 9 done**; the other 4 are built but unverified (see below) |
| Layout (public screens only) | 24.6 / 100, different by design |
| Combined score from the tool | 59.7 / 100 |
| Open bugs | S1 0 · S2 0 · S3 0 · S4 0 (`bugs.md`) |

**Why it's not shippable:** the 4 must-haves at "partial" aren't missing code. Each is written and tested as far as possible without your accounts:

| must-have | what's done | what's unverified |
| --- | --- | --- |
| Generate reel | real render pipeline, tested end to end | the **Claude planner** has never run live (no API key in this session); today's plans come from the stand-in |
| AI-written caption | the planner writes the caption and hashtags | same: not run live |
| Subscriptions with credits | Checkout, Portal, webhooks; webhook logic tested with signed events | never talked to a real Stripe account |
| Google sign-in | Supabase OAuth flow and callback route | needs your Google OAuth client |

**The numbers if those are verified with your keys:**
- With the 4 must-haves above confirmed (plus carousels, which share the planner): **83.7**, all 9 must-haves done. That clears the "shippable" bar of 80+, no open S1/S2 and all must-haves.
- With ideas chat, the full editor and project assignment also built: **92.4**.

**Better than the original?** That's the goal, and the pieces are in place. Every fix from `fixes.md` that doesn't need billing is built and tested:
- the cost shown on the button;
- automatic refunds when a render fails;
- export never locked behind a paywall (a watermark on the free plan instead);
- original-only media.

Plus a free plan, where Limesnap has none. One-tap cancel uses the Stripe portal and is verified only on the webhook side. **It earns that label once it's shippable, not before.**

## Features by area, weakest first

| area | score | features |
| --- | --- | --- |
| editor | 37.5 | 3 |
| billing | 50.0 | 1 |
| onboarding | 58.3 | 3 |
| library | 60.0 | 3 |
| generation | 63.6 | 4 |
| chat | 81.8 | 5 |
| export | 100 | 1 |
| account | 100 | 1 |

Three Limesnap features are scored `skip`, not "missing":
- **their AI prompts:** they own them;
- **their licensed stock library:** licensed content (we use Pexels instead);
- **scraping Instagram profiles by handle:** against Meta's terms, and a legal risk.

The 9 Reelplain-only features (the fixes) aren't scored, by design.

## Layout: same job, deliberately different look

Compared at the same viewport and state:
- Limesnap: one normal page load each, public pages only.
- Reelplain: a production build.

Only S01 (landing) and S02 (sign-in) can be compared, because everything behind Limesnap's login was off limits: their terms forbid using the service to build a competitor.

| screen | 1440×900 | 390×844 | reading |
| --- | --- | --- | --- |
| S01 landing | 22.3 | 30.5 | different on purpose. Their dark hero, serif italic headline and sage gradient are trade dress; ours is light, sans, ember, with a different section order built on our angle |
| S02 sign-in | 27.9 | 17.9 | **same structure:** logo → Google → divider → email → password → main button. The score is low because of our added heading and subtitle, different spacing and colour, and their cookie banner |

Diff images: `replica/diffs/S01-1440.png`, `S01-390.png`, `S02-1440.png`, `S02-390.png`.

**Don't chase this number.** A high layout score on the landing page would mean we'd copied their look.

## Behaviour differences

| flow | Limesnap does | Reelplain does | fix or keep |
| --- | --- | --- | --- |
| F01 get started | pay before any use ($47+, no free plan); the 7-day refund is by email request | free plan, 10 credits, no card | **keep**, the core of the angle |
| F01 sign-in | show/hide password toggle | no toggle (our own component spec asked for one) | **fix**: small |
| F01 sign-in | "By clicking continue, you agree to our Terms and Privacy Policy" under the button | no consent line | **fix**: legal; needs the Terms and Privacy pages from launch |
| F01 sign-up | Instagram handle at onboarding, public profile scraped (including other people's handles) | no IG step | **keep** the refusal; offer official Instagram Login later |
| F02 make a reel | ~4 clicks: attach → prompt → send → download | 4 clicks: attach → prompt → "Make reel · 4 credits" → download; the price is visible before the click at no extra step | **keep**: same click count, cost shown up front |
| F02 when a render fails | unknown (behind the login) | fails, refunds automatically, says so in the chat, logs it in the credit history, emails | **keep** |
| F02 credits | two meters (30 "generation" + 300 "chat" credits on Starter) | one meter, with every spend and refund listed | **keep**: simpler |
| F04 ideas in chat | a chat-only brainstorm, metered by chat credits | **not built**; every message makes a generation | **build** (needs the Claude key) |
| F05 editor | add scene / add text / add image / background from URL or Projects / global background video | text, position, style, duration, reorder, delete, caption; free save; 1-credit re-render | **build** add scene, add image and background swap |
| F06 cancel | "contact support … or manage your subscription through your account settings" | one-click Stripe portal, keep the plan until the period ends, reminder email before renewal | **keep** (verify live) |
| emails | unknown | confirm, reset, refund, renewal reminder, payment failed | **keep** |
| remembered between visits | chats, projects, generated posts | chats, projects, library, credit history | parity |

## Top five to build next

1. **Verify the planner with a real Claude key.** This moves 3 must-haves and carousels to done, and it's the product's core. Measure plan quality and cost per plan on 30 real prompts (`architecture.md` estimates $0.05–0.10).
2. **Stripe test mode end to end:** Checkout with `4242…`, decline with `4000 0000 0000 0002`, cancel in the portal. Then the subscription must-have is done.
3. **Google OAuth client:** the last must-have. Start Google's brand verification now; it takes days.
4. **Ideas chat (F04/S09):** chat-only answers with no render, priced as a quote like everything else.
5. **Editor completion:** add scene, add text, add image, swap background. Plus the two quick sign-in fixes (password toggle, consent line once the legal pages exist).

Items 1–3 are blocked on accounts only you can create. Items 4–5 are `/replica-build` work I can do now.
