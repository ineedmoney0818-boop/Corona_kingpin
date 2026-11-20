import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Per-request client acting as the signed-in user: every query runs under RLS.
export async function userClient() {
  await connection(); // per-user data: always request-time, never part of a prerender
  const jar = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    // The browser never reads the session (uploads use one-time signed tokens), so keep it out of JS reach.
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try { for (const { name, value, options } of list) jar.set(name, value, options); }
        catch { /* called from a Server Component: proxy.ts refreshes the session instead */ }
      },
    },
  });
}
