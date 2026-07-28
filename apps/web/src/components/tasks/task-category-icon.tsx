import {
  BookOpen,
  CircleEllipsis,
  ClipboardList,
  Code2,
  Dumbbell,
  GraduationCap,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { TaskCategory } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = {
  coding: Code2,
  reading: BookOpen,
  meeting: Users,
  study: GraduationCap,
  planning: ClipboardList,
  personal: Sparkles,
  exercise: Dumbbell,
  other: CircleEllipsis,
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  coding: "Coding",
  reading: "Reading",
  meeting: "Meeting",
  study: "Study",
  planning: "Planning",
  personal: "Personal",
  exercise: "Exercise",
  other: "Other",
};

export function TaskCategoryIcon({
  category,
  className,
}: {
  category: TaskCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon aria-hidden="true" className={cn("size-4", className)} />;
}
