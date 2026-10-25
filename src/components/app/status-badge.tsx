import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/*
 * APM site status:
 *   verified   -> Terverifikasi    (domain verified, accepting error logs)
 *   pending    -> Pending Verifikasi  (domain not verified yet)
 *   inactive   -> Dijeda           (error ingestion paused)
 */

export type SiteStatusKey = "verified" | "pending" | "inactive";

type Tone = "success" | "warning" | "neutral" | "danger";

const SITE_STATES: Record<SiteStatusKey, { label: string; tone: Tone }> = {
  verified: { label: "Terverifikasi", tone: "success" },
  pending: { label: "Pending Verifikasi", tone: "warning" },
  inactive: { label: "Dijeda", tone: "neutral" },
};

const DOT: Record<Tone, string> = {
  success: "bg-up",
  warning: "bg-degraded",
  neutral: "bg-paused",
  danger: "bg-down",
};

/**
 * Resolve APM site status from verification_status and is_active.
 */
export function resolveSiteStatus(
  verificationStatus: string | null | undefined,
  isActive: boolean,
): { key: SiteStatusKey; label: string; tone: Tone } {
  if (!isActive) {
    return { key: "inactive", ...SITE_STATES.inactive };
  }
  switch (verificationStatus) {
    case "verified":
      return { key: "verified", ...SITE_STATES.verified };
    case "pending":
      return { key: "pending", ...SITE_STATES.pending };
    default:
      return { key: "pending", ...SITE_STATES.pending };
  }
}

export function SiteStatusBadge({
  verificationStatus,
  isActive,
  className,
}: {
  verificationStatus: string | null | undefined;
  isActive: boolean;
  className?: string;
}) {
  const state = resolveSiteStatus(verificationStatus, isActive);

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
