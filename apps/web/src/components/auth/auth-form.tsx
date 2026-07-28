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
          <Input id="username" name="username" autoComplete="username" placeholder="e.g. alex_dev" minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]+" required disabled={isSubmitting} className="h-10" />
          <p className="text-xs leading-5 text-muted-foreground">Letters, numbers, and underscores only.</p>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={isLogin ? "identifier" : "email"}>{isLogin ? "Username or email" : "Email"}</Label>
        <Input id={isLogin ? "identifier" : "email"} name={isLogin ? "identifier" : "email"} type={isLogin ? "text" : "email"} autoComplete={isLogin ? "username" : "email"} placeholder={isLogin ? "alex_dev or alex@example.com" : "alex@example.com"} required disabled={isSubmitting} className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="••••••••" minLength={isLogin ? 1 : 8} maxLength={128} required disabled={isSubmitting} className="h-10 pr-11" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
        {!isLogin ? <p className="text-xs leading-5 text-muted-foreground">At least 8 characters, one letter, and one number.</p> : null}
      </div>
      {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm leading-6 text-destructive">{error}</div> : null}
      <Button type="submit" size="lg" disabled={isSubmitting} className="h-10 w-full">
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Please wait..." : isLogin ? "Log in" : "Create account"}
        {!isSubmitting ? <ArrowRight className="size-4" /> : null}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? "New to Planora?" : "Already have an account?"}{" "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-primary underline-offset-4 hover:underline">{isLogin ? "Create an account" : "Log in"}</Link>
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
