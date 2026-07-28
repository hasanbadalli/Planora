"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ServiceState = "loading" | "online" | "offline";
const initial = { api: "loading" as ServiceState, database: "loading" as ServiceState, error: null as string | null };
const labels: Record<ServiceState, string> = { loading: "Checking", online: "Connected", offline: "Unavailable" };

export function DevelopmentStatus() {
  const [health, setHealth] = useState(initial);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  async function refresh() { setHealth(initial); setHealth(await fetchHealth(apiUrl)); }
  useEffect(() => { let active = true; void fetchHealth(apiUrl).then((value) => { if (active) setHealth(value); }); return () => { active = false; }; }, [apiUrl]);
  return <section className="w-full rounded-[22px] border border-[#dfe5dc] bg-white p-5 shadow-[0_10px_32px_rgba(45,62,54,0.06)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#789084]">Development status</p><h2 className="mt-2 text-xl font-semibold text-[#142c2b]">System connections</h2></div><Button variant="outline" size="lg" onClick={() => void refresh()} className="border-[#dce3dc] text-[#345c43]">Refresh</Button></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><Status label="API status" state={health.api} /><Status label="Database status" state={health.database} /></div>{health.error ? <p role="alert" className="mt-4 rounded-xl border border-[#efcfcb] bg-[#fff7f5] px-4 py-3 text-sm text-[#9b4039]">{health.error}</p> : null}</section>;
}

async function fetchHealth(apiUrl: string) {
  const [api, database] = await Promise.allSettled([fetch(`${apiUrl}/health`, { cache: "no-store" }), fetch(`${apiUrl}/health/database`, { cache: "no-store" })]);
  const apiOnline = api.status === "fulfilled" && api.value.ok;
  const dbOnline = database.status === "fulfilled" && database.value.ok;
  return { api: (apiOnline ? "online" : "offline") as ServiceState, database: (dbOnline ? "online" : "offline") as ServiceState, error: api.status === "rejected" && database.status === "rejected" ? "The backend could not be reached. Check the API URL and server." : null };
}

function Status({ label, state }: { label: string; state: ServiceState }) {
  const dot = { loading: "bg-amber-400", online: "bg-emerald-500", offline: "bg-red-500" }[state];
  return <div className="flex items-center justify-between rounded-xl bg-[#f4f6f1] px-4 py-4"><span className="text-sm font-medium text-[#425751]">{label}</span><span className="flex items-center gap-2 text-sm text-[#697872]"><span className={`size-2.5 rounded-full ${dot}`} />{labels[state]}</span></div>;
}
