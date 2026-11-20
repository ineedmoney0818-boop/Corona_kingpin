import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
import { isSupabase } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };
export default function Page() {
  return <AuthForm mode="sign-in" google={isSupabase()} />;
}
