/** The price on the button (fix #1). Only ever rendered with a credits value that came from a quote.
 *  Sits on primary (accent) buttons: accent-hover background keeps on-accent text at 6.8:1. */
export function CostChip({ credits }: { credits: number }) {
  return (
    <span className="rounded-full bg-accent-hover px-2 py-0.5 text-xs font-semibold">
      {credits === 0 ? "free" : `${credits} credit${credits === 1 ? "" : "s"}`}
    </span>
  );
}
