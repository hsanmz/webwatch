import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/_authenticated/apm")({
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

function ApmIssues() {
  const { data: statsData, isPending: statsPending } = useDashboardStats();

  return (
    <>
      <PageHeader
        eyebrow="APM"
        title="APM & Issues"
        description="Pantau log error dan exception dari seluruh aplikasi Anda."
      />

      <section className="panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold">Semua Error Terbaru</h2>
        </div>
        <div className="mt-4">
          <ul className="space-y-4">
            {statsPending && <li className="text-sm text-muted-foreground">Memuat...</li>}
            {statsData?.events.length === 0 && (
              <li className="text-sm text-muted-foreground">
                Belum ada error atau log dari situs manapun.
              </li>
            )}
            {statsData?.events.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/sites/${ev.site_id}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {ev.site_name}
                    </Link>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${ev.event_type.includes("error") ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"}`}
                    >
                      {ev.event_type}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {ev.environment}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-base font-semibold mt-1">{ev.message}</p>
                {(ev.method || ev.url) && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {ev.method} {ev.url}
                  </p>
                )}
                {ev.stack_trace && (
                  <pre className="mt-2 w-full overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                    {ev.stack_trace}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
