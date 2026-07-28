"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, loginUser, registerUser } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const username = String(formData.get("username") ?? "");
    if (!isLogin && !/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      setError("Username must be 3–32 characters and use only letters, numbers, or underscores.");
      setIsSubmitting(false);
      return;
    }
    if (!isLogin && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
      setError("Password must contain at least 8 characters, one letter, and one number.");
      setIsSubmitting(false);
      return;
    }
    try {
      if (isLogin) {
        await loginUser({ identifier: String(formData.get("identifier") ?? ""), password });
      } else {
        await registerUser({
          username,
          email: String(formData.get("email") ?? ""),
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        });
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? friendlyError(caughtError) : "Something unexpected happened. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isLogin ? (
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" placeholder="e.g. alex_dev" minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]+" required disabled={isSubmitting} className="h-12 rounded-xl border-[#dce3dc] bg-[#fbfcf9] px-4 shadow-none" />
          <p className="text-xs leading-5 text-[#78847f]">Letters, numbers, and underscores only.</p>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={isLogin ? "identifier" : "email"}>{isLogin ? "Username or email" : "Email"}</Label>
        <Input id={isLogin ? "identifier" : "email"} name={isLogin ? "identifier" : "email"} type={isLogin ? "text" : "email"} autoComplete={isLogin ? "username" : "email"} placeholder={isLogin ? "alex_dev or alex@example.com" : "alex@example.com"} required disabled={isSubmitting} className="h-12 rounded-xl border-[#dce3dc] bg-[#fbfcf9] px-4 shadow-none" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="••••••••" minLength={isLogin ? 1 : 8} maxLength={128} required disabled={isSubmitting} className="h-12 rounded-xl border-[#dce3dc] bg-[#fbfcf9] px-4 pr-12 shadow-none" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#77837e] hover:bg-[#eef1ec]" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
        {!isLogin ? <p className="text-xs leading-5 text-[#78847f]">At least 8 characters, one letter, and one number.</p> : null}
      </div>
      {error ? <div role="alert" className="rounded-xl border border-[#efcfcb] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#9b4039]">{error}</div> : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-[#142c2b] text-[15px] font-semibold text-white hover:bg-[#1d3c3a]">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Please wait..." : isLogin ? "Log in" : "Create account"}
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>
      <p className="text-center text-sm text-[#697872]">
        {isLogin ? "New to Planora?" : "Already have an account?"}{" "}
        <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-[#234b48] underline-offset-4 hover:underline">{isLogin ? "Create an account" : "Log in"}</Link>
      </p>
    </form>
  );
}

function friendlyError(error: ApiError): string {
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "The username/email or password is incorrect.",
    REGISTRATION_CONFLICT: "That username or email is already in use.",
    AUTH_CONFIGURATION_UNAVAILABLE: "Authentication is temporarily unavailable.",
    VALIDATION_ERROR: "Check the information you entered.",
  };
  return error.code ? messages[error.code] ?? error.message : error.message;
}
