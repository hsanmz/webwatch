import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  Server,
  Activity,
  History,
  ArrowRight,
} from "lucide-react";

import { api, type ApiSite } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const data = await api<{ sites: ApiSite[] }>("/api/sites");
      return data.sites;
    },
  });
}

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

function Dashboard() {
  const { data: user } = useCurrentUser();
  const { data: sitesData, isPending } = useSites();
  const { data: statsData, isPending: statsPending } = useDashboardStats();

  const connected = user?.chat_id != null;

  const stats = useMemo(() => {
    const list = sitesData ?? [];
    return {
      total: list.length,
      up: list.filter((s) => s.is_active && s.current_status === "up").length,
      down: list.filter((s) => s.is_active && s.current_status === "down").length,
      paused: list.filter((s) => !s.is_active).length,
    };
  }, [sitesData]);

  return (
    <>
      {!connected && user && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/10 p-5">
          <div>
            <h3 className="font-display font-semibold text-amber-500">Telegram Belum Terhubung!</h3>
            <p className="mt-1 text-sm text-amber-500/80">
              Kamu belum mengaktifkan notifikasi Telegram. Login ulang di halaman auth untuk
              menghubungkan.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
          >
            <Link to="/auth">Hubungkan Sekarang</Link>
          </Button>
        </section>
      )}

      <PageHeader
        eyebrow="Overview"
        title="Sistem Monitoring"
        description="Ringkasan ketersediaan sistem dan log aplikasi Anda."
        actions={
          <Button asChild variant="outline">
            <Link to="/monitors">Kelola Situs</Link>
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-5 h-[104px] bg-muted/50" />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Server} label="Total Situs" value={stats.total} sub="terdaftar" />
          <StatCard
            icon={CheckCircle2}
            label="Online"
            value={stats.up}
            sub="pantauan aktif"
            tone="up"
          />
          <StatCard
            icon={AlertTriangle}
            label="Gangguan"
            value={stats.down}
            sub="butuh perhatian"
            tone="down"
          />
          <StatCard
            icon={PauseCircle}
            label="Dijeda"
            value={stats.paused}
            sub="pantauan nonaktif"
            tone="paused"
          />
        </section>
      )}

      {sitesData && sitesData.length === 0 && !isPending && (
        <div className="panel flex min-h-[250px] flex-col items-center justify-center px-4 text-center mt-6">
          <div className="relative mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Server className="h-7 w-7 text-primary" />
            </div>
            <span className="live-dot absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-[var(--up)]" />
          </div>
          <h3 className="mt-1.5 font-display text-lg font-semibold">Belum ada situs dipantau</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Sistem belum memiliki data. Mulai tambahkan website di halaman Monitors.
          </p>
          <Button asChild className="mt-6">
            <Link to="/monitors">Ke Halaman Monitors</Link>
          </Button>
        </div>
      )}

      {(sitesData ?? []).length > 0 && (
        <div className="mt-2 grid gap-6 lg:grid-cols-2">
          {/* Recent APM Events */}
          <section className="panel p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-semibold">Top Exceptions</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/apm">
                  Semua Log <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="mt-2 flex-1">
              <ul className="space-y-3">
                {statsPending && <li className="text-sm text-muted-foreground">Memuat...</li>}
                {statsData?.events.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Sistem stabil, tidak ada error tercatat.
                  </li>
                )}
                {statsData?.events.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest ${ev.event_type.includes("error") ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                        >
                          {ev.event_type}
                        </span>
                        <Link
                          to={`/sites/${ev.site_id}`}
                          className="text-xs font-semibold hover:underline truncate"
                        >
                          {ev.site_name}
                        </Link>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm truncate" title={ev.message}>
                      {ev.message}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Recent Incidents */}
          <section className="panel p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-destructive" />
                <h2 className="font-display text-base font-semibold">Active Incidents</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/incidents">
                  Semua Insiden <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <div className="mt-2 flex-1">
              <ul className="space-y-3">
                {statsPending && <li className="text-sm text-muted-foreground">Memuat...</li>}
                {statsData?.incidents.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Sistem stabil, tidak ada downtime tercatat.
                  </li>
                )}
                {statsData?.incidents.slice(0, 5).map((inc) => (
                  <li
                    key={inc.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/sites/${inc.site_id}`}
                          className="text-xs font-semibold hover:underline"
                        >
                          {inc.site_name}
                        </Link>
                        {inc.resolved_at ? (
                          <span className="bg-[var(--up)]/10 text-[var(--up)] px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest">
                            Resolved
                          </span>
                        ) : (
                          <span className="bg-[var(--down)]/10 text-[var(--down)] px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest animate-pulse">
                            Ongoing
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(inc.started_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p
                      className="text-sm text-muted-foreground truncate"
                      title={inc.error_message || "Koneksi gagal"}
                    >
                      {inc.error_message || "Koneksi gagal atau timeout"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
