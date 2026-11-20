# Build log: Reelplain (web/)

**Stack as built:**
- Next.js 16.4.6 (App Router, Cache Components + Partial Prefetching), React 19.3, Tailwind 4.3 with the generated tokens.
- Remotion 4.0.545 for rendering, zod 4 for validation.

**Fake-mode layers** (same function signatures as the real ones; swapped in `/replica-backend`):
- **Data:** `src/lib/data/fake-store.ts`, an in-memory store saved to `.data/db.json`. It mirrors `schema.sql`: owner-scoped reads and writes, spend and refund once per render, no negative balances, idempotency keys, capped rollover.
- **Auth:** `src/lib/auth.ts`, email + password with scrypt hashes and an httpOnly session cookie.
- **Storage:** `src/lib/storage.ts`, local disk under `.data/files/<userId>/`.
- **Planner:** `src/lib/plan/fake-planner.ts`. Deterministic, **no AI**. It follows the same contract as the real planner: output must pass the zod Plan schema, and it may only reference the owner's assets.
- **Renders: real.** `src/lib/render/runner.ts` spawns `scripts/render-job.mjs` (Remotion + headless Chrome) per job. Every failure path refunds: worker error, crash, timeout, or a render orphaned by a server restart (the reaper).

| ID | date | status | missing | harder than expected |
| --- | --- | --- | --- | --- |
| S01 Landing | 2026-11-20 | done | real product screenshot (placeholder removed) | — |
| S02 Sign in | 2026-11-20 | partial | Google OAuth (button shown, disabled until Supabase) | — |
| S03 Sign up | 2026-11-20 | partial | Google OAuth; email verification | — |
| S04 Onboarding (brand voice) | — | not built | the whole screen; planned on the official Instagram Login API, no scraping | — |
| S05 Pricing / checkout | 2026-11-20 | partial | Stripe checkout; plans shown, all users on Try | — |
| S06 App shell + chat | 2026-11-20 | done | — | Cache Components: every per-user read had to stream in `<Suspense>`, and `usePathname` in the drawer had to as well; idempotency keys made during render would have been baked into the prerendered page, so they're now made on tap |
| S07 Carousel result | 2026-11-20 | done | swipe gesture (prev/next buttons work) | — |
| S08 Reel result | 2026-11-20 | done | — | — |
| S09 Ideas in chat | — | not built | needs the Claude planner; every message currently creates a generation | — |
| S10 Scene editor | 2026-11-20 | partial | add scene / add text / add image / swap background / global background video / clip trim | Remotion Player's controls overlap bottom-positioned text in the preview (render is unaffected) |
| S11 Carousel editor | 2026-11-20 | partial | same as S10 (one editor serves both) | — |
| S12 Projects | 2026-11-20 | partial | assigning uploads to a project; rename and delete | — |
| S13 Library | 2026-11-20 | done | pagination (fine at small counts) | — |
| S14 Settings | 2026-11-20 | partial | subscription management and one-tap cancel (Stripe); account deletion | — |
| S15 Stock picker | — | not built | needs a Pexels API key | — |

**Verified on a production build (`next build && next start`), 2026-11-20:**
- **Build, lint and types:** build passes, ESLint clean, `tsc` clean.
- **Real reel:** sign up gives 10 credits; attach a 4 s mp4 and a jpg; the button reads "Make reel · 4 credits". It rendered in **26 s** to a **540×960 H.264, 7.0 s** mp4 (`RENDER_SCALE=0.5` locally), and the balance went 10 → 6. The download works and was checked with ffprobe.
- **Double-tap:** the same idempotency key sent twice at once returned 201 + 200, the **same render**, and one charge.
- **Can't afford:** with 2 credits, a 4-credit reel returns **402** "You have 2, this needs 4." and no chat or message is written. The composer shows "Get credits" before the tap.
- **Forced failure:** a file deleted from storage before the render left it `failed`. The ledger shows **Used −4, Refunded +4**, and the chat shows "This one didn't render. Your 4 credits are back."
- **Carousel:** 2 PNG slides for 3 credits. Videos in a carousel are blocked, and a `.txt` upload is refused with 415 before anything is stored.
- **Editor:** dirty state; free save; then "Render my edits · 1 credit" re-renders, and the history shows 2 renders.
- **Isolation:** user B opening user A's chat gets the not-found page; A's render API returns 404, and re-rendering A's generation returns 404.
- **Signed out:** `/app/*` redirects to `/sign-in` (307, via `proxy.ts`).
- **Keyboard and mobile:**
  - keyboard-only sign-in works, and the composer is reachable by Tab;
  - the mobile drawer opens, navigates and closes on Esc;
  - no page is wider than 390 px;
  - zero JavaScript errors.

**Known gaps, said plainly:**
- **No AI yet.** Plans are template-based until the Claude planner is wired; that's the product's core value and it isn't here.
- **Single process.** The fake store and render queue live in one server process. Fine locally, wrong for production; Postgres + pg-boss + the Fly worker replace them.
- **Remotion license:** the Player logs a license notice until you confirm your license (see `architecture.md`). I didn't acknowledge it for you.
- **Test leftovers:** the test media and e2e scripts live in the session scratchpad, not the repo. `/replica-test` will turn them into a committed Playwright suite.

**Score:** **9 of 15 screens done or partial with the core states**, 3 not built (S04, S09, S15) plus S10/S11 partial.

**Feature matrix:**

| priority | yes | partial | no |
| --- | --- | --- | --- |
| must (14) | 6 | 6 | 2 (subscriptions, one-tap cancel: both Stripe) |
| should (10) | 4 | 3 | 3 |
| could (6) | 1 | 1 | 4 |
