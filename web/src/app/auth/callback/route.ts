import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";
import { attributeNewProfile } from "@/lib/signup-source";

// OAuth (Google) returns here with a code; exchange it for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/app";
  if (code) {
    const db = await userClient();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (!error && data.user) await attributeNewProfile(data.user.id).catch(() => {});
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
