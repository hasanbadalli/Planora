import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Log in", description: "Log in to your Planora account." };
export default function LoginPage() { return <AuthShell mode="login" />; }
