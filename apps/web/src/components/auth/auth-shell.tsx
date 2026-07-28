import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Layers3 } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { Brand } from "@/components/brand";

export function AuthShell({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  return (
    <main className="min-h-screen bg-[#f4f6f1] p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1440px] overflow-hidden rounded-[28px] border border-[#dfe5dc] bg-white shadow-[0_24px_80px_rgba(40,58,50,0.08)] sm:min-h-[calc(100vh-40px)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-[#142c2b] px-12 py-10 text-white lg:flex lg:flex-col">
          <Brand className="[&_span:last-child]:text-white" />
          <div className="my-auto max-w-lg py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7f36b]">One place. A clearer rhythm.</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.055em]">Plan your day. Protect your focus.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/65">Personal work, focus sessions, and project steps meet in one calm planner.</p>
            <div className="mt-10 space-y-4">
              <AuthFeature icon={CalendarDays} title="Calendar and day timeline" text="See the shape of your week and every hour of a selected day." />
              <AuthFeature icon={Layers3} title="Projects with context" text="Keep tasks and future plans connected to the work they support." />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/45"><Check className="size-4 text-[#d7f36b]" />Simple interface · Secure session · Timezone aware</div>
        </section>
        <section className="flex min-h-full flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-20 xl:px-28">
          <div className="flex items-center justify-between">
            <Brand className="lg:hidden" />
            <Link href="/" className="ml-auto inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[#60706a] hover:bg-[#f1f3ee]"><ArrowLeft className="size-4" />Home</Link>
          </div>
          <div className="mx-auto my-auto w-full max-w-[440px] py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#65806e]">{isLogin ? "Welcome back" : "Start with Planora"}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-[#142c2b]">{isLogin ? "Log in to your account" : "Create your account"}</h2>
            <p className="mt-3 text-[15px] leading-6 text-[#697872]">{isLogin ? "Continue planning from where you left off." : "Only the essentials now. You can shape the rest as you go."}</p>
            <div className="mt-9"><AuthForm mode={mode} /></div>
          </div>
          <p className="text-center text-xs leading-5 text-[#96a09b]">By continuing, you agree to use Planora responsibly and securely.</p>
        </section>
      </div>
    </main>
  );
}

function AuthFeature({ icon: Icon, title, text }: { icon: typeof CalendarDays; title: string; text: string }) {
  return <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#d7f36b]"><Icon className="size-[19px]" /></div><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{text}</p></div></div>;
}
