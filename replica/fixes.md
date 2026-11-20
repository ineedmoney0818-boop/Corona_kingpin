# Fix plan: AI short-form video / Reels tools (Limesnap's market)

## Sample — read this first

- **922 reviews** (925 rows, 3 duplicates removed), **2 sources**:
  - App Store, via Apple's official customer-reviews RSS feed: 918 reviews, most recent first, pulled 2026-11-20.
  - Hacker News, via the Algolia API: 7 hand-picked comments. The other ~400 HN hits were job posts and noise.
- **Per product:** CapCut 255, OpusClip 252, Captions 250, Edits 100, Predis 36, Vizard 24, MagicClip 8.
- **Limesnap itself: 0 public reviews.** This is research on the market it sells into, not on Limesnap.
- **Not included:** Trustpilot, G2 and Reddit served bot-verification walls, Product Hunt returned 403, and Capterra had no page at the URL tried. Those were not bypassed, per the skill rules. Desktop/web buyers (G2-type reviewers) are therefore under-represented, and so is everything the App Store doesn't capture.
- **Links:** Apple's feed has no per-review permalink. App Store rows link to the app's review page (`apps.apple.com/us/app/id<ID>?see-all=reviews`) and carry the date and star rating so they can be found. HN rows link to the exact comment.
- **Skew:** OpusClip's App Store rating is inflated (186 of 250 reviews are 5★, avg 4.39). Captions (avg 2.48) and CapCut (avg 2.68) carry most of the complaints.
- **"Thin":** the tool flags any theme from only one source as thin. Since 918 of 922 reviews are App Store, a 63-review theme can still be flagged thin. Treat the review count as the real signal; "1 source" means "App Store only".

App IDs: OpusClip 6743615403 · Captions 1541407007 · CapCut 1500855883 · Edits 6738967378 · Vizard 6748490660 · Predis 6450264767 · MagicClip 6748401548

## 1. What they hate

1. **Paywall sprung after the work is done, mostly at export** — Price/paywalls theme: 124 reviews, 2 sources, avg 2.1★.
   - "I spent considerable time recording and editing a video using Captions' teleprompter, only to discover afterward that exporting my completed project required a paid subscription." — Captions, 2★, 2026-11-12, https://apps.apple.com/us/app/id1541407007?see-all=reviews
   - "Was only adding Spanish captions to a video spent 3 hours editing them and at the end SURPRISE! You have to pay t…" — Captions, 1★, 2026-08-14, same link
2. **Credits burned on failed or wrong AI output** — 74 reviews, 2 sources, avg 2.1★.
   - "It takes a long time to generate and then it crashes, you've lost the credits and you have to start from scratch." — Captions, 1★, 2026-11-11, https://apps.apple.com/us/app/id1541407007?see-all=reviews
   - "The edits are bad and every time it gives you a bad job it consumes credits to fix it." — Captions, 1★, 2026-10-23, same link
3. **Charged after cancelling; hard to cancel** — 63 reviews, App Store only, avg 1.2★.
   - "I've canceled all my accounts and unsubscribed from Pro. But they keep charging me every month." — CapCut, 1★, 2026-11-18, https://apps.apple.com/us/app/id1500855883?see-all=reviews
   - "if you cancel your subscription, they take away the unused credits you already paid for" — Captions, 1★, 2026-08-28, https://apps.apple.com/us/app/id1541407007?see-all=reviews
4. **Crashes that lose work** — 66 reviews, 2 sources, avg 1.7★.
   - "the app will close out or your phone will go into sleep mode because of how long it takes and none of your work is saved" — Captions, 1★, https://apps.apple.com/us/app/id1541407007?see-all=reviews
5. **The AI overrides the user** — about 25 reviews on manual control, App Store only. **Thin by source rule, strong in the text.**
   - "The AI just does what it wants. No regard on what i want or can do to edit." — Captions, 1★, 2026-11-02, https://apps.apple.com/us/app/id1541407007?see-all=reviews
   - "I don't need auto reframing, i don't auto centering. I just need my footage to be clipped." — OpusClip, 1★, 2026-09-08, https://apps.apple.com/us/app/id6743615403?see-all=reviews
6. **Support is a bot or absent** — 17 reviews, App Store only. **Thin.**
   - "Customers service is low grade AI and won't hand reviews over to a human." — OpusClip, 1★, 2026-10-20, https://apps.apple.com/us/app/id6743615403?see-all=reviews
7. **Uploads time out or stall** — 16 reviews, App Store only. **Thin.**
   - "Downloaded the app and unable to upload any videos. It just keeps timing out." — OpusClip, 1★, https://apps.apple.com/us/app/id6743615403?see-all=reviews

## 2. What is missing

1. **Editing clips on the phone after the AI cuts them** (OpusClip mobile). Found by hand: at least 5 reviews, App Store only. **Thin.**
   - "I just really wish I can edit clips within the app and not have to do it on the browser or computer." — OpusClip, 4★, 2026-11-13, https://apps.apple.com/us/app/id6743615403?see-all=reviews
   - "there is no way to edit the clip length or add music or do basically anything that you can do on the web version." — OpusClip, 3★, same link
2. **Caption control**: save a favourite style, turn captions off, move their position, single-word blocks. Several reviews across CapCut, OpusClip and Captions, App Store only. **Thin.**
   - "it's already bad enough you don't have an option to save my fav one" — CapCut, 1★, 2026-11-15, https://apps.apple.com/us/app/id1500855883?see-all=reviews
   - "Sometimes I need the captions to be at the bottom and then move to the top if they get in someone's face." — Captions, 1★, https://apps.apple.com/us/app/id1541407007?see-all=reviews
3. **Buying more credits without changing plan.** **Thin** (single quotes).
   - "Downfall is no way to buy more credits" — OpusClip, 4★, 2026-08-21, https://apps.apple.com/us/app/id6743615403?see-all=reviews
4. **Posting straight to Instagram with the text intact** (Edits). **Thin.**
   - "It never exports with the text even when directly downloading OR posting to Instagram directly." — Edits, 1★, https://apps.apple.com/us/app/id6738967378?see-all=reviews

## 3. What is unsolved (positioning)

1. **Creators who want their own footage and photos left alone, not regenerated by AI.** About 3 reviews, App Store only. **Thin.**
   - "the app is going out of its way to totally generate new images based on what you upload. Not using your original unique content." — Captions, 1★, 2026-11-02, https://apps.apple.com/us/app/id1541407007?see-all=reviews
2. **Businesses with brand assets and teams.** 1 HN comment. **Thin.**
   - "The problem is that CapCut isn't really built for businesses." — https://news.ycombinator.com/item?id=46079463
3. **Carousels / photo posts — no evidence either way.** Almost no reviews mention carousels. Predis, the closest carousel tool, has 36 reviews averaging 4.1★. Do not claim this as a pain point.

## Fix plan

| # | Fix | Size | Skill | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Show the price before work starts. Never block an export of something already made: let free users export with a watermark, or include N free exports. | S | /replica-launch + /replica-build | Price/paywall, 124 reviews, 2 sources |
| 2 | Refund credits automatically when a render fails or the user rejects a regeneration. Show each action's credit cost before it runs. | M | /replica-backend | Credits, 74 reviews, 2 sources |
| 3 | One-tap cancel in the app and on the web. Cancelling keeps the paid period and its remaining credits. | S | /replica-backend + /replica-launch | Billing, 63 reviews |
| 4 | Full manual edit on mobile after AI drafts: trim, caption text and position, delete clip. | L | /replica-build | Manual control ~25 reviews + OpusClip mobile-edit quotes |
| 5 | Autosave drafts and resumable uploads, so a crash or timeout never loses work. | M | /replica-backend | Crashes 66 + uploads 16 |
| 6 | Caption presets: save favourites, toggle captions off, single-word mode, movable position. | S | /replica-build | Caption-control quotes (thin) |
| 7 | "Original only" switch: no AI regeneration of the user's images, auto-reframe off by default. | S | /replica-build | AI-overrides quotes (thin) |
| 8 | A human support path with a stated reply time. | S | /replica-launch | Support, 17 reviews (thin) |

## Angle

**A — "No surprise bill." (recommended)**
For creators who've been hit with a paywall at export, burned credits on broken renders, or been charged after cancelling, {{your app}} shows the price up front, never charges for a failed render, and cancels in one tap.
Evidence: price/paywalls 124, credits 74 and billing 63 reviews. Price/paywalls and credits each span 2 sources; billing is App Store only. These are the top three complaint themes.

**B — "AI drafts, you decide."**
For creators whose AI editor "does what it wants", {{your app}} makes the first cut and then gives full manual control on the phone.
Evidence: manual-control theme ~25 reviews plus OpusClip mobile-edit requests. App Store only, so **thin**.

**C — "Your footage, untouched."**
For creators tired of AI replacing their content, {{your app}} only cuts, captions and formats what you shot.
Evidence: about 3 reviews. **Thin.** Use as a supporting line, not the headline.

**Recommendation: lead with A, ship B as the main product feature.** A is backed by roughly 260 reviews and is cheap to deliver (pricing and billing rules, not AI research). It's also the place where Limesnap's own model, $47+/month plans, is most exposed.

Reviewer quotes are research only. Do not use them as testimonials, and keep competitor names out of your branding.

Next: `/replica-brand`.
