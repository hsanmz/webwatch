import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * A metric tile. The number is the loudest thing in the tile and uses
 * tabular figures so a row of tiles keeps its digits aligned. The tone is
 * carried by the icon tile and by the value colour, never by the layout.
 */
const TONES = {
  default: "border-primary/25 bg-primary-subtle text-primary",
  up: "border-success/25 bg-success-surface text-success",
  down: "border-danger/25 bg-danger-surface text-danger",
  warning: "border-warning/25 bg-warning-surface text-warning",
  paused: "border-border bg-muted text-muted-foreground",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
          TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold leading-none tabular-nums text-foreground">
          {value}
        </p>
        {sub && <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
