# Architecture: Reelplain (a rebuild of Limesnap's core features, plus the fixes)

Inputs: `recon.md` (15 screens, 6 flows), `features.csv` (33 rows), `fixes.md`, `launch/pricing.md`.

The design principle: **billing correctness lives in the database, not in the UI.**
- A render can't be charged twice.
- A failed render can't miss its refund.
- A balance can't go negative.

Those three rules are the "No surprise bill" promise, so they're enforced by constraints and tested (see Schema).

## Stack

| layer | choice | why |
| --- | --- | --- |
| web app | **Next.js (App Router) + TypeScript** | One codebase for the landing page, app and API routes; default deploy target for Vercel |
| styling | **Tailwind**, colours from `replica/design/tokens.json` | Tokens already contrast-checked |
| mobile | **Responsive web first; Expo later** | Recon shows a web app. A native app is a later milestone; reviewers' main mobile ask is editing on the phone, which a good mobile web editor covers first |
| database | **Postgres on Supabase** | One database for everything; row level security; same provider as auth and storage |
| ORM | **Drizzle** | Typed SQL that stays close to `schema.sql`; the credit logic lives in SQL functions, not the ORM |
| auth | **Supabase Auth**: Google OAuth + email/password | Matches the original's sign-in options (S02); `auth.uid()` drives RLS |
| files | **Supabase Storage** (uploads, renders) | Signed URLs, per-user folders, same RLS model. Swap to R2 if egress bills grow |
| AI planner | **Claude API, `claude-opus-5-5`**, structured outputs | Turns prompt + asset descriptions into a validated scene plan (details below) |
| video render | **Remotion** compositions, rendered by a **Node worker on Fly.io** | The same React composition drives the in-browser preview (`@remotion/player`) and the final mp4, so preview equals output (recon hard part #4). Carousels use the same compositions rendered as stills. **License check:** Remotion is free only for individuals and small companies; read remotion.dev/license and buy a company license if you're over its limit |
| job queue | **pg-boss** (a queue stored in the same Postgres) | No extra service; jobs and credit rows commit in the same database; built-in retries |
| media probing | **FFmpeg** in the worker | Read duration and size, extract keyframes from uploaded videos for the planner |
| payments | **Stripe Checkout + Billing + Customer Portal** | Subscriptions, top-ups, and a one-tap cancel via the portal (fix #3) |
| email | **Resend** | Renewal reminders (3 days monthly, 7 days annual), receipts, "render failed, credits refunded" |
| stock media | **Pexels API** (Pixabay optional), official APIs with your key | Replaces Limesnap's licensed library; store attribution |
| analytics / errors | **PostHog + Sentry** | Events from `launch-plan.md`; a failed render alerts |
| hosting | **Vercel** (web) + **Fly.io** (render worker) + **Supabase** | All managed. Vercel functions can't run a minutes-long Chromium render, so the worker is the one separate process |

There are no microservices: one web app, one worker and one database.

### The AI planner

- **Language:** TypeScript, with the official `@anthropic-ai/sdk`.
- **Model:** `claude-opus-5-5`, the current default. Set `output_config.effort` explicitly, because its default is `medium`. Start at `medium` and measure plan quality on 30 real prompts before moving it.
- **Output:** use structured outputs (`output_config.format` with a JSON schema mirroring the zod `Plan` type). The plan is: scenes[] (order, duration_ms, background asset id, text layers), hook, caption and hashtags. Validate with zod again before saving, and treat a validation failure as a failed plan (refunded).
- **Inputs:**
  - The user's prompt.
  - Per asset: a short description, its kind and its duration.
  - Keyframes as images: 3 per video, extracted with FFmpeg. Claude reads images; it does not take video or audio directly.
  - Optionally, the user's caption preset and brand voice.
- **"Original only":** the planner may only reference the user's asset ids (or stock ids the user picked). It never generates replacement images. This is fix #7, and it's a product rule, not a model setting.
- **Refusals:** check `stop_reason == "refusal"` before reading content. Enable server-side fallbacks (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`). A refusal that still fails means no plan, so refund the render. Drop the fallback setting if you'd rather not use it.
- **Caching:** the system prompt (style rules, schema explanation) is the stable prefix; mark it cacheable so repeated plans pay cached-input prices.
- **Rough cost per plan, estimated not measured:** about 10K input tokens (prompt + ~6 keyframe images) and ~2K output at $4 / $20 per million tokens comes to roughly $0.05–0.10 per plan. Measure real `usage` on beta traffic before finalising credit prices. Using a cheaper model (e.g. Claude Sonnet 5.5 or Haiku 5.5) for steps like asset descriptions is your call once you have quality numbers.
- **Not covered:** spoken-word captions (transcribing speech in uploaded clips) needs a speech-to-text service. That's outside this stack, so pick a vendor when that feature is scheduled; it's not in the core loop (Limesnap's reels are text-overlay slideshows).

## Schema

- **12 tables**, in `replica/schema.sql`.
- **Access rules:** Postgres **row level security** on every table.
- **Credit and billing tables are read-only to users.** Only server code (Supabase service role) changes them, and only through four SQL functions.

| table | holds |
| --- | --- |
| `profiles` | one row per auth user, current plan |
| `subscriptions` | Stripe subscription mirror; one live subscription per user (partial unique index) |
| `stripe_events` | webhook event ids, so a duplicate delivery is a no-op |
| `credit_accounts` | cached balance in two buckets (plan, top-up), with `check (>= 0)` |
| `credit_ledger` | append-only record of every grant, spend, refund, top-up and rollover trim |
| `projects`, `assets` | uploads, URL imports and stock picks (with attribution) |
| `chats`, `messages` | the chat workspace (S06), feedback 👍/👎 |
| `generations` | one reel or carousel; plan stored as versioned `jsonb` |
| `renders` | one row per render attempt; **the unit of billing** |
| `caption_presets` | saved caption styles, one default per user (fix #6) |

**Why the plan is `jsonb`, not Scene/Layer tables:** the recon inferred Scene and Layer entities. They're always loaded, edited and rendered as one document, and the editor saves whole versions. One validated JSON document per version is simpler and lets the plan schema evolve quickly.

**The credit functions:**
- `spend_credits` locks the user's account row and spends plan credits first, then top-ups. It raises `insufficient_credits` if the balance is short.
- `refund_render` returns exactly what that render took, to the same buckets.
- `grant_monthly_credits` applies the rollover rule: new = min(left over, one month's grant) + grant.
- `add_topup` adds top-up credits.
- **Idempotency is enforced by unique indexes:**
  - one spend per render
  - one refund per render
  - one grant per Stripe invoice
  - one top-up per checkout session
  - one render per client idempotency key

**Tested 2026-11-20** on Postgres 16 with a stand-in for the Supabase `auth` schema. 16 checks, all passed as intended:
- signup grant
- spend
- double spend blocked
- double-tap blocked
- double refund is a no-op
- overdraft blocked with the balance unchanged
- top-up retry counted once
- a spend crossing both buckets
- the refund returns to the right buckets
- the upgrade grant
- the same invoice twice
- rollover trim
- the cross-user checks: user B can't read user A's rows, can't post into A's chat, can't raise their own balance, and can't call the credit functions

**Not yet tested on a real Supabase project.** Apply it there and re-run the RLS checks with real JWTs.

## API

**Server actions and route handlers in Next.js.** Every one:
- checks the Supabase session;
- uses the user-scoped client, so RLS applies;
- switches to the service role only for the credit functions and webhooks.

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `GET /auth/callback` | Supabase OAuth callback | public | code | session → `/app` | F01 |
| `POST /api/uploads` | create a signed upload URL + `assets` row (pending) | user | project_id?, mime, bytes | asset id, upload URL | F02, F03 |
| `POST /api/assets/:id/complete` | mark uploaded, enqueue `probe-asset` | owner | — | asset | F02 |
| `POST /api/assets/import` | import by URL or stock id | user | url \| {provider, id} | asset | F02 |
| `GET /api/stock/search` | proxy Pexels search (keeps the key server-side) | user | q, kind, page | results | S15 |
| `GET/POST/PATCH/DELETE /api/projects[/:id]` | project CRUD | owner | name | project | S12 |
| `GET /api/chats`, `POST /api/chats` | list / create chats | owner | project_id? | chat | S06 |
| `POST /api/chats/:id/messages` | send a message; Claude replies with ideas, or **proposes** a generation with a cost quote | owner | text, attachment_ids | assistant message (streamed) + optional `quote` | F02, F03, F04 |
| `PATCH /api/messages/:id` | thumbs up/down | owner | feedback | message | S06 |
| `POST /api/quotes` | price a generation or re-render before it runs (fix #1) | owner | kind, asset_ids, scene count | `{credits, watermark, balance_after}` | F02, F05 |
| `POST /api/generations` | **confirm and generate**: create generation + render, call `spend_credits`, enqueue `plan-and-render` | owner | quote inputs, prompt, **idempotency_key** | generation, render (queued) | F02, F03 |
| `GET /api/generations/:id` | plan, renders, signed output URLs | owner | — | generation | S07, S08 |
| `PUT /api/generations/:id/plan` | save editor changes as a new plan version (no charge) | owner | plan (zod-validated), base_version | generation | F05 |
| `POST /api/generations/:id/renders` | re-render the current version (quoted; refunded on failure) | owner | idempotency_key | render | F05 |
| `GET /api/renders/:id` | poll status (or Supabase Realtime on `renders`) | owner | — | status, outputs | S08 |
| `GET /api/renders/:id/download` | signed download URL | owner | — | URL | F02, F03 |
| `GET /api/library` | generated posts library | owner | cursor | generations | S13 |
| `GET/POST/PATCH/DELETE /api/caption-presets[/:id]` | caption presets | owner | style | preset | fix #6 |
| `GET /api/credits` | balance + ledger page (every spend and refund visible) | owner | cursor | balance, entries | S14 |
| `POST /api/billing/checkout` | Stripe Checkout for a plan or top-up pack | user | price lookup key | checkout URL | F01, top-up |
| `POST /api/billing/portal` | Stripe Customer Portal (one-tap cancel) | user | — | portal URL | F06 |
| `DELETE /api/account` | delete account + storage (GDPR) | user | confirm | 204 | S14 |

**22 routes** (counting each CRUD group as one).

**Webhooks in:** `POST /api/webhooks/stripe`, verified by signature and deduplicated via `stripe_events`.
- `checkout.session.completed` (top-up) → `add_topup`.
- `invoice.paid` → `grant_monthly_credits(grant, invoice id)`.
- `customer.subscription.updated/deleted` → mirror into `subscriptions` and `profiles.plan`. On cancel the plan stays until `current_period_end`.

**Webhooks out:** none.

**Jobs** (pg-boss on the Fly worker, plus Vercel Cron for schedules):

| job | trigger | does |
| --- | --- | --- |
| `probe-asset` | upload complete | FFmpeg probe (duration, size), 3 keyframes, AI description → `assets.ready` |
| `plan-and-render` | generation confirmed | Claude plan (if none) → Remotion render → upload output → `succeeded`. Retries 2× on transient errors; final failure → `failed` + `refund_render` + email/notice |
| `render` | re-render | same, minus planning |
| `reap-stuck-renders` | every 5 min | renders stuck `rendering` > 15 min → fail + refund |
| `free-monthly-grant` | daily | Try-plan users past `next_grant_at` → `grant_monthly_credits(10, 'free-'+user+'-'+YYYY-MM)` |
| `renewal-reminders` | daily | subscriptions renewing in 3 days (monthly) or 7 days (annual) → Resend email with amount + cancel link |
| `cleanup-orphans` | daily | delete pending uploads > 24 h and their storage objects |

Only official APIs with your own keys: Anthropic, Stripe, Pexels, Resend, Supabase. Nothing of Limesnap's.

## The parts that bite

- **Idempotency:**
  - Stripe sends webhooks more than once; event ids are deduplicated, and grants and top-ups are unique per Stripe reference.
  - The client sends an `idempotency_key` per confirm tap.
  - Jobs can run twice; spend and refund are unique per render.
- **Races:** two renders started at once both try to spend the last credits. `spend_credits` takes a row lock and the `check (>= 0)` constraint makes overdraft impossible (tested).
- **Charge-then-fail window:**
  - Credits are spent *before* the job runs, so the user can't overspend with parallel renders.
  - Every path that ends a render without success (error, timeout, stuck, refusal, invalid plan) must call `refund_render`.
  - The reaper job catches anything that slips through.
  - Track `credit_refund_issued` in analytics.
- **Long jobs:** renders take seconds to minutes. Never run them in a Vercel function. Show progress from the `renders` row through Supabase Realtime.
- **File sizes:** cap uploads (e.g. 500 MB video, 20 MB image) at signed-URL creation and re-check in `probe-asset`. Reject unsupported codecs with a clear message *before* any charge.
- **Preview ≠ render drift:** use one Remotion composition for both. Fonts must be self-hosted and licensed for embedding in video.
- **Rate limits:** the Anthropic API returns 429 under load, so queue concurrency must be capped and retries backed off. The Pexels API has its own limits, so cache searches.
- **Time zones:** renewal and grant times are UTC `timestamptz`; display in the user's local time. Billing-period edges come from Stripe, never computed locally.
- **Multi-tenancy:** single-user accounts; RLS on owner columns. Studio's "3 brands" means caption presets plus projects, not separate orgs, until teams are scoped.
- **GDPR deletion:** `DELETE /api/account` removes storage objects first, then the `auth.users` row, which cascades through every table. Stripe customer data follows Stripe's deletion process.
- **Abuse:** the free plan gives 10 credits with no card, which invites throwaway accounts. Use email verification and a per-IP signup rate limit; add more checks only if abuse shows up in metrics.
- **Instagram:** no scraping. The optional "brand voice from my Instagram" uses the official Instagram API with Instagram Login on the user's own professional account, scheduled late.

## Build order

1. **Vertical slice (proves the stack, ugly is fine).**
   - Screens: S02 sign-in → S06 chat (prompt + attach) → S08 reel preview → download.
   - Tables: profiles, credit_accounts, credit_ledger, assets, chats, messages, generations, renders.
   - Routes: auth callback, uploads, assets complete, chats, messages, quotes, generations, renders, download.
   - Jobs: probe-asset, plan-and-render, reaper.
   - **Includes from day one:** the cost on the button, spend before render, refund on failure. The angle can't be bolted on later.
2. **Must-haves:**
   - Google + email auth.
   - Captions on every generation.
   - Settings (S14) with the credit history.
   - Stripe plans + webhooks + portal cancel.
   - Watermark on the Try plan.
   - Renewal-reminder emails.
   - Free monthly grant.
3. **Should-haves:**
   - Carousel generation (S07; stills from the same compositions).
   - Scene editor (S10), mobile-first.
   - Projects (S12) and library (S13).
   - Chat history titles.
   - Caption presets.
   - Autosave and resumable uploads.
   - Ideas chat (S09).
4. **Could-haves:**
   - Stock picker (S15).
   - Global background video.
   - Carousel slide editor.
   - Message feedback.
   - Instagram Login brand voice.
   - Credit top-up packs, if not already done with Stripe in step 2.
5. **Fixes from replica-entrepreneur (rows with `original=no` in `features.csv`):**
   - #1–#3 (price first, refund on fail, one-tap cancel) are in milestones 1–2 by design.
   - #4 (mobile editing) and #6 (caption presets) are in milestone 3.
   - #7 (original only) is a planner rule from milestone 1.
   - #8 (human support) is a launch task.
