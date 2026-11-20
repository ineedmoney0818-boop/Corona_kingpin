# Reelplain launch plan

**The blunt part first:** there's no product yet. Recon, architect, design, build, backend and test haven't run. Everything below is ready to go *once there's a working app*. The waitlist is the only part you can start today.

## Before launch
- [ ] **Register reelplain.com** (and .app). It's free today, but that can change any day.
- [ ] **Start a waitlist now:** deploy `site/index.html` with the button pointing at a waitlist form instead of sign-up. Real sign-ups are your only honest proof later.
- [ ] **Private beta, 20–50 people from the waitlist.** Ask permission before quoting anyone.
- [ ] **Analytics:** Plausible or PostHog, tracking these events:
  - `signup`
  - `first_upload`
  - `first_export`
  - `upgrade`
  - `cancel`
  - `credit_refund_issued`

  The last one proves the promise works.
- [ ] **Error tracking:** Sentry on app and backend. A failed render must both refund and alert you.
- [ ] **Legal pages:** privacy policy, terms, refund policy and support email. Apple and Google both require privacy and support URLs.
- [ ] **Store prep:**
  - Screenshots at the sizes App Store Connect and Play Console ask for at upload time. They change, so check then.
  - Privacy nutrition labels and the Play data safety form.
  - Age rating.
  - Review notes with a demo account that has credits.
- [ ] **Measure cost per credit** on real jobs before you publish prices (see `pricing.md`).

## Where unhappy users already are
- **App Store reviews:** the research found 154 one- and two-star Captions reviews and 126 for CapCut, mostly about paywalls, credits and cancelling. You can't message reviewers. Use their themes in your ad copy instead, paraphrased, never quoted.
- **Reddit:** **unverified.** Reddit was blocked from this session, so I couldn't confirm which threads exist. Likely places to check by hand: r/NewTubers, r/socialmedia, r/content_marketing, r/SmallYTChannel. Search "opus clip alternative", "captions app cancel" and "AI reels app worth it". Follow each sub's self-promotion rules. Answer questions; don't spam links.
- **Hacker News:** people there have built their own clip pipelines to avoid credit pricing. A Show HN post fits.

## Launch posts (lead with the fix, not the clone)
- **Show HN:** "Show HN: Reelplain – AI reels where every action shows its cost first." The first comment explains the refund-on-failure logic and how credits are metered. HN likes mechanics.
- **Product Hunt:** tagline "Clip, caption, know the cost". The first image is the button with the credit cost on it.
- **No competitor names in ads or store copy.** Comparison pages are a question for a lawyer.

## First 10 users, by hand
1. Pick 10 waitlist sign-ups who post at least weekly.
2. Do a 15-minute call or DM with each: what they use now, and the last time an app charged them for something they didn't expect.
3. Watch them make one reel (screen share). Note every moment they hesitate.
4. Fix the top 3 hesitations before opening the doors wider.

## Success metrics, first 30 days
| metric | target |
| --- | --- |
| signup → first export | > 40% |
| Try → paid | > 4% |
| render failure rate | < 2% (every failure refunded) |
| billing-related support tickets | ~0 |

The last metric is the brand promise. If it isn't near zero, the angle is a lie.
