import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/incidents")({
  component: Incidents,
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

type IncidentRow = {
  id: string;
  started_at: string;
  resolved_at: string | null;
  error_message: string | null;
  site_name: string;
  site_id: string;
};

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return api<{ events: ApmEventRow[]; incidents: IncidentRow[] }>("/api/sites/dashboard");
    },
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Incidents() {
  const { data: statsData, isPending, isError, refetch } = useDashboardStats();
  const incidents = statsData?.incidents ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Incidents"
        title="Riwayat gangguan"
        description="Daftar insiden downtime dari seluruh situs yang kamu pantau."
      />

      <section className="panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-foreground">Semua insiden</h2>
        </div>

        {isPending ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-24 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <ErrorState
            className="min-h-[180px]"
            title="Riwayat insiden gagal dimuat"
            description="Data insiden tidak bisa diambil dari server."
            onRetry={() => void refetch()}
          />
        ) : incidents.length === 0 ? (
          <EmptyState
            className="min-h-[180px]"
            icon={History}
            title="Tidak ada riwayat gangguan"
            description="Belum ada downtime yang tercatat untuk situs yang kamu pantau."
          />
        ) : (
          <ul className="space-y-3">
            {incidents.map((inc) => (
              <li key={inc.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/sites/${inc.site_id}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {inc.site_name}
                    </Link>
                    <Badge variant={inc.resolved_at ? "success" : "danger"}>
                      {inc.resolved_at ? "Selesai" : "Berlangsung"}
                    </Badge>
                  </div>
                  <time
                    className="text-xs text-muted-foreground tabular-nums"
                    dateTime={inc.started_at}
                  >
                    Mulai {formatDateTime(inc.started_at)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {inc.error_message || "Koneksi gagal atau timeout"}
                </p>
                {inc.resolved_at && (
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    Pulih pada {formatDateTime(inc.resolved_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
