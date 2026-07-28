import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { Brand } from "@/components/brand";

export function AuthShell({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5">
        <Brand />
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
      </header>
      <section className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isLogin
            ? "Log in to continue planning."
            : "Only the essentials — you can shape the rest as you go."}
        </p>
        <div className="mt-8">
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
