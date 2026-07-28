"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Columns3,
  LayoutDashboard,
  Layers3,
  LogOut,
  LoaderCircle,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { ApiError, AuthUser, getCurrentUser, logoutUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: Layers3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentUser()
      .then((session) => {
        if (active) setUser(session.user);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 401)
          router.replace("/login");
        else
          setError(
            caught instanceof Error
              ? caught.message
              : "Your workspace could not be loaded.",
          );
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function logOut() {
    await logoutUser().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f3] p-6">
        <div className="max-w-md rounded-2xl border border-[#efd5d0] bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-[#142c2b]">
            We could not open your workspace
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6c7974]">{error}</p>
          <button
            onClick={() => location.reload()}
            className="mt-5 rounded-xl bg-[#142c2b] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7f3] text-[#52655d]">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle className="size-5 animate-spin" />
          Loading your workspace...
        </div>
      </main>
    );

  return (
    <div className="min-h-screen bg-[#f5f7f3] text-[#172d2a] md:grid md:grid-cols-[240px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#dfe5dc] bg-[#fbfcf9] px-4 py-5 md:flex">
        <Brand href="/dashboard" className="px-2" />
        <nav className="mt-10 space-y-1" aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#e9eee4] text-[#193a35]"
                    : "text-[#66766f] hover:bg-[#f0f3ed] hover:text-[#193a35]",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#e3e8e1] pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#dce7d2] text-sm font-bold uppercase text-[#355345]">
              {user.username.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.username}</p>
              <p className="truncate text-xs text-[#82908a]">{user.email}</p>
            </div>
            <button
              onClick={() => void logOut()}
              className="flex size-8 items-center justify-center rounded-lg text-[#77857f] hover:bg-[#ecefeb]"
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#dfe5dc] bg-[#fbfcf9]/95 px-5 backdrop-blur md:hidden">
        <Brand href="/dashboard" />
        <div className="ml-auto flex size-9 items-center justify-center rounded-xl bg-[#dce7d2] text-sm font-bold uppercase text-[#355345]">
          {user.username.slice(0, 1)}
        </div>
      </header>
      <main className="min-w-0 pb-24 md:col-start-2 md:pb-0">{children}</main>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-[#dce3da] bg-white/95 p-1.5 shadow-[0_14px_40px_rgba(33,52,44,0.16)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold",
                active ? "bg-[#e9eee4] text-[#23473f]" : "text-[#79867f]",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
