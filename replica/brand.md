# Brand: Reelplain

Angle (from fixes.md): **"No surprise bill."** You see the price before you start, a failed render costs nothing, and you cancel in one tap. The AI makes the first cut and you control the rest.

## 1. Name

**Recommendation: Reelplain.** Read it as "reel plain" or "real plain": short-form video with plain pricing. It sounds and looks nothing like the original (Limesnap: citrus + snap) or the category leaders (CapCut, OpusClip, Captions, Edits, Vizard, Submagic, Klap, Predis).

### 20 candidates
| style | names |
| --- | --- |
| descriptive | Plainreel, Reelplain, Flatcut, Straightcut, Fairframe |
| compound | Cutfair, Takeplain, Tallyreel, Reelfair, Shapeshot |
| invented | Kivo, Remba, Fendo, Vesko, Taliq |
| metaphor | Receipt, Ledgerly, Glassbox, Lantern |
| verb | Trimly, Splice |

**Cut, and why:**
- **Every .com registered** (RDAP 200, checked 2026-11-20): Kivo, Remba, Fendo, Vesko, Taliq, Receipt, Ledgerly, Glassbox, Lantern, Trimly, Splice, Straightcut, Tallyreel, Reelfair, Fairframe, Shapeshot.
- **Existing App Store apps with the same name:** Kivo, Remba, Ledgerly, Lantern, Trimly, Splice (Splice is itself a video editor) and ShapeShot.
- **Hard to trademark:** Receipt and Lantern are plain dictionary words.

### The 5 finalists

Checks run 2026-11-20 from this session:
- **USPTO:** the tmsearch API, exact and two-word wordmark queries, all classes. The method was validated: it returns CAPCUT (4 marks) and OPUSCLIP (2).
- **Domains:** RDAP. Verisign for .com, rdap.org for .app/.co; 404 = not registered, validated with a nonsense name.
- **App Store:** iTunes Search API, US store.

| check | Reelplain | Takeplain | Cutfair | Plainreel | Flatcut |
| --- | --- | --- | --- | --- | --- |
| USPTO wordmark | 0 hits | 0 hits | 0 hits | 0 hits | 0 hits |
| EU (EUIPO/TMview) | to run | to run | to run | to run | to run |
| Canada (CIPO) | to run | to run | to run | to run | to run |
| WIPO Global Brand DB | to run | to run | to run | to run | to run |
| .com | **not registered** | **not registered** | **not registered** | registered | registered |
| .app | not registered | not registered | not registered | not registered | not registered |
| .co | not registered | not registered | not registered | not registered | not registered |
| App Store exact name | none found | none found | none found | none found | none found |
| Google Play | to run | to run | to run | to run | to run |
| X / Instagram / TikTok | to run | to run | to run | to run | to run |
| GitHub | to run (github.com returned 403 to this sandbox) | to run | to run | to run | to run |
| web "name + video" | to run | to run | to run | to run | to run |
| similarity risk | low | low, but "take plain" reads oddly | **medium: "-cut" echoes CapCut** | low | **medium: "-cut" echoes CapCut** |

"Not registered" means not registered on 2026-11-20. Domains get bought every day, so register the one you want now.

**Domains:** the original is limesnap.com. Grab reelplain.com, plus reelplain.app if you want the defensive copy.

These are screening checks, **not legal clearance.** Before you spend real money on the name, pay a trademark attorney for a clearance search in classes 9 (software) and 42 (SaaS).

FYI: "Limesnap" has **no US trademark registration** (USPTO, 0 hits, 2026-11-20). That doesn't make copying its name OK. We're not using it anyway.

## 2. Palette

The original is sage/lime green: `--brand: #85b586`, with gradients to `#9CAF88`, read from limesnap.com's CSS. Reelplain goes **warm ember**, a different colour family.

| role | value | note |
| --- | --- | --- |
| accent | `#c2410c` ember | primary buttons, links, brand |
| on-accent | `#ffffff` | 5.18:1 |
| bg | `#ffffff` | |
| surface | `#faf7f4` | warm off-white |
| border | `#e8e1db` | |
| border-input | `#857a72` | 4.18:1 UI |
| text | `#1c1714` | 17.77:1 |
| text-muted | `#655a52` | 6.69:1 |
| danger | `#b3123a` | crimson, kept clearly apart from the orange accent |
| success | `#16794a` | functional green only, never used as brand colour |

`python3 contrast.py replica/design/tokens.json` → **9 pairs, 0 failing AA.**

## 3. Logo brief

- **Idea:** a price tag that is also a play button. The tag's hole is the play triangle. It signals "video" and "you know what it costs" in one shape.
- **Mark type:** a symbol plus a wordmark. The symbol alone is the app icon. The wordmark is "reelplain" in lowercase, in a geometric sans at medium weight.
- **Colour:** the ember `#c2410c` symbol on white, or a white symbol on an ember tile for the app icon. No gradient, so it stays crisp at 16px.
- **Must work:** as a 16px favicon, where the tag silhouette must still read, and as a 1024px iOS app icon.
- **Deliverables:**
  - SVG master
  - 1024×1024 app icon, opaque, no transparency
  - favicon set: 16, 32, 180 apple-touch and 512
  - 1200×630 social image
- **Must not resemble the original:**
  - no lime or citrus shapes
  - no green
  - no camera-shutter or "snap" motif
  - no green-to-sage gradient
  - Put the draft next to Limesnap's mark and check.
- **Must not resemble the category either:** no CapCut-style angular "C" brackets and no OpusClip-style lettermark.

## 4. Voice

**Three words:**
- **Plain:** not dull. Short words and real numbers; the personality comes from honesty.
- **Upfront:** not pushy. Say the cost and the catch before the user does the work, and don't hard-sell.
- **Calm:** not cute. No hype or "magic ✨", and no panicking at errors.

| do | don't |
| --- | --- |
| "This clip costs 2 credits." | "Unlock premium magic!" |
| "That render failed. You weren't charged." | "Oops! Something went wrong 😅" |
| "Cancel anytime. You keep everything until [date]." | "We're sad to see you go…" plus three retention screens |
| Put the price on the button | Reveal the price after the user has done the work |
| "AI picked these 5 moments. Change anything." | "Our AI knows what goes viral." |

### The 10 most-seen strings

These are fresh copy. No app code exists yet, so these are the source strings for `/replica-build`.

| where | string |
| --- | --- |
| Sign up, headline | "Make reels. Know the price first." |
| Sign up, button | "Start free, no card" |
| Main action | "Make clips" |
| Before generating | "This will use 4 of your 40 credits. Go ahead?" |
| Empty state, projects | "Nothing here yet. Drop in a video or a few photos and we'll draft your first reel." |
| Render done | "Your 5 clips are ready. Edit any of them, or export as they are." |
| Render failed | "This one didn't render. Your credits are back. Try again?" |
| Export (free plan) | "Export free with a small watermark, or remove it for $X." |
| Cancel confirmation | "Cancelled. You keep your plan and credits until [date]. No more charges." |
| Generic error | "That didn't work on our side. Nothing was charged. Try again in a moment." |

## 5. Sweep

`brand.json` blocks the original's name, domain and colours. Result is below.

`python3 sweep.py . --config replica/brand.json` on 2026-11-20 printed "Clean" (exit 0). **That proves little yet:** there is no app code, only skills and planning files. Re-run the sweep after `/replica-build`, and check by eye the favicon, page titles, email templates, OG image and app icon.

Next: `/replica-launch`.
