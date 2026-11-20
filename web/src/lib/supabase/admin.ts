import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Service-role client: bypasses RLS. Server and worker code only, never imported by client components.
// Used for credit functions, webhooks, the render worker and storage housekeeping.
let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return (admin ??= createClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
