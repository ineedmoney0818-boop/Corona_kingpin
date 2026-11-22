"use client";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui/Notice";

/** Streams in separately so the form itself is never swapped out mid-submit. */
export function LinkErrorNotice() {
  const e = useSearchParams().get("error");
  // The default Supabase link confirms the email before it reaches us; only the auto sign-in failed.
  if (e === "confirmed") return <Notice kind="success" role="status" className="mt-4">Your email is confirmed. Sign in to continue.</Notice>;
  if (e !== "link" && e !== "google") return null;
  return <Notice kind="danger" role="alert" className="mt-4">That link didn&apos;t work or has expired. Try again.</Notice>;
}
