import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/PricingTable";
export const metadata: Metadata = { title: "Pricing" };
export default function Pricing() {
  return (
    <section className="py-12">
      <h1 className="font-display text-4xl font-extrabold">Plain prices</h1>
      <p className="mt-2 max-w-2xl text-text-muted">Start free with no card. Every action shows its cost before it runs, failed renders are refunded automatically, and you can cancel in one tap.</p>
      <div className="mt-8"><PricingTable /></div>
    </section>
  );
}
