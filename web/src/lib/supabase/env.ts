// Which backend is live. Supabase when its URL is configured; otherwise the local fake store.
export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const isSupabase = () => !!supabaseUrl();
export const MEDIA_BUCKET = "media";
