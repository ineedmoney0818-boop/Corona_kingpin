# Backend: Reelplain

**Status, 2026-11-20:** built and tested against a **local Supabase stack** (Postgres 17, Auth, Storage, Mailpit), with Stripe webhooks tested using Stripe's own signature helper.

**Not yet run against your live accounts.** None of them exist yet: Supabase, Stripe, Resend, Google, Anthropic.

## What runs where

| piece | code | backend switch |
| --- | --- | --- |
| Data layer | `web/src/lib/data/{supabase-store,supabase-system,fake-store}.ts` | Supabase when `NEXT_PUBLIC_SUPABASE_URL` is set, otherwise the local fake store (dev only) |
| Migrations | `supabase/migrations/2026112000000{1,2}_*.sql` | `npm run db:reset` locally, `npm run db:push` to the hosted project |
| Auth | `web/src/app/(auth)/actions.ts`, `app/auth/{callback,confirm}`, `src/proxy.ts` | Supabase Auth |
| Email templates (auth) | `supabase/templates/*.html` | wired in `supabase/config.toml` locally. **Paste them into the hosted dashboard** (Auth → Email templates) |
| AI planner | `web/src/lib/plan/claude-planner.ts` (`claude-opus-5-5`, structured outputs, refusal fallback) | runs when `ANTHROPIC_API_KEY` is set. Production refuses the stand-in planner |
| Billing | `web/src/lib/billing/stripe.ts`, `app/api/billing/*`, `app/api/webhooks/stripe` | needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` |
| Email | `web/src/lib/email/send.ts` (Resend) | logs instead of sending without `RESEND_API_KEY` |
| Render queue | `claim_next_render()` (Postgres `SKIP LOCKED`); `npm run worker` on Fly; in-process for local dev | `RENDER_IN_PROCESS=0` on the production web app |
| Cron | `app/api/cron/{daily,reap}` + `web/vercel.json` | `CRON_SECRET`. Vercel Hobby only allows daily crons, so the 5-minute reaper needs Pro (or the worker's built-in reaper, which runs every 5 minutes anyway) |

## Tested (local Supabase, production build), all passing

**Auth**
- Sign up with immediate session (local confirmations off).
- Sign in.
- Signed-out `/app` redirects to `/sign-in` (307).
- **Password reset end to end:** request → email in Mailpit (our template) → link → `/auth/confirm` → new password → sign in with it.
- Unknown email gets the same answer, so the form can't be used to discover accounts.
- **Sign out everywhere:** the other device is sent to sign-in immediately, and its API calls return 401.
- **Delete account:** the wrong confirmation is refused. The right one removes the auth user, profile, generations, ledger and all 4 stored files, and the deleted user can't sign in.

**Uploads**
- Signed direct-to-storage uploads, with metadata from ffprobe through a signed URL.
- A `.txt` file is refused (415) before upload.
- Completing an upload in someone else's folder is refused (400).

**Core loop**
- A real reel rendered via the Postgres queue in ~20 s, a 540×960 H.264 mp4, with credits going 10 → 6.
- Download through a signed URL.

**Idempotency**
- **5 simultaneous identical requests → 1 render, 1 charge, no orphan rows**, stable over 4 runs.
- The first version returned a 500 and left an orphan message under this race. Fixed in SQL (a duplicate-key collision is treated as a replay) and in the route (the loser deletes what it wrote).

**Refunds**
- A file deleted from storage before render → failed → automatic refund → notice in the chat, and the ledger shows Used −4 / Refunded +4.
- The reaper fails and refunds stuck renders.

**Isolation (row-level security)**
- A second user gets 404 on the first user's render, download and chat, and RLS hides their rows.
- The API roles (`anon` / `authenticated`) cannot execute any credit or queue function. Only `service_role` can.

**Worker**
- With `RENDER_IN_PROCESS=0` the web app only queues. `npm run worker` claimed and rendered the job in 7 s, and stopped cleanly on SIGTERM.

**Stripe webhooks** (signed with Stripe's test helper)
- A bad signature returns 400.
- A credit pack adds +50. The same event again is a no-op, and a new event for the same checkout is still one top-up.
- Subscription active → Creator with a 120 grant; cancel-at-period-end keeps the plan; the subscription ending drops to Try with a 10 grant.
- Ignored event types are recorded. 0 failures.

**Cron**
- No secret returns 401.
- The daily job granted monthly credits once; a second run the same day granted nothing.
- Rollover math is right: Dana 2 → 12, Fay 10 → 20.

**Rate limits**
- Password reset was limited after 5 requests in 15 minutes per IP: "Too many requests…".

**Regression**
- The fake-store mode still passes the original end-to-end tests.

## Bugs found and fixed during this step

- **Double-tap race:** 500 plus an orphan message. Fixed as described above.
- **Lost wake-up race in the dev render runner:** fixed, with a drain-again flag.
- **The auth form rendered twice**, as a streaming placeholder and then the real form. Submissions on the placeholder were lost, so a fast user saw no response. The form is now never swapped; only the error notice streams in.
- **Delete-account errors were hidden** in a collapsible that closed on refresh. It's now controlled.
- **Supabase's session cookie isn't httpOnly by default.** We now set `httpOnly` (the browser never needs the session).
- **`getClaims()` accepted revoked sessions for up to an hour.** Pages and APIs now use `getUser()`, which checks with the auth server: one extra request per call, in exchange for an immediate "sign out everywhere".
- **Supabase CLI parser:** it misreads `CASE … END` inside functions, so it was rewritten with `IF`.

## Not tested — needs your accounts

| what | why untested | what you do |
| --- | --- | --- |
| Claude planner, live | no API key here; Anthropic keys can't go through this session's secret form | create a key at console.anthropic.com, set `ANTHROPIC_API_KEY` on the host (and in an env var here if you want me to test it) |
| Google sign-in | needs your Google Cloud OAuth client | create an OAuth client (Web), add the Supabase callback URL, paste the client id/secret into Supabase → Auth → Providers → Google. Basic scopes (email, profile) need **brand verification** for your logo/name on the consent screen; start it early, it can take days |
| Stripe Checkout and Portal against real Stripe | no test key here | create the 4 plan prices + 2 credit packs with the **lookup keys** in `launch/pricing.md`; turn on the Customer Portal with "cancel at period end"; add a webhook endpoint for `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed` |
| `invoice.paid` grant path | it fetches the subscription from Stripe's API | covered once the test key exists |
| Sending real email | no Resend key or domain | verify your domain in Resend, set `RESEND_API_KEY` and `EMAIL_FROM`. In Supabase, set custom SMTP (Resend) so auth emails come from your domain too |
| Backups | no hosted project yet | Supabase Pro has daily backups. **Check they're on**; the free plan has none |

## Security checklist

- [x] Secrets only in env vars; `.env*` ignored (only `.env.example` is committed); the browser gets only `NEXT_PUBLIC_*` (the URL and publishable key).
- [x] Every API route validates input with zod on the server.
- [x] Authorisation on every read and write: RLS policies, plus owner filters in every query, plus server-only SQL functions. Tested with a second user.
- [x] Rate limits:
  - sign-up 10, sign-in 20 and reset 5 per 15 minutes per IP;
  - uploads 30 per minute per user;
  - plus Supabase Auth's own limits.
- [x] Stripe webhook signature verified on the raw body, event ids stored, handlers idempotent.
- [x] Uploads:
  - type and size are checked before signing;
  - real type, size and readability are checked after upload, and refused files are deleted;
  - files live in a **private bucket** (separate from the app) with owner-folder policies;
  - they're served by short-lived signed URLs.
- [x] No user data in URLs (ids only) or logs (emails redacted in logs).
- [x] `npm audit --omit=dev`: 0 vulnerabilities (2026-11-20).
- [ ] **Privacy policy listing every processor:** Supabase, Anthropic, Stripe, Resend, Vercel, Fly.io, Pexels (if used), PostHog/Sentry (if used). That's a launch task; it needs your legal entity.

## Integrations later

- **Instagram brand voice:** Instagram API with Instagram Login. It needs a Meta app and **App Review** for `instagram_business_basic`. Plan weeks, not days.
- **Pexels:** free API key, attribution required, rate limits apply. Cache searches.
