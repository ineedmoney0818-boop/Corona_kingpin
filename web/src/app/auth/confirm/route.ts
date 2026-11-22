import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { userClient } from "@/lib/supabase/server";

// Email links (confirm sign-up, reset password) land here.
// - Our templates (supabase/templates) send ?token_hash=&type=: works on any device.
// - Supabase's default templates go through its /verify endpoint first, which confirms the email and then
//   sends ?code= here (PKCE). That code only works in the browser that started sign-up.
// If neither works, the email may still be confirmed, so say so instead of "expired".
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/app";
  const db = await userClient();
  if (token_hash && type) {
    const { error } = await db.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    return NextResponse.redirect(new URL("/sign-in?error=confirmed", url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
