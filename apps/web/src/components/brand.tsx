import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({
  className,
  compact = false,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900", className)} aria-label="Planora home">
      <span className="relative flex size-9 items-center justify-center rounded-[11px] bg-[#142c2b] text-sm font-bold text-white shadow-[0_6px_16px_rgba(20,44,43,0.18)]">
        P
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#f7f8f4] bg-[#d7f36b]" />
      </span>
      {!compact ? <span className="text-[19px] font-semibold tracking-[-0.03em] text-[#142c2b]">Planora</span> : null}
    </Link>
  );
}
