import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
export const metadata: Metadata = { title: "Sign in" };
export default function Page() { return <AuthForm mode="sign-in" />; }
