import type { Metadata } from "next";
import { WeekCalendar } from "@/components/calendar/week-calendar";

export const metadata: Metadata = { title: "Calendar" };
export default function CalendarPage() { return <WeekCalendar />; }
