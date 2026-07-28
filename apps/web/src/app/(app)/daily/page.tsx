import type { Metadata } from "next";
import { DailyKanban } from "@/components/daily/daily-kanban";

export const metadata: Metadata = { title: "Daily" };
export default function DailyPage() { return <DailyKanban />; }
