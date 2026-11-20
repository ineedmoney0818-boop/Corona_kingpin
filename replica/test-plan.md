# Test plan: Reelplain

**Build:** branch `claude/confident-gauss-wcku3u`, plus this test commit. **Date:** 2026-11-20.
**Environment:** production build (`next build && next start`) on **local Supabase** (Postgres, Auth, Storage, Mailpit), seed from `supabase/seed.sql`. Each test signs up its own user with a unique email.

**Guards in every spec:**
- the test fails on any browser console error (expected 4xx resource logs excepted);
- it fails on any **5xx response**;
- an **axe** WCAG 2.2 AA scan runs on each screen.

Flows come from `recon.md`. Limesnap's F04 (ideas chat) isn't built in Reelplain yet, so its cases are **blocked**. F06 (cancel) uses the Stripe portal; the live portal is manual and the webhook side is automated.

| case | flow | type | steps | expected | auto |
| --- | --- | --- | --- | --- | --- |
| F01-H1 | F01 get started | happy | sign up with name, email, password | lands on /app; sidebar shows 10 credits; a11y clean | e2e |
| F01-H2 | | happy: seeded user | sign in as demo@reelplain.test | /app; seeded project visible on Projects | e2e |
| F01-H3 | | happy: password reset | forgot → email (Mailpit) → link → new password → sign in | signs in with the new password only | e2e |
| F01-H4 | | happy: delete account | Settings → delete, type email | auth user, rows and files gone; can't sign in | e2e |
| F01-E1 | | edge: empty input | submit empty sign-up | three field errors, no account | e2e |
| F01-E2 | | edge: very long input | 200-char name | stored ≤60 chars; no horizontal scroll | e2e |
| F01-E3 | | edge: emoji and accents | name "Zoë Ñandú 🎬" | greeting shows it intact | e2e |
| F01-E4 | | edge: double click submit | double-click "Make my account" | exactly one account | e2e |
| F01-E5 | | edge: keyboard only | sign up with Tab/type/Enter | reaches /app | e2e |
| F01-E6 | | edge: mobile width | 390 px sign-up and app | no horizontal scroll; menu opens | e2e |
| F01-E7 | | edge: revoked session | "sign out everywhere" on device A | device B redirected; its API gets 401 | e2e |
| F01-N1 | | negative: wrong password | sign in with a bad password | plain error, still signed out | e2e |
| F01-N2 | | negative: existing email | sign up twice | "already an account" | e2e |
| F01-N3 | | negative: signed out | open /app with no session | redirect to /sign-in | e2e |
| F01-N4 | | negative: rate limit | 6 reset requests in 15 min | 6th says "Too many requests" | e2e |
| F01-M1 | | manual: Google OAuth | needs your Google OAuth client | lands in /app | manual (blocked) |
| F01-M2 | | manual: real confirmation email delivery | needs Resend/SMTP | email arrives from your domain | manual (blocked) |
| F02-H1 | F02 reel from my clips | happy | attach clip + photo, prompt, "Make reel · 4 credits" | real mp4 renders; 10 → 6 credits; download is H.264 | e2e |
| F02-E1 | | edge: empty input | no prompt | button disabled | e2e |
| F02-E2 | | edge: long input + emoji | 2,000-char prompt with emoji | renders; chat title cut cleanly | e2e |
| F02-E3 | | edge: double click submit | double-click the cost button | 1 render, 1 charge | e2e |
| F02-E4 | | edge: two tabs at once | same idempotency key from 5 parallel requests | 1 render, 1 charge, no orphan rows | e2e |
| F02-E5 | | edge: refresh mid-render | reload while rendering | progress continues; video appears | e2e |
| F02-E6 | | edge: back button mid-flow | back right after submitting | no duplicate generation | e2e |
| F02-E7 | | edge: offline | go offline, attach a file | upload error shown on the chip; nothing charged | e2e |
| F02-E8 | | edge: slow network | delay the generate call | button shows "Starting…" and can't be pressed again | e2e |
| F02-E9 | | edge: second user's data | user B requests A's render, file, chat | 404 / not-found page | e2e |
| F02-N1 | | negative: not enough credits | balance 2, reel costs 4 | "Get credits" before tapping; API returns 402; nothing written | e2e |
| F02-N2 | | negative: wrong file type | attach a .txt | refused before upload with a plain message | e2e |
| F02-N3 | | negative: render fails | storage file deleted before render | failed; credits back; notice in chat; ledger shows refund | e2e |
| F03-H1 | F03 carousel from photos | happy | attach 2 photos, Carousel, make | 2 slides; prev/next works; 3 credits | e2e |
| F03-E1 | | edge: video attached | attach a video, pick Carousel | blocked with an explanation | e2e |
| F04-* | F04 brainstorm ideas | — | — | not built (needs the Claude planner) | blocked |
| F05-H1 | F05 tweak a reel | happy | edit text and position → save (free) → render (1 credit) | version 2 renders; history shows 2 | e2e |
| F05-E1 | | edge: two tabs at once | save in tab A, then save in tab B | B gets "changed somewhere else", no overwrite | e2e |
| F05-E2 | | edge: mobile width | editor at 390 px | no horizontal scroll; panels stack | e2e |
| F06-H1 | F06 billing / cancel | happy (webhook) | signed subscription created → updated(cancel) → deleted | plan creator → creator → try | e2e |
| F06-E1 | | edge: duplicate webhook | same event twice | applied once | e2e |
| F06-N1 | | negative: bad signature | wrong signature | 400, nothing applied | e2e |
| F06-N2 | | negative: Stripe unreachable | click a plan with an invalid key | friendly error, no 5xx | e2e |
| F06-M1 | | manual: checkout with test card 4242… | needs Stripe test keys | plan becomes Creator; 120 credits | manual (blocked) |
| F06-M2 | | manual: declined card 4000 0000 0000 0002 | needs Stripe test keys | Stripe shows decline; plan unchanged | manual (blocked) |
| F06-M3 | | manual: portal cancel | needs Stripe test keys | cancel at period end; plan kept until then | manual (blocked) |
| X-A1 | all screens | a11y | axe on landing, pricing, sign-in, sign-up, app, chat, generation, editor, library, projects, settings | no WCAG 2.2 AA violations | e2e |
| X-T1 | dates | edge: time zones | user in Pacific/Auckland reads credit history | dates in the user's zone | e2e |

**Results:** see `bugs.md` and the summary at the end of this run.
