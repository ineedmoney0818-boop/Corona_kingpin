import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { isSupabase } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "New password" };
export default function Page() {
  return <AuthForm mode="reset" google={isSupabase()} />;
}
