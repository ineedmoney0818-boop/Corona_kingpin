import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";
export const metadata: Metadata = { title: "Make an account" };
export default function Page() { return <AuthForm mode="sign-up" />; }
