# Reelplain components

## Basics

- **Base library:** **shadcn/ui** on **Radix** primitives. These are accessible behaviours (focus traps, keyboard handling, ARIA) we don't hand-roll. They're restyled to Reelplain tokens, so nothing uses shadcn's default neutral look.
- **Icons:** **Lucide** (ISC license).
- **Fonts:** Inter (UI) and Manrope (display), both SIL OFL and self-hosted.
- **Tokens:** every colour comes from a token, e.g. `bg-surface text-muted border-border`. A raw hex value in a component is a bug.
- **Theme:** light by default; dark via `prefers-color-scheme`, or `data-theme` on `<html>`.

**Shared rules for every interactive component:**
- **Focus:** `focus-visible` shows a 2px `focus` ring with a 2px offset. Mouse clicks show no ring.
- **Tap targets:** minimum 40px (`control-md`), and 48px (`control-lg`) for the main action on mobile.
- **Motion:** `motion-base` with `ease`. Under `prefers-reduced-motion`, durations are 0 and only opacity changes.
- **Disabled:** 50% opacity, the `not-allowed` cursor, and real `disabled` / `aria-disabled` attributes. The reason it's disabled is shown as text near the control, never just a greyed-out button.
- **Copy:** in the voice from `brand.md` (plain, upfront, calm). Nothing is copied from the original.

---

```
Button
  variants  primary (accent), secondary (surface + border), ghost, danger
  sizes     sm 32px, md 40px, lg 48px (mobile main action)
  states    default, hover (accent-hover / surface-2), active, focus-visible, disabled, loading
  tokens    radius md, font sm/600 (lg: base/600), px 16 (sm 12, lg 20)
  a11y      real <button>; loading keeps the label (aria-busy="true", spinner aria-hidden);
            icon-only buttons need aria-label
  used on   all

CostButton  (Reelplain - fix #1: the price is on the button)
  what      Button primary + a cost chip: "Make clips · 4 credits"
  variants  affordable, short (not enough credits), free (0 credits, e.g. save/edit)
  states    default, loading ("Starting…", keeps the cost), short -> becomes "Get credits"
            secondary button + text "You have 2, this needs 4."
  tokens    chip: bg on-accent at 20% opacity over accent, font xs/600, radius pill
  a11y      accessible name includes the cost: "Make clips, uses 4 credits"
  rule      never shows a cost it didn't get from POST /api/quotes; quote older than 5 min -> re-quote
  used on   S06 composer, S08 re-render, S10 editor

Input / Textarea
  sizes     md 40px (input); textarea auto-grows 1 to 8 lines
  states    default, hover, focus-visible, invalid (danger border + message), disabled, read-only
  tokens    bg bg, border border-input, radius md, text base (16px, which prevents iOS zoom), placeholder text-muted
  a11y      always a <label> (visible, or sr-only in the composer); error linked by aria-describedby;
            invalid sets aria-invalid
  used on   S02, S03, S06, S10, S14

Password field
  extends   Input + show/hide toggle button (aria-pressed, label "Show password")
  rule      min 8 chars shown as help text before typing, not only as an error after
  used on   S02, S03

Composer (chat input)
  parts     auto-grow textarea, attach button (paperclip), project picker, attachment chips, CostButton or Send
  states    empty (send disabled), typing, uploading (chip progress), quote-ready (CostButton appears),
            no-credits, offline
  keyboard  Enter sends; Shift+Enter new line; Esc clears pending attachments (with undo toast)
  a11y      role=form with label "Message Reelplain"; upload progress announced politely (aria-live)
  used on   S06

Chat message
  variants  user (surface-2, right-aligned), assistant (no bubble, full width), assistant + media card, system notice
  states    streaming (cursor; aria-live polite, announced when done), done, error (inline retry)
  actions   copy, thumbs up, thumbs down (toggle, aria-pressed); shown on hover/focus on desktop,
            always visible on touch
  used on   S06, S09

Sidebar
  width     264px desktop; a drawer under lg (Radix Dialog, focus-trapped, Esc closes)
  parts     New chat (primary), nav (Projects, Library, Settings), "Chats" label, chat history list,
            credit balance, user menu
  states    item default / hover / active (accent-subtle bg + accent text, aria-current="page"),
            long titles truncate with a tooltip
  empty     history: "Your chats show up here."
  used on   S06-S14

CreditBalance  (Reelplain)
  shows     "38 credits" + "renews Dec 3" (plan) or "10 free credits a month" (Try)
  states    normal, low (< 5, warning text), empty (0: "Get credits" link)
  click     opens the credit history: every spend and refund, with the render it belongs to
  used on   sidebar, S14

RenderStatus  (Reelplain)
  states    queued ("In line…"), rendering (progress bar + "Rendering scene 3 of 6"),
            succeeded (preview), failed (see RefundNotice)
  a11y      role=status, aria-live polite; progressbar with aria-valuenow
  used on   S07, S08

RefundNotice  (Reelplain - fix #2: failed renders are free)
  copy      "This one didn't render. Your 4 credits are back." + [Try again] + [Details]
  tokens    bg success-subtle, text text, icon success (the refund is good news; the failure is not hidden)
  rule      only shown after the refund row exists, never optimistically
  used on   S08, toast, email

Carousel post card
  parts     header (avatar + name), slide viewport (4:5 or 1:1), prev/next, dots, caption with "Show more", actions (edit, download)
  keyboard  left/right arrows when focused; swipe on touch
  a11y      role=region aria-roledescription="carousel"; each slide "Slide 2 of 6"; dots are buttons
  used on   S07, S13

Video preview
  base      @remotion/player for drafts (it matches the render), <video> for finished mp4s
  states    loading (poster + spinner), playing, paused, error ("Can't play this. Download it instead.")
  a11y      native controls or custom controls with labels; no autoplay with sound
  used on   S08, S10, S13

Scene list (editor)
  item      thumbnail, "Scene 3", layer count, duration "3.0s"
  states    default, selected (accent border), dragging (shadow pop), drop target
  keyboard  arrow keys move the selection; Alt+Up/Down reorders (announced)
  actions   add scene, add text, add image, duplicate, delete (with undo toast)
  mobile    becomes a horizontal strip under the canvas
  used on   S10

Canvas (editor)
  parts     9:16 / 1:1 / 4:5 frame, zoom (- 100% +), selected-layer handles
  a11y      every layer is also editable in the Layers panel (the canvas is not the only way to edit)
  used on   S10

Properties panel (editor)
  parts     tabs (Properties / Layers), toggle ("Use for all scenes"), number input with unit (ms, shown as seconds),
            segmented control (Image | Video), source picker (Upload / Projects / Stock / URL)
  states    valid, invalid ("That link isn't an image we can use."), saving, saved
  mobile    bottom sheet (Radix Dialog, drag handle, 3 snap points)
  used on   S10

Tabs, Toggle, Segmented control
  base      Radix Tabs / Switch / ToggleGroup
  tokens    selected: bg surface + text text + shadow card; unselected: text-muted
  a11y      Radix keyboard handling (arrows, Home/End)

Upload / asset picker
  parts     drop zone, file button, URL import, stock search, grid of assets with type + duration badges
  states    empty, dragging-over, uploading (per-file progress), processing ("Checking your video…"), ready,
            failed with reason ("That's over 500 MB."), unsupported type
  rule      size and type rejected before upload, and always before any charge
  used on   S06, S10, S12, S15

Dialog / Sheet
  base      Radix Dialog; overlay color overlay; radius lg; shadow pop
  a11y      focus trapped, returns focus on close, Esc closes, a title is required
  used on   confirm delete, cancel plan, mobile panels

Toast
  variants  neutral, success, danger
  rule      never the only place an error lives; anything actionable also appears inline
  a11y      Radix Toast (aria-live); stays 5 s, paused on hover/focus
  used on   app-wide

Pricing card
  parts     plan name, "for" line, price, interval toggle, credits, list, CTA
  states    current plan ("Your plan", disabled CTA), recommended (2px accent border, no fake badge text)
  used on   S01, S05, S14

Cancel flow  (Reelplain - fix #3)
  shape     one confirm dialog: "Cancel Creator? You keep it, and your 38 credits, until Dec 3. No more charges."
            [Cancel plan] (danger) [Keep plan] (secondary). No survey wall, no discount maze.
  used on   S14

Empty states  (fresh copy)
  chats     "Drop in a video or a few photos and say what you want. I'll draft it and show the cost first."
  library   "Nothing made yet. Your reels and carousels land here."
  projects  "Projects keep your clips together. Make one, or just start a chat."
  search    "No stock results for "{q}". Try a simpler word."

Skeleton
  use       chat history, library grid, asset grid; never for a render (that's RenderStatus with real progress)
  motion    a pulse, which becomes static under reduced motion
```

## Not taken from the original

- **Fonts:** Playfair Display italic headlines (the original's display look) are replaced by Manrope 800.
- **Colours:** the neutral-black app shell is replaced by warm light, with a warm charcoal dark mode. The sage-green accent is replaced by ember.
- **Assets:** the logo, icons, sample videos and illustrations are not used. Lucide icons and our own art replace them.
- **Copy:** every string above is new.
