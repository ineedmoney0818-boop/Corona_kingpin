"use client";
import { useSyncExternalStore } from "react";

type Style = "day" | "datetime";
const OPTS: Record<Style, Intl.DateTimeFormatOptions> = {
  day: { month: "short", day: "numeric" },
  datetime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
};
const noop = () => () => {};

/**
 * A date in the viewer's own time zone. The server can't know it, so the server render shows UTC
 * (marked as such for screen readers via the datetime attribute) and the browser swaps in local time
 * right after hydration, without a hydration error.
 */
export function LocalDate({ iso, style = "day" }: { iso: string; style?: Style }) {
  const text = useSyncExternalStore(
    noop,
    () => new Date(iso).toLocaleString("en-US", OPTS[style]),
    () => new Date(iso).toLocaleString("en-US", { ...OPTS[style], timeZone: "UTC" }),
  );
  return <time dateTime={iso}>{text}</time>;
}
