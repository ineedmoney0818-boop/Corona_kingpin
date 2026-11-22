import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Supabase mode: refresh the session once per navigation (so pages see a valid token) and send
// signed-out visitors on /app to sign in. Fake mode: optimistic cookie check only.
// Real authorisation happens in every page, route and RLS policy, not here.
// First-touch attribution: remember ?utm_source=&utm_campaign= for 30 days so sign-up can record it.
const TAG = /^[a-z0-9_.-]{1,40}$/;
function withSource(req: NextRequest, res: NextResponse): NextResponse {
  if (req.cookies.get("rp_src")) return res;
  const source = req.nextUrl.searchParams.get("utm_source")?.trim().toLowerCase();
  if (!source || !TAG.test(source)) return res;
  const campaign = req.nextUrl.searchParams.get("utm_campaign")?.trim().toLowerCase();
  const value = campaign && TAG.test(campaign) ? `${source}|${campaign}` : source;
  res.cookies.set("rp_src", value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function proxy(req: NextRequest) {
  return withSource(req, await session(req));
}

async function session(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  if (path === "/" || path === "/pricing") return NextResponse.next();
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
export const config = { matcher: ["/", "/pricing", "/app/:path*", "/sign-in", "/sign-up", "/reset-password"] };
