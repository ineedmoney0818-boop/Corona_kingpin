import type { ReactNode } from "react";

/** Shared layout for /terms and /privacy: readable measure, clear headings, the date it took effect. */
export function LegalPage({ title, effective, intro, children }: { title: string; effective: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl py-12 text-[15px] leading-7 [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <p className="!mt-2 text-sm text-text-muted">Effective {effective}</p>
      <div className="mt-6 text-text-muted">{intro}</div>
      {children}
    </article>
  );
}

export const CONTACT_EMAIL = "hello@outtathemadness.com";
