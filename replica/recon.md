# Recon map: Limesnap (web app)

- **Scope:** the core loop. Chat with an AI → it generates a reel (a scene-based short video) or a carousel → tweak it in the scene editor → download.
- **For:** Reelplain, the user's own product, built on the "No surprise bill" angle (see `fixes.md`, `brand.md`).
- **Date:** 2026-11-20

## Method and limits — read first

- **Public sources only.** Limesnap's Terms of Service §7 (Prohibited Activities) says: *"Use the Services as part of any effort to compete with us."* So **no Limesnap account was used**, and none should be. If you have one, don't use it for this project.
- Nothing past the login was viewed directly. The in-app screens below come from **product imagery on the public marketing page** (the hero video still and section images, saved in `screens/`) plus the privacy policy and terms.
- **Not done:** no JS bundles read, no network calls logged, no APIs probed.
- **Confidence:** screens seen in that imagery are marked **seen-in-marketing**. Anything else is **inferred** or a **guess**.
- **Not reviewed:** the YouTube channel (@limesnap_official). Watching walkthrough videos by hand would confirm most of the inferred screens. That's the best next recon step and it's a human task.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://www.limesnap.com/ | pitch, 3-step "how it works", pricing, product imagery of the app |
| 2 | pricing (on the home page) | https://www.limesnap.com/ | /pricing returns 404. Starter $47 (30 gen + 300 chat credits), Pro $67 (90/900), Creator Lab $197 (300/unlimited) |
| 3 | sign-in page | https://www.limesnap.com/sign-in | Google OAuth, or email + password (min 8 chars), link to sign up |
| 4 | terms of service | https://www.limesnap.com/terms-of-service | product definition, anti-compete clause, users keep ownership of uploads |
| 5 | privacy policy | https://www.limesnap.com/privacy-policy | Instagram-handle onboarding, data fields collected, LLM vendors (Anthropic, Google, OpenAI, Meta) |
| 6 | refund policy | https://www.limesnap.com/refund-policy | 7-day refund on the first purchase only; cancel by emailing support "or" in account settings |
| 7 | Instagram / YouTube | https://www.instagram.com/limesnap/ , https://www.youtube.com/@limesnap_official | not reviewed (needs a human) |
| 8 | help center / docs / changelog / public API | — | **none found.** No links to any from the site |
| 9 | app store listing | — | none; it's web only |

## Core loop

You chat with a marketing-tuned AI that turns your uploaded clips and images, plus a prompt, into a ready-to-post Instagram reel or carousel with hook text overlays and a caption.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen | confidence |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Landing | `/` | sell, pricing, sign-up | promo bar, nav, hero, feature sections, 3-step how-it-works, vs-ChatGPT table, pricing (monthly/yearly toggle), email-capture discount, samples, footer | filled, mobile | seen |
| S02 | Sign in | `/sign-in` | auth | Google button, email, password with show/hide, sign-up link | default | seen |
| S03 | Sign up | link from S02 | create account | assumed same as S02 | — | inferred |
| S04 | Onboarding: Instagram handle | after sign-up | personalise voice and style from the public IG profile | handle input, skip(?) | — | inferred (privacy policy §6A) |
| S05 | Paywall / checkout | "Get Started" on a plan | subscribe; there's no free plan | plan cards, external checkout (processor unnamed) | — | guess |
| S06 | App shell + chat | after login | the core loop: chat to generate | sidebar (New Chat, Projects, Generated Posts, Settings, chat history list, user menu with avatar/name/email); chat thread; composer "What do you want to generate…" with project/folder button, attach (paperclip) and send | filled | seen-in-marketing |
| S07 | Chat result: carousel | inline in S06 | preview the generated carousel | IG-style post card (avatar, edit, download, more), slide arrows + dots, caption with "show more", Instagram description text | filled | seen-in-marketing |
| S08 | Chat result: reel | inline in S06 | preview the generated video | video player (0:00 / 0:19), caption, edit / download | filled | seen-in-marketing |
| S09 | Chat result: ideas | inline in S06 | numbered idea lists (hooks, angles) | rich-text message; copy / 👍 / 👎 actions | filled | seen-in-marketing |
| S10 | Edit Short Video (scene editor) | edit icon on S08 | adjust a generated reel | header (back, Download, Save Changes); left Scenes list (add, Add Text, Add Image, scene rows with layer count + duration); center canvas with zoom; right panel tabs Properties / Layers; Global Background Video toggle ("Use for all scenes"); Scene Settings: duration (ms), background Image/Video, Import URL / from Projects, Image URL + Apply | filled | seen-in-marketing |
| S11 | Carousel editor | edit icon on S07 | adjust slides | probably parallels S10 (slides instead of scenes) | — | guess |
| S12 | Projects | sidebar | group uploads and assets ("unlimited projects") | project list, asset grid, upload | — | inferred (sidebar + pricing) |
| S13 | Generated Posts | sidebar | library of everything generated | grid of reels/carousels, download | — | inferred (sidebar label) |
| S14 | Settings | sidebar | account, IG handle (edit/remove), subscription | profile, IG handle, plan + cancel, credit balances | — | inferred (privacy + refund policy) |
| S15 | Public asset library | from the composer or the S10 "Projects" source | stock images/videos ("access to public assets") | search grid | — | guess |

**States to design for, though none were seen:**
- empty chat (new user)
- generating / loading (a render takes seconds to minutes)
- out of credits
- render failed
- upload too large or wrong type
- IG handle not found or private

## Flows

```
F01 New user gets started
    S01 -> S02/S03 (Google) -> S05 pay (no free plan) -> S04 IG handle -> S06
    happy path clicks: ~6 + checkout
    edge: no IG account; private IG; card declined; leaves at the paywall

F02 Make a reel from my clips
    S06 attach clips/images -> prompt -> (gen credit) -> S08 preview -> download
    happy path clicks: ~4
    edge: upload fails; render fails (credit lost? unknown); out of credits; clip has no usable footage

F03 Make a carousel from images
    S06 attach images -> prompt -> S07 preview -> swipe -> download
    happy path clicks: ~4
    edge: as F02; text too long for a slide

F04 Brainstorm ideas
    S06 prompt "10 short video ideas" -> S09 -> follow-up -> "make #3 a reel" -> F02
    uses chat credits, not generation credits

F05 Tweak a generated reel
    S08 edit -> S10 select scene -> change text/bg/duration -> Save Changes -> Download
    happy path clicks: ~5

F06 Cancel
    S14 subscription -> cancel (or email support) -> access until period end
```

**Number to beat:** F02 in about 4 clicks, with no editing needed. Reelplain should match it and add the cost-on-button step without adding a click.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary (brand), secondary, ghost, icon | default, hover, focus, disabled, loading | all |
| Sidebar nav | item, active item, section label, chat history row | default, active, hover, truncated title | S06–S14 |
| Chat message | user, assistant (rich text), assistant + media card | streaming, done, error | S06 |
| Message actions | copy, thumbs up, thumbs down | default, done | S06 |
| Composer | text, attach, project picker, send | empty, typing, uploading, disabled (no credits) | S06 |
| Carousel post card | IG-style frame | slide n of m, caption collapsed/expanded | S07, S13 |
| Video player | inline | loading, playing, error | S08, S10, S13 |
| Scene list item | scene row (layers, duration) | default, selected, dragging(?) | S10 |
| Canvas | 9:16 preview + zoom | — | S10 |
| Properties panel | tabs, toggle, number input, segmented control, URL input + Apply | valid, invalid ("Enter a valid image URL") | S10 |
| Upload / asset picker | file drop, URL import, from projects | uploading, failed | S06, S10, S12 |
| Pricing card | monthly / yearly | — | S01, S05 |
| Toast / banner | promo, cookie consent, error | — | S01, app |
| User menu | avatar, name, email, chevron | open, closed | S06 |

## Inferred data model

```
User           id, email, name, avatar_url, auth_provider (google|password), created_at
               evidence: S02, S06 user menu        confidence: high

Subscription   user_id, plan (starter|pro|creator_lab), interval (month|year),
               status, current_period_end, processor_customer_id
               evidence: pricing, refund policy     confidence: high (processor unknown)

CreditBalance  user_id, generation_credits, chat_credits, resets_at
               evidence: pricing ("30 generation / 300 chat credits per month")   confidence: high
               (Reelplain replaces this with a CreditLedger: every debit/refund is a row)

InstagramProfile user_id, handle, username, bio, links, follower_count, following_count,
               posts[] (url, id, caption, views, likes, comments, shares, saves), fetched_at
               evidence: privacy policy §6A lists these exact fields   confidence: high

Project        id, user_id, name, created_at
               evidence: sidebar "Projects", pricing "Unlimited project creations"   confidence: medium

Asset          id, project_id?, user_id, kind (image|video), source (upload|url|public_library),
               url, duration_ms?, width, height
               evidence: composer attach, S10 Import URL / Projects, pricing "public assets"   confidence: medium

Chat           id, user_id, title (auto-named, e.g. "Carousel Post from Media Assets"), created_at
               evidence: sidebar chat list   confidence: high

Message        id, chat_id, role (user|assistant), content (rich text), attachments[asset_id],
               feedback (up|down|null), credits_used
               evidence: S06, S09 actions   confidence: high (credits_used is a guess)

Generation     id, message_id, kind (reel|carousel), status (queued|rendering|done|failed),
               caption, render_url (mp4 on a CDN under /renders/<uuid>.mp4), created_at
               evidence: S07, S08, sample videos served from a /renders/ path   confidence: high

Scene          id, generation_id, order, duration_ms (default 3000), background_kind (image|video),
               background_asset_id | background_url, layers[]
               evidence: S10   confidence: high

Layer          id, scene_id, kind (text|image), content, position, style
               evidence: S10 "Add Text" / "Add Image", "Layers" tab   confidence: medium

Slide          id, generation_id, order, image, text_overlays[]
               evidence: S07   confidence: medium (may just be Scenes rendered as stills)
```

**Relationships:**
- User has one Subscription, one CreditBalance and one InstagramProfile.
- User has many Projects; a Project has many Assets.
- User has many Chats; a Chat has many Messages; a Message has 0–1 Generation.
- A Generation has many Scenes (reel) or Slides (carousel); a Scene has many Layers.

## Feature matrix

See `features.csv`: 33 rows. Must 14, should 10, could 6, skip 3. Eight of the must/should rows are Reelplain fixes (`original=no`).

## Out of scope / cannot clone

- **Limesnap's "marketing-trained AI".** These are their prompts or fine-tunes, which they own. Write your own prompts, built from your own research.
- **Their public stock asset library.** It's licensed content. Use Pexels/Pixabay through their official APIs, under their terms.
- **Scraping Instagram profiles by handle**, including *other people's* handles, which Limesnap allows. Meta's terms prohibit unauthorised scraping, and it carries legal risk. Reelplain alternative: the official **Instagram API with Instagram Login** (the user connects their own professional account via OAuth), or the user pastes example captions. Marked `skip` as specified; replaced with a safer feature.
- **Their users, brand, copy, sample videos, fonts and imagery.**

## Size

- **Counts:** screens 15 (6 seen, 9 inferred or guessed), flows 6, entities 12.
- **Hard parts:**
  1. **A server-side video render pipeline:** scenes + text layers + backgrounds → mp4, on a queue, with retries. Remotion or FFmpeg; this is the bulk of the engineering.
  2. **The AI planner:** prompt + assets → scene plan JSON (hook text, ordering, durations, caption) → render. It needs guardrails so the output is reliable.
  3. **Credit metering with refunds on failure, plus Stripe** subscriptions, top-ups and one-tap cancel. This is Reelplain's whole angle, so it must be bulletproof.
  4. A browser scene editor (S10) with live preview that matches the final render.
- **Size: L** (about a quarter) for parity plus the fixes.
- **A vertical-slice MVP is M** (a few weeks): upload → chat prompt → reel render → download, with cost-on-button and refund-on-fail. It needs no editor, no carousel and no IG.
