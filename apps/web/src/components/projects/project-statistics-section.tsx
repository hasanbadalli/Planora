"use client";

import { StatsDashboard } from "@/components/dashboard/stats-dashboard";

export function ProjectStatisticsSection({
  projectId,
}: {
  projectId: string;
}) {
  return <StatsDashboard scope="project" projectId={projectId} />;
}
