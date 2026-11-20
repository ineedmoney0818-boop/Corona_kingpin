"use client";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui/Notice";

/** Streams in separately so the form itself is never swapped out mid-submit. */
export function LinkErrorNotice() {
  const e = useSearchParams().get("error");
  if (e !== "link" && e !== "google") return null;
  return <Notice kind="danger" role="alert" className="mt-4">That link didn&apos;t work or has expired. Try again.</Notice>;
}
