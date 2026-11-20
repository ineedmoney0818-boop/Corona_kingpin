import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

const PLANS = [
  { id: "try", name: "Try", price: "$0", per: "", who: "See if it works for you.", items: ["10 credits a month", "Export with a small watermark", "No card needed"], cta: "Start free" },
  { id: "creator", name: "Creator", price: "$19", per: "/ month", who: "Posting a few times a week.", items: ["120 credits a month", "No watermark", "Unused credits roll over 1 month", "$190 a year (2 months free)"], cta: "Start free, upgrade later", rec: true },
  { id: "studio", name: "Studio", price: "$49", per: "/ month", who: "Posting daily, or for clients.", items: ["400 credits a month", "3 brands, bulk export", "Unused credits roll over 1 month", "$490 a year (2 months free)"], cta: "Start free, upgrade later" },
];
export function PricingTable() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {PLANS.map((p) => (
        <li key={p.id} className={cn("flex flex-col rounded-lg border bg-surface p-5", p.rec ? "border-2 border-accent" : "border-border")}>
          <h3 className="text-lg font-bold">{p.name}</h3>
          <p className="mt-1 font-display text-4xl font-extrabold">{p.price}<span className="text-base font-normal text-text-muted"> {p.per}</span></p>
          <p className="mt-1 text-sm text-text-muted">{p.who}</p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm">{p.items.map((i) => <li key={i}>· {i}</li>)}</ul>
          <ButtonLink href="/sign-up" variant={p.rec ? "primary" : "secondary"} className="mt-5">{p.cta}</ButtonLink>
        </li>
      ))}
    </ul>
  );
}
