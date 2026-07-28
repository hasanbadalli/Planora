import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { isValidDateKey } from "@/lib/dates";

export const metadata: Metadata = { title: "Day timeline" };
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDateKey(date)) notFound();
  return <DayTimeline date={date} />;
}
