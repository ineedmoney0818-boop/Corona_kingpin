import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";

// OAuth (Google) returns here with a code; exchange it for a session cookie.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/app";
  if (code) {
    const db = await userClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
