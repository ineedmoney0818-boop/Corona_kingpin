# Bugs: Reelplain

Only reproduced bugs are listed. Each fixed bug has a test that failed before the fix and passes after.

**Environment:** production build on local Supabase, Chromium (Playwright 1.63), 1440 px unless noted.

**Open by severity:** S1 0 · S2 0 · S3 0 · S4 0.

---

## Found by `/replica-test` (this step)

### BUG-001: Cost buttons' spoken name doesn't contain their visible text
- **Severity:** S3 (WCAG 2.5.3 Label in Name)
- **Flow / case:** F01-H1, F02-H1 (axe `label-content-name-mismatch`, serious)
- **Screen:** S06
- **Build:** 978c232. Chromium, 1440 px.

**Steps**
1. Sign up and open /app.
2. Run axe.

**Expected:** the button's accessible name contains "Make reel 4 credits", so speech-control users can say what they see.
**Actual:** `aria-label="Make reel, uses 4 credits"` overrode the visible text.
**Evidence:** test F01-H1 failed with `label-content-name-mismatch` on `button[aria-label="Make reel, uses 4 credits"]`.
**Status:** fixed in e7001e2. The overriding aria-labels were removed (Composer, ReRender); the name is now the visible text.

### BUG-002: Credit history and render dates show the server's date, not the user's
- **Severity:** S3
- **Flow / case:** X-T1
- **Screen:** S14 Settings, S08 render history, sidebar renewal date
- **Build:** 978c232. Chromium with time zone Pacific/Kiritimati (UTC+14).

**Steps**
1. Sign up while it's 20 Nov 14:00 UTC (21 Nov in the user's zone).
2. Open Settings → Credit history.

**Expected:** "Nov 21", the user's local date.
**Actual:** "Nov 20" (UTC, formatted on the server).
**Evidence:** test X-T1, `getByRole('cell', { name: 'Nov 21' })` not found.
**Status:** fixed in e7001e2. A new `LocalDate` client component formats each date in the viewer's own zone, with no hydration error.

### BUG-003: Billing outage returns a generic 500
- **Severity:** S3
- **Flow / case:** F06-N2
- **Screen:** S14
- **Build:** e7001e2.

**Steps**
1. Stripe is unreachable or the key is invalid.
2. Settings → "Creator · $19/month".

**Expected:** a 503 with a billing-specific message saying nothing was charged.
**Actual:** a 500 with "That didn't work on our side. Nothing was charged." That's a server-error status for an upstream outage, and nothing says it's billing.
**Evidence:** test F06-N2. The fixture's 5xx guard flagged `500 on POST /api/billing/checkout`.
**Status:** fixed in 2120194. `StripeError` now maps to `503 billing_unavailable`: "Billing is unavailable right now. Nothing was charged. Try again in a few minutes."

### BUG-004: Cost chip text fails contrast on enabled buttons
- **Severity:** S3 (WCAG 1.4.3)
- **Flow / case:** F05-H1 (axe `color-contrast`, serious)
- **Screen:** S10 editor; any enabled primary button with a cost
- **Build:** e7001e2.

**Steps**
1. Open the editor.
2. Run axe on the "Render · 1 credit" button.

**Expected:** at least 4.5:1 for 12 px text.
**Actual:** white text on `on-accent/20` over ember, which is a lightened tint, below 4.5:1. (Earlier scans missed it because axe skips disabled buttons, and the composer button is disabled until a prompt is typed.)
**Evidence:** test F05-H1: `color-contrast (serious)` on the chip span.
**Status:** fixed in 2120194. The chip background is now the `accent-hover` token, 6.80:1 (contrast.py).

### BUG-005: Preview background images have no alt attribute
- **Severity:** S2 (axe `image-alt`, critical; screen readers announce file names)
- **Flow / case:** F05-H1
- **Screen:** S10 editor (Remotion Player)
- **Build:** e7001e2.

**Steps**
1. Open the editor for a reel with photos.
2. Run axe.

**Expected:** decorative backgrounds are skipped by assistive tech.
**Actual:** `<img>` with no `alt`.
**Evidence:** test F05-H1: `image-alt (critical)` on `img`.
**Status:** fixed in 2120194. `alt=""` is set on the background `<Img>` (the text layer carries the meaning).

---

## Found and fixed earlier (build and backend steps), reproduced at the time

| ID | sev | what | found by | fixed in |
| --- | --- | --- | --- | --- |
| BUG-006 | S1 | The double-tap idempotency key was created during render, so it would be **baked into the prerendered page and shared by every visitor** (one user's tap could replay another's) | `next build` prerender error on `crypto.randomUUID()` | 1ee57c3 (key made on first tap) |
| BUG-007 | S2 | Generate route wrote the chat and message *before* checking credits and replays: orphan rows on 402 and double taps | code review + e2e 5b | 1ee57c3 |
| BUG-008 | S3 | Short of credits: button stayed enabled; "Get credits" only appeared after a failed tap | e2e 5c | 1ee57c3 |
| BUG-009 | S2 | Simultaneous identical requests: one charge, but the loser got a **500** and left an orphan message | e2e (5 parallel taps), intermittent | 7a666e5 (SQL treats unique_violation as replay; loser discards its rows) |
| BUG-010 | S2 | Dev render runner: a job queued just as the drain loop finished sat queued until the reaper (15 min) | race analysis; closed defensively | 7a666e5 |
| BUG-011 | S2 | Auth form rendered twice (placeholder + streamed); submitting the placeholder lost the result, so the user saw nothing | e2e password-reset flow | 7a666e5 |
| BUG-012 | S1 | "Sign out everywhere" didn't end other sessions for up to an hour (`getClaims` accepts revoked tokens) | e2e with two devices + control test | 7a666e5 (`getUser` on every request) |
| BUG-013 | S2 | Supabase session cookie readable by page scripts (not httpOnly) | e2e cookie inspection | 7a666e5 |
| BUG-014 | S3 | Delete-account error hidden in a `<details>` that closed on refresh | e2e | 7a666e5 |
| BUG-015 | S2 | Default Supabase email links were browser-bound (PKCE) and redirected to a non-allow-listed URL, so reset failed on another device | e2e (Mailpit link) | 7a666e5 (token-hash templates) |

---

## To check (not reproduced, or can't be tested here)

- **Renewal reminder email** shows the date in UTC; the user's zone is unknown server-side. Consider "Dec 3 (UTC)" or storing a time zone at sign-up.
- **Google OAuth, live Stripe Checkout and Portal, declined card `4000 0000 0000 0002`, real email delivery:** manual cases F01-M1/M2 and F06-M1–M3. They need your accounts.
- **Claude planner, live:** no API key in this session. Check plan quality and refusal handling on 30 real prompts.
- **Screen reader pass (VoiceOver / NVDA)** by a human. axe covers markup, not the spoken experience of the editor.
- **Very large uploads (≈500 MB)** over a slow connection: there's no resumable upload yet (feature row "Autosave drafts and resumable uploads").
