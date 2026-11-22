# Batch 1 reels. vo = what the AI voice says; captions are built from vo.
CTA = {"type": "cta", "nocap": True, "vo": "Comment plain, and I'll D M you the link. Start free, no card."}

REELS = {
 "01-export-trap": {"hook": "3 hours editing.|Then you tap export…", "hookDur": 3.2, "scenes": [
   {"type": "editor", "vo": "Three hours editing. Cuts, captions, the whole thing. Then you tap export.", "min": 4.5},
   {"type": "paywall", "vo": "And the export button turns into a paywall.", "min": 3.2},
   {"type": "shot", "p": {"src": "pricing", "y0": 700, "y1": 744, "h": 820, "top": 380, "hl": [80, 1170, 920, 80], "hlt": 1.4},
    "vo": "In Reelplain, the price is on the button before you start. And export works on the free plan."},
   CTA]},
 "02-crash-credits": {"hook": "POV: the AI crashed|and kept your credits", "hookDur": 3.4, "scenes": [
   {"type": "crash", "vo": "The render crashes at eighty seven percent. And your credits? Gone.", "min": 4.2},
   {"type": "refund", "vo": "In Reelplain, a failed render gives your credits back. Automatically. Every time.", "min": 4},
   {"type": "shot", "p": {"src": "home", "y0": 4120, "y1": 4160, "h": 600, "top": 380, "hl": [44, 4220, 991, 327], "hlt": .3},
    "vo": "No support ticket. No arguing with a chatbot."},
   CTA]},
 "03-what-19-gets": {"hook": "What $19 actually|gets you", "hookDur": 3.0, "scenes": [
   {"type": "title", "p": {"top": 640, "lines": [{"t": "$19", "acc": True, "size": 260}, {"t": "a month", "size": 90}]},
    "vo": "Here's what nineteen dollars a month actually gets you."},
   {"type": "shot", "p": {"src": "pricing", "y0": 1300, "y1": 1540, "h": 820, "top": 380, "hl": [48, 1580, 984, 860], "hlt": 1.2},
    "vo": "A hundred and twenty credits a month. No watermark. And unused credits roll over a month."},
   {"type": "math", "p": {"top": 420, "rows": [["New reel", "4 credits"], ["120 ÷ 4", "30 reels"], ["Re-render after edits", "1 credit"], ["Saving edits", "free", True]], "at": [.2, 1.6, 3.0, 4.3]},
    "vo": "A new reel is four credits. That's thirty reels a month. Re-rendering after an edit is one credit. Saving your edits is free."},
   {"type": "title", "p": {"top": 560, "gap": .6, "lines": [{"t": "Screenshot this", "size": 100}, {"t": "before you pay for", "size": 80}, {"t": "any editing app.", "acc": True, "size": 80}]},
    "vo": "Screenshot this before you pay for any editing app.", "nocap": True},
   CTA]},
 "04-built-in-louisville": {"hook": "Built by a small business|in Louisville, KY", "hookDur": 3.4, "scenes": [
   {"type": "title", "p": {"top": 640, "lines": [{"t": "Not a big studio.", "size": 100}, {"t": "A small business.", "acc": True, "size": 100}]},
    "vo": "Reelplain is built by a small business in Louisville, Kentucky. Not a big studio.", "min": 4},
   {"type": "title", "p": {"top": 600, "lines": [{"t": "Tired of apps that", "size": 90}, {"t": "charge you", "size": 90}, {"t": "at the end.", "acc": True, "size": 110}]},
    "vo": "We got tired of editing apps that charge you at the end."},
   {"type": "list", "p": {"title": "So we built one where:", "gap": .9, "items": ["The price is on the button", "Failed renders are free", "Export works on the free plan", "You can cancel any time"]},
    "vo": "So we built one where the price is on the button. Failed renders are free. Export works on the free plan. And you can cancel any time."},
   {"type": "shot", "p": {"src": "home", "y0": 0, "y1": 120, "h": 820, "top": 380}, "vo": "It's called Reelplain.", "min": 2.6},
   CTA]},
 "05-cancel": {"hook": "How long does it take|to cancel?", "hookDur": 3.0, "scenes": [
   {"type": "title", "p": {"top": 640, "lines": [{"t": "Most apps:", "size": 90}, {"t": "a maze.", "acc": True, "size": 150}]},
    "vo": "Most apps make cancelling a maze. Here's ours."},
   {"type": "cancel", "vo": "Manage plan. Cancel. Confirm. Done.", "min": 5.6},
   {"type": "title", "p": {"top": 600, "lines": [{"t": "You keep your plan", "size": 86}, {"t": "and your credits", "size": 86}, {"t": "until the period ends.", "acc": True, "size": 80}]},
    "vo": "And you keep your plan and your credits until the period ends.", "nocap": True},
   CTA]},
 "06-before-after": {"hook": "40 seconds of rambling|→ an 18-second reel", "hookDur": 3.4, "scenes": [
   {"type": "beforeafter", "p": {"tap": 3.0},
    "vo": "Forty seconds of me rambling. Tap make reel. It says four credits before I tap. Here's what came back. Eighteen seconds, captions on.", "min": 8.5},
   {"type": "title", "p": {"top": 600, "lines": [{"t": "Don't like it?", "size": 100}, {"t": "Trim. Retype.", "size": 100}, {"t": "Move captions.", "acc": True, "size": 100}]},
    "vo": "Don't like the cut? Trim it, retype it, move the captions. On your phone."},
   CTA]},
}
