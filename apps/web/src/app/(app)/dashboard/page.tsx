import type { Metadata } from "next";

import { StatsDashboard } from "@/components/dashboard/stats-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Review task progress, planned effort, and project performance.",
};

export default function DashboardPage() {
  return <StatsDashboard scope="all" />;
}
