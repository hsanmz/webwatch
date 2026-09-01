import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";

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

function Incidents() {
  const { data: statsData, isPending: statsPending } = useDashboardStats();

  return (
    <>
      <PageHeader
        eyebrow="Incidents"
        title="Riwayat Gangguan"
        description="Daftar insiden downtime dari seluruh situs Anda."
      />

      <section className="panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-destructive" />
          <h2 className="font-display text-base font-semibold">Semua Insiden</h2>
        </div>
        <div className="mt-4">
          <ul className="space-y-4">
            {statsPending && <li className="text-sm text-muted-foreground">Memuat...</li>}
            {statsData?.incidents.length === 0 && (
              <li className="text-sm text-muted-foreground">Tidak ada riwayat gangguan tercatat.</li>
            )}
            {statsData?.incidents.map((inc) => (
              <li
                key={inc.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/sites/${inc.site_id}`} className="text-sm font-semibold hover:underline">
                      {inc.site_name}
                    </Link>
                    {inc.resolved_at ? (
                      <span className="bg-[var(--up)]/10 text-[var(--up)] border border-[var(--up)]/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest">
                        Resolved
                      </span>
                    ) : (
                      <span className="bg-[var(--down)]/10 text-[var(--down)] border border-[var(--down)]/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest animate-pulse">
                        Ongoing
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    Mulai: {new Date(inc.started_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-base mt-2">
                  {inc.error_message || "Koneksi gagal atau timeout"}
                </p>
                {inc.resolved_at && (
                  <p className="text-sm font-mono text-muted-foreground mt-1">
                    Pulih pada: {new Date(inc.resolved_at).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
