import { cn } from "@/lib/utils";

export type StatusTone = "up" | "down" | "unknown" | "paused";

export function StatusBadge({
  status,
  active,
  className,
}: {
  status: string;
  active: boolean;
  className?: string;
}) {
  const tone: StatusTone = !active
    ? "paused"
    : status === "up"
      ? "up"
      : status === "down"
        ? "down"
        : "unknown";
  const palette = {
    up: "bg-[var(--up)]/15 text-[var(--up)] border border-[var(--up)]/20",
    down: "bg-[var(--down)]/15 text-[var(--down)] border border-[var(--down)]/20",
    paused: "bg-[var(--paused)]/15 text-[var(--paused)] border border-[var(--paused)]/20",
    unknown: "bg-muted text-muted-foreground border border-border",
  };
  const dot = {
    up: "bg-[var(--up)]",
    down: "bg-[var(--down)]",
    paused: "bg-[var(--paused)]",
    unknown: "bg-muted-foreground",
  };
  const label =
    tone === "paused" ? "Paused" : tone === "unknown" ? "Pending" : status.toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest shadow-none",
        palette[tone],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", dot[tone], tone === "up" ? "live-dot" : "")}
      />
      {label}
    </span>
  );
}
