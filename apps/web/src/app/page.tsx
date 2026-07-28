import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Layers3, Repeat2, Sparkles } from "lucide-react";

import { Brand } from "@/components/brand";
import { DevelopmentStatus } from "@/components/development-status";

const features = [
  { icon: CalendarDays, label: "Weekly clarity", title: "See the week before it gets busy", text: "Move from a calm weekly overview into an hour-by-hour day timeline." },
  { icon: Layers3, label: "Project context", title: "Keep plans close to the work", text: "Connect tasks and future plans to projects without losing your daily view." },
  { icon: Repeat2, label: "Reliable rhythm", title: "Schedule recurring work once", text: "Weekly routines appear when needed without filling your database with endless rows." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f4] text-[#142c2b]">
      <header className="border-b border-[#e2e7df] bg-[#f7f8f4]/95">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center px-5 sm:px-8">
          <Brand />
          <nav className="ml-12 hidden items-center gap-8 text-sm font-medium text-[#60706a] md:flex" aria-label="Marketing navigation">
            <a href="#features" className="hover:text-[#142c2b]">Features</a>
            <a href="#calendar" className="hover:text-[#142c2b]">Calendar</a>
            <a href="#projects" className="hover:text-[#142c2b]">Projects</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-[#345c43] hover:bg-[#ebeee8] sm:px-4">Log in</Link>
            <Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#142c2b] px-4 text-sm font-semibold text-white hover:bg-[#1d3c3a] sm:px-5">Get started <ArrowRight className="hidden size-4 sm:block" /></Link>
          </div>
        </div>
      </header>
      <section className="relative border-b border-[#e2e7df]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(#dfe5dc_1px,transparent_1px),linear-gradient(90deg,#dfe5dc_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:py-28">
          <div className="max-w-[620px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e1d5] bg-white px-3 py-1.5 text-xs font-semibold text-[#4f6b5a]"><Sparkles className="size-3.5 text-[#749342]" />A calm place for focused planning</div>
            <h1 className="mt-7 text-[48px] font-semibold leading-[0.98] tracking-[-0.062em] sm:text-[64px] lg:text-[72px]">Make time visible.<span className="block text-[#66806f]">Make progress feel clear.</span></h1>
            <p className="mt-7 max-w-[560px] text-[17px] leading-8 text-[#60706a] sm:text-lg">Planora brings your calendar, recurring tasks, and projects into one focused workspace—so every day has direction.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#142c2b] px-6 text-[15px] font-semibold text-white hover:bg-[#1d3c3a]">Start planning <ArrowRight className="size-4" /></Link>
              <a href="#calendar" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d8dfd5] bg-white px-6 text-[15px] font-semibold text-[#345c43] hover:bg-[#f0f2ed]">Explore the workflow</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#74827c]"><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#6e8b43]" />No credit card</span><span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#6e8b43]" />Ready in a minute</span></div>
          </div>
          <CalendarPreview />
        </div>
      </section>
      <section id="features" className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-10 max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#66806f]">Designed for momentum</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">A planner should lower the noise.</h2></div>
        <div className="grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, label, title, text }, index) => <article key={title} id={index === 0 ? "calendar" : index === 1 ? "projects" : undefined} className="rounded-[22px] border border-[#dfe5dc] bg-white p-6"><div className="flex size-11 items-center justify-center rounded-[13px] bg-[#edf1e7] text-[#45604f]"><Icon className="size-5" /></div><p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#7a8a82]">{label}</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#6f7c77]">{text}</p></article>)}</div>
      </section>
      <section className="border-y border-[#dfe5dc] bg-[#142c2b] text-white"><div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7f36b]">Start with today</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Build a week you can actually see.</h2></div><Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#d7f36b] px-6 text-sm font-bold text-[#142c2b]">Create account <ArrowRight className="size-4" /></Link></div></section>
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><DevelopmentStatus /></section>
      <footer className="border-t border-[#e0e5de]"><div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-[#7c8983] sm:flex-row sm:px-8"><Brand /><p>© 2026 Planora. Built for clearer days.</p></div></footer>
    </main>
  );
}

function CalendarPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return <div className="rounded-[28px] border border-[#d7ded5] bg-[#eef1eb] p-3 shadow-[0_26px_70px_rgba(34,50,43,0.15)]"><div className="overflow-hidden rounded-[21px] border border-[#dfe5dc] bg-white"><div className="flex items-center justify-between border-b border-[#e7ebe5] px-6 py-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#84918b]">This week</p><h3 className="mt-1 text-xl font-semibold">July 20–26</h3></div><span className="rounded-xl bg-[#edf1e7] px-3 py-2 text-xs font-semibold text-[#587061]">9 planned</span></div><div className="grid grid-cols-5 divide-x divide-[#edf0eb]">{days.map((day, index) => <div key={day} className="min-h-72 p-3"><p className="text-center text-[11px] font-semibold uppercase text-[#87928d]">{day}</p><p className="mt-1 text-center text-lg font-semibold">{20 + index}</p>{index === 1 ? <PreviewTask time="09:00" title="Focus coding" /> : null}{index === 2 ? <PreviewTask time="14:00" title="Project review" /> : null}{index === 4 ? <PreviewTask time="10:30" title="Read & reflect" /> : null}</div>)}</div></div></div>;
}

function PreviewTask({ time, title }: { time: string; title: string }) { return <div className="mt-5 rounded-xl border border-[#d8e1d1] bg-[#f3f7ed] p-2.5"><p className="text-[10px] font-semibold text-[#78905f]">{time}</p><p className="mt-1 text-[11px] font-semibold leading-4 text-[#29433c]">{title}</p></div>; }
