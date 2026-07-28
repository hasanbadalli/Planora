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
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground",
        className,
      )}
      aria-label="Planora home"
    >
      <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[13px] font-bold leading-none text-background">
        P
      </span>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Planora
        </span>
      ) : null}
    </Link>
  );
}
