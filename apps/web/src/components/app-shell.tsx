"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CircleDot,
  Layers3,
  LoaderCircle,
  LogOut,
  Plus,
  Sun,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  ApiError,
  AuthUser,
  Project,
  getCurrentUser,
  getProjects,
  logoutUser,
} from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { emitWorkspaceRefresh } from "@/lib/workspace-events";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/daily", label: "Today", icon: Sun },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: Layers3 },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const loadProjects = useCallback(() => {
    void getProjects()
      .then(setProjects)
      .catch(() => undefined);
  }, []);

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

  useEffect(() => {
    if (user) loadProjects();
  }, [user, loadProjects]);

  async function logOut() {
    await logoutUser().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (error)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-notion">
          <h1 className="text-lg font-semibold">
            We could not open your workspace
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <button
            onClick={() => location.reload()}
            className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </main>
    );
  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3 text-sm">
          <LoaderCircle className="size-5 animate-spin" />
          Loading your workspace...
        </div>
      </main>
    );

  const activeProjects = projects
    .filter((project) => project.status !== "archived")
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[232px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <Brand href="/daily" />
          <button
            onClick={() => void logOut()}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>

        <div className="px-3 pb-1 pt-2">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-foreground shadow-notion transition-colors hover:bg-accent"
          >
            <Plus className="size-4 text-primary" />
            New task
          </button>
        </div>

        <nav className="mt-2 space-y-px px-3" aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-[30px] items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {activeProjects.length ? (
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground/80">
              Projects
            </p>
            <div className="space-y-px">
              {activeProjects.map((project) => {
                const href = `/projects/${project.id}`;
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={project.id}
                    href={href}
                    className={cn(
                      "flex h-[30px] items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                    )}
                  >
                    <CircleDot
                      className="size-3.5 shrink-0"
                      style={{ color: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
              {user.username.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium leading-tight">
                {user.username}
              </p>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Brand href="/daily" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => void logOut()}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
          <div className="flex size-7 items-center justify-center rounded-md bg-secondary text-xs font-semibold uppercase">
            {user.username.slice(0, 1)}
          </div>
        </div>
      </header>

      <main className="min-w-0 pb-20 md:col-start-2 md:pb-0">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.slice(0, 2).map((item) => (
          <MobileNavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <button
          onClick={() => setQuickAddOpen(true)}
          aria-label="New task"
          className="flex min-h-14 flex-col items-center justify-center text-primary"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-notion">
            <Plus className="size-5" />
          </span>
        </button>
        {navigation.slice(2).map((item) => (
          <MobileNavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <TaskFormDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        projects={projects.filter((project) => project.status !== "archived")}
        onProjectsChange={setProjects}
        selectedDate={dateKey(new Date())}
        task={null}
        onSaved={() => {
          emitWorkspaceRefresh();
          loadProjects();
        }}
      />
    </div>
  );
}

function MobileNavLink({
  item,
  pathname,
}: {
  item: (typeof navigation)[number];
  pathname: string;
}) {
  const { href, label, icon: Icon } = item;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}
