# Reelplain on Instagram

Goal: **paid sign-ups.** Path: Reel → comment PLAIN → DM the sign-up link → free account → upgrade.

## Account

- Separate **@reelplain** account. Not Outta The Madness: its audience is Louisville property owners, not people who make Reels.
- Outta The Madness can appear as a case study ("a contractor who makes their Reels with Reelplain") on the Reelplain account.

### Bio

Instagram fills these from separate fields. Only the **Bio** field counts toward the 150-character limit.

- **Name:** `Reelplain | AI Reels Editor` (the name field is searchable, so the keyword goes here)
- **Bio** (103 characters):
  ```
  AI reels with the price on the button 💸
  Failed renders are free. Cancel any time.
  Start free, no card 👇
  ```
- **Link** (Edit profile → Links): `coronakingpin-web.vercel.app/sign-up?utm_source=instagram`

Move to a real domain (reelplain.com was unregistered on 2026-11-20) when you can. A `vercel.app` link looks unfinished to strangers.

### DM reply to "PLAIN"

> Here you go: coronakingpin-web.vercel.app/sign-up?utm_source=instagram&utm_campaign=plain
> Free, no card. You get 10 credits a month (a new reel is 4). If a render fails you get the credits back. Any questions, ask me here.

## Rules

- **3 Reels a week**, plus a few Stories (polls, behind the scenes, replies to comments).
- **Trial Reels** for anything risky: they're shown to non-followers first and don't hurt the account if they flop.
- **Answer every PLAIN comment within the hour.**
- **Never name competitors** (CapCut, OpusClip, Captions…) in videos, captions or ads.
- **Every number must be true.** Real costs from `web/src/lib/pricing.ts`: new reel 4 credits, carousel 3, re-render 1, ideas 1, saving edits free. Plans: Try $0 / 10 credits, Creator $19 / 120, Studio $49 / 400. Paid credits roll over 1 month.
- **Label AI:** the batch 1 videos use an AI voice. Turn on Instagram's "AI info" label when posting.

## Measure every Sunday

| Metric | Where |
|---|---|
| Shares per Reel, saves, non-follower reach | Instagram Insights |
| Profile visits, bio link taps | Instagram Insights |
| PLAIN comments | Count by hand |
| Sign-ups with `utm_source=instagram` | Supabase |
| Upgrades | Stripe |

Follower count is not on this list on purpose.

---

## Batch 1: made, in `reels/`

AI voice (Kokoro, voice `af_heart`), word-by-word captions, motion graphics, and real screenshots of the live site. 1080×1920, 30 fps, 17–24 s each. The source to regenerate them is in `reels/src/` (see the end of this file).

| # | File | Hook | Job |
|---|---|---|---|
| 1 | `01-export-trap.mp4` | "3 hours editing. Then you tap export…" | Shares |
| 2 | `02-crash-credits.mp4` | "POV: the AI crashed and kept your credits" | Shares |
| 3 | `03-what-19-gets.mp4` | "What $19 actually gets you" | Saves |
| 4 | `04-built-in-louisville.mp4` | "Built by a small business in Louisville, KY" | Trust and follows |
| 5 | `05-cancel.mp4` | "How long does it take to cancel?" | Trust |
| 6 | `06-before-after.mp4` | "40 seconds of rambling → an 18-second reel" | Demo |

Notes:
- The paywall, crash and editor screens in 1, 2 and 6 are generic illustrations, not any real competitor's UI.
- Reel 5 shows the three real steps (Manage or cancel plan → Cancel plan → Confirm), not "one tap". See "Fix before posting" below.
- Reel 4 is better filmed by you on camera. Your talking heads were the only posts on your other account that broke 100 views.

### Captions to post with them

1. *Three hours of editing shouldn't end in a surprise bill. In Reelplain the cost is on the button before you tap, and export works on the free plan. Comment PLAIN for the link.*
2. *A failed render should cost you nothing. In Reelplain it doesn't: the credits come back on their own. Comment PLAIN for the link.*
3. *Save this before you pay for any editing app. $19 = 120 credits = 30 new reels a month, unused credits roll over a month. Comment PLAIN for the link.*
4. *Made in Louisville by a small business that got tired of being charged at the end. Comment PLAIN to try it free.*
5. *Cancelling shouldn't be a maze. Three taps, and you keep your plan and credits until the period ends. Comment PLAIN for the link.*
6. *40 seconds of raw footage → an 18-second reel with captions. 4 credits, shown before I tapped. Comment PLAIN to try it free.*

Hashtags (3–5, at the end): `#reelstips #contentcreator #videoediting #smallbusinessmarketing #reelplain`

---

## Batch 2: scripts

Same format: 15–30 s, vertical, captions burned in, ending with "Comment PLAIN and I'll DM you the link."

### 7. "The free plan isn't a trap"
- **Hook (on screen):** "What do you actually get for $0?"
- **Beats:** pricing page, Try card → "10 credits a month" → "a new reel is 4, so that's 2 reels, plus re-renders" → "Export works. Small watermark. No card."
- **Close:** "If it's not worth $19 to you, stay free. Seriously."
- **Job:** trust. Honesty about limits is the whole brand.

### 8. "3 questions before you pay for any AI editing app"
- **Hook:** "Ask these 3 questions before you pay for any AI editor"
- **Beats:**
  1. "Do I see the cost before it runs?"
  2. "What happens to my credits if it fails?"
  3. "Can I cancel without a maze, and do I keep what I paid for?"
- **Close:** "Reelplain's answers: yes, you get them back, and yes."
- **Job:** saves. Make it a carousel version too.

### 9. "Your footage stays yours"
- **Hook:** "Some AI editors replace your face, your voice, your B-roll"
- **Beats:** "Reelplain cuts what you shot. No AI-generated replacements unless you ask for them." Show raw clip → the same clip, trimmed and captioned.
- **Job:** a differentiator for creators who care about authenticity.

### 10. "The AI's draft is a starting point"
- **Hook:** "When the AI makes the wrong cut…"
- **Beats:** draft appears → "trim it" → "retype a caption" → "move it" → "re-render: 1 credit. Saving edits: free."
- **Job:** answers the "AI does what it wants" complaint (about 25 reviews in the research).

### 11. "What's a credit, actually?"
- **Hook:** "Every AI app has 'credits.' Here's what ours cost."
- **Beats:** a menu board: new reel 4 · carousel 3 · re-render 1 · ideas 1 · saving edits free. "Unused credits roll over a month on paid plans."
- **Close:** "Screenshot it. Compare it to whatever you use now."
- **Job:** saves, and objection handling before sign-up.

### 12. "Replying to: what's the catch?"
- **Format:** reply to a real comment once someone asks this. Use Instagram's comment-reply Reel so the question shows on screen.
- **Beats:** "The catch: the free plan has a watermark and 10 credits. Paid is $19. Credits roll over one month, not forever. That's it."
- **Job:** trust and conversion. Post it only when a real comment exists. Don't fake the comment.

---

## Fix before posting

- **"Cancel in one tap" isn't accurate.** It appears on the homepage, pricing page, settings screen, emails (`web/src/lib/email/send.ts`) and store listing (`listing.json`). The real flow is "Manage or cancel plan" → Stripe portal "Cancel plan" → confirm. Either change the copy to "cancel in seconds" / "cancel any time, no maze", or build a real in-app one-tap cancel. A no-surprises brand can't overstate this.
- **Sign up and export one reel yourself** with a fresh email before the first post. Check that the AI draft, export and refund-on-failure work in production.

---

## Regenerating the videos

`reels/src/` has the whole pipeline. Edit `reels.py` (scripts and scenes), then run:

```bash
pip install kokoro-onnx soundfile
# models (~350 MB, not committed):
#   github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/{kokoro-v1.0.onnx,voices-v1.0.bin} → voices/
node shots.js                 # screenshots of the live site → shots/
mkdir -p out && python3 build.py            # voice + timeline → out/*.wav, out/*.json
node render.js 01-export-trap # frames → out/01-export-trap.mp4 (needs ffmpeg + playwright)
```
