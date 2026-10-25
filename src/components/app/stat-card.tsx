import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * StatCard — a metric instrument tile.
 *
 * Layout: icon tile | metric block. The number is the loudest thing in the
 * tile; the label and sub-label are muted and small. The icon tile's tone
 * carries the operational state without redundancy.
 *
 * The tone applies only to the icon tile — not to the value — so the
 * number stays neutral and the whole row of cards keeps a calm baseline
 * contrast. The exception is `down`, which colors the value red because
 * an active incident is the one number that warrants attention.
 */
const TILE_TONES = {
  default: "border-primary/20 bg-primary-subtle text-primary",
  up: "border-success/20 bg-success-surface text-success",
  down: "border-danger/20 bg-danger-surface text-danger",
  warning: "border-warning/20 bg-warning-surface text-warning",
  paused: "border-border bg-muted text-muted-foreground",
} as const;

const VALUE_TONES: Record<keyof typeof TILE_TONES, string> = {
  default: "text-foreground",
  up: "text-foreground",
  down: "text-danger",
  warning: "text-foreground",
  paused: "text-muted-foreground",
};

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
  tone?: keyof typeof TILE_TONES;
}) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
          TILE_TONES[tone],
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1 font-display text-2xl font-bold leading-none tabular-nums",
            VALUE_TONES[tone],
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
