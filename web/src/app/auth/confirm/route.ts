import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { userClient } from "@/lib/supabase/server";

// Email links (confirm sign-up, reset password) land here with a token hash.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/app";
  if (token_hash && type) {
    const db = await userClient();
    const { error } = await db.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
