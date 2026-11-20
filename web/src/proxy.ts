import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Supabase mode: refresh the session once per navigation (so pages see a valid token) and send
// signed-out visitors on /app to sign in. Fake mode: optimistic cookie check only.
// Real authorisation happens in every page, route and RLS policy, not here.
export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isApp = req.nextUrl.pathname.startsWith("/app");
  if (!url) {
    if (isApp && !req.cookies.get("rp_session")) return NextResponse.redirect(new URL("/sign-in", req.url));
    return NextResponse.next();
  }
  let res = NextResponse.next({ request: req });
  const db = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    // The browser never reads the session (uploads use one-time signed tokens), so keep it out of JS reach.
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await db.auth.getClaims();
  if (isApp && !data?.claims) return NextResponse.redirect(new URL("/sign-in", req.url));
  return res;
}
export const config = { matcher: ["/app/:path*", "/sign-in", "/sign-up", "/reset-password"] };
