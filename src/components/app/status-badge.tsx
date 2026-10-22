import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/*
 * A monitor's state is always spelled out in words. The colour reinforces the
 * word, it never carries it: an unknown state is neutral, never green.
 *
 *   up        -> Operasional      (the check succeeded)
 *   degraded  -> Terlambat        (reachable, but slower than expected)
 *   down      -> Tidak Tersedia   (the check failed)
 *   unknown   -> Belum Dicek      (the site has never been checked)
 *   other     -> Tidak Diketahui  (a state this build does not recognise)
 *   inactive  -> Dijeda           (monitoring is paused, not broken)
 */
export type MonitorStatusKey = "up" | "degraded" | "down" | "unknown" | "unrecognised" | "paused";

type Tone = "success" | "warning" | "danger" | "neutral";

const STATES: Record<MonitorStatusKey, { label: string; tone: Tone }> = {
  up: { label: "Operasional", tone: "success" },
  degraded: { label: "Terlambat", tone: "warning" },
  down: { label: "Tidak Tersedia", tone: "danger" },
  unknown: { label: "Belum Dicek", tone: "neutral" },
  unrecognised: { label: "Tidak Diketahui", tone: "neutral" },
  paused: { label: "Dijeda", tone: "neutral" },
};

const DOT: Record<Tone, string> = {
  success: "bg-up",
  warning: "bg-degraded",
  danger: "bg-down",
  neutral: "bg-paused",
};

export function resolveMonitorStatus(
  status: string | null | undefined,
  active: boolean,
): { key: MonitorStatusKey; label: string; tone: Tone } {
  if (!active) {
    return { key: "paused", ...STATES.paused };
  }
  switch (status) {
    case "up":
      return { key: "up", ...STATES.up };
    case "down":
      return { key: "down", ...STATES.down };
    case "degraded":
      return { key: "degraded", ...STATES.degraded };
    case "unknown":
      return { key: "unknown", ...STATES.unknown };
    default:
      return { key: "unrecognised", ...STATES.unrecognised };
  }
}

export function StatusBadge({
  status,
  active,
  className,
}: {
  status: string | null | undefined;
  active: boolean;
  className?: string;
}) {
  const state = resolveMonitorStatus(status, active);

  return (
    <Badge variant={state.tone} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[state.tone])} aria-hidden="true" />
      {state.label}
    </Badge>
  );
}

/*
 * The public status page reports the health of WebWatch itself, which uses a
 * different vocabulary from a monitored site. It borrows the same tones and
 * the same rule: the state is always spelled out in words.
 */
export type SystemStatusKey = "operational" | "degraded" | "outage" | "unknown";

const SYSTEM_STATES: Record<SystemStatusKey, { label: string; tone: Tone }> = {
  operational: { label: "Operasional", tone: "success" },
  degraded: { label: "Terlambat", tone: "warning" },
  outage: { label: "Tidak Tersedia", tone: "danger" },
  unknown: { label: "Belum Dicek", tone: "neutral" },
};

export function resolveSystemStatus(status: string | null | undefined): {
  key: SystemStatusKey;
  label: string;
  tone: Tone;
} {
  switch (status) {
    case "operational":
      return { key: "operational", ...SYSTEM_STATES.operational };
    case "degraded":
      return { key: "degraded", ...SYSTEM_STATES.degraded };
    case "outage":
      return { key: "outage", ...SYSTEM_STATES.outage };
    default:
      return { key: "unknown", ...SYSTEM_STATES.unknown };
  }
}

export function SystemStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const state = resolveSystemStatus(status);

  return (
    <Badge variant={state.tone} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[state.tone])} aria-hidden="true" />
      {state.label}
    </Badge>
  );
}
