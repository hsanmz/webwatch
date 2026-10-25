import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/apm")({
  head: () => ({ meta: [{ title: "Log Error (APM) - WebWatch" }] }),
  component: ApmIssues,
});

type ApmEventRow = {
  id: string;
  environment: string;
  event_type: string;
  message: string;
  stack_trace: string | null;
  url: string | null;
  method: string | null;
  user_agent: string | null;
  created_at: string;
  site_name: string;
  site_id: string;
};

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return api<{ events: ApmEventRow[] }>("/api/sites/dashboard");
    },
  });
}

function isErrorEvent(eventType: string): boolean {
  return eventType.toLowerCase().includes("error");
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ApmIssues() {
  const { data: statsData, isPending, isError, refetch } = useDashboardStats();
  const events = statsData?.events ?? [];

  return (
    <>
      <PageHeader
        eyebrow="APM"
        title="Log Error (APM)"
        description="Log error dan exception dari seluruh aplikasi yang kamu pantau."
      />

      <section className="panel overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-display text-sm font-semibold text-foreground">
            Semua error terbaru
          </h2>
        </div>

        {/* Column headers — only shown when data exists */}
        {!isPending && !isError && events.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-2 text-[11px] font-medium text-muted-foreground">
            <span>Event · Situs · Environment</span>
            <span>Waktu</span>
          </div>
        )}

        <div className="p-5">
          {isPending ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-28 rounded-lg" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <ErrorState
              className="min-h-[180px]"
              title="Log error gagal dimuat"
              description="Data exception tidak bisa diambil dari server."
              onRetry={() => void refetch()}
            />
          ) : events.length === 0 ? (
            <EmptyState
              className="min-h-[180px]"
              icon={Activity}
              title="Belum ada error tercatat"
              description="Belum ada exception yang masuk dari SDK WebWatch pada situs yang kamu pantau."
            />
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="rounded-lg border border-border bg-surface p-4">
                  {/* Top row: meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/sites/$id"
                        params={{ id: ev.site_id }}
                        className="text-sm font-semibold text-foreground hover:underline"
                      >
                        {ev.site_name}
                      </Link>
                      <Badge
                        variant={isErrorEvent(ev.event_type) ? "danger" : "info"}
                        className="font-mono text-[10px]"
                      >
                        {ev.event_type}
                      </Badge>
                      <Badge variant="neutral" className="font-mono text-[10px]">
                        {ev.environment}
                      </Badge>
                    </div>
                    <time
                      className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                      dateTime={ev.created_at}
                    >
                      {formatDateTime(ev.created_at)}
                    </time>
                  </div>

                  {/* Message */}
                  <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>

                  {/* Request info */}
                  {(ev.method || ev.url) && (
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {[ev.method, ev.url].filter(Boolean).join(" ")}
                    </p>
                  )}

                  {/* Stack trace */}
                  {ev.stack_trace && (
                    <pre className="mt-2 w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                      {ev.stack_trace}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
