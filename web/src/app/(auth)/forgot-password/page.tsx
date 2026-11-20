import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { isSupabase } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Reset password" };
export default function Page() {
  return <AuthForm mode="forgot" google={isSupabase()} />;
}
