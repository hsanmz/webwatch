import type { LucideIcon } from "lucide-react";

const TONES = {
  default: "text-primary bg-primary/10 border-primary/25",
  up: "text-[var(--up)] bg-[var(--up)]/10 border-[var(--up)]/25",
  down: "text-[var(--down)] bg-[var(--down)]/10 border-[var(--down)]/25",
  paused: "text-[var(--paused)] bg-[var(--paused)]/10 border-[var(--paused)]/25",
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
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${TONES[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-display text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
