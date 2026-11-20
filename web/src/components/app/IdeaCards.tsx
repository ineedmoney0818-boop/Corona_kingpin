"use client";
import { USE_IDEA_EVENT, type UseIdeaDetail } from "./Composer";
import { buttonClass } from "@/components/ui/Button";
import type { Idea } from "@/lib/data/types";

/** An ideas reply. "Use this idea" fills the composer below; making it is a separate, priced step. */
export function IdeaCards({ ideas }: { ideas: Idea[] }) {
  if (!ideas.length) return null;
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="Ideas">
      {ideas.map((i, n) => (
        <li key={n} className="flex flex-col rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium text-text-muted">{i.format === "reel" ? "Reel" : "Carousel"}</p>
          <h3 className="mt-1 font-bold">{i.title}</h3>
          <p className="mt-2 text-sm">“{i.hook}”</p>
          <p className="mt-1 flex-1 text-sm text-text-muted">{i.angle}</p>
          <button type="button" className={buttonClass("secondary", "sm", "mt-3 self-start")}
            onClick={() => window.dispatchEvent(new CustomEvent<UseIdeaDetail>(USE_IDEA_EVENT, { detail: { text: `${i.hook}\n${i.angle}`, format: i.format } }))}>
            Use this idea<span className="sr-only">: {i.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
