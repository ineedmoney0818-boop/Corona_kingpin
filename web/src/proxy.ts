import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: no session cookie -> sign in. Real checks happen in every page and API route.
export function proxy(req: NextRequest) {
  if (!req.cookies.get("rp_session")) {
    const url = new URL("/sign-in", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/app/:path*"] };
