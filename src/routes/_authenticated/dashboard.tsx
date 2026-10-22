import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Activity, History, Server, TriangleAlert } from "lucide-react";

import { api, type ApiSite } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Skeleton } from "@/components/ui/skeleton";

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

function isErrorEvent(eventType: string): boolean {
  return eventType.toLowerCase().includes("error");
}

function Dashboard() {
  const { data: user } = useCurrentUser();
  const sites = useSites();
  const stats = useDashboardStats();

  const connected = user?.chat_id != null;

  const summary = useMemo(() => {
    const list = sites.data ?? [];
    return {
      total: list.length,
      up: list.filter((s) => s.is_active && s.current_status === "up").length,
      down: list.filter((s) => s.is_active && s.current_status === "down").length,
      paused: list.filter((s) => !s.is_active).length,
    };
  }, [sites.data]);

  const events = stats.data?.events ?? [];
  const incidents = stats.data?.incidents ?? [];

  return (
    <>
      {!connected && user && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-warning/30 bg-warning-surface p-5">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Telegram belum terhubung
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Notifikasistatus belum bisa dikirim. Hubungkan akun Telegram kamu supaya alert
              downtime dan pemulihan langsung masuk ke chat.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-warning/40 text-warning">
            <Link to="/auth">Hubungkan Telegram</Link>
          </Button>
        </section>
      )}

      <PageHeader
        eyebrow="Ringkasan"
        title="Sistem Monitoring"
        description="Ringkasan ketersediaan situs dan log aplikasi yang kamu pantau."
        actions={
          <Button asChild variant="outline">
            <Link to="/monitors">Kelola Situs</Link>
          </Button>
        }
      />

      {sites.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-lg" />
          ))}
        </div>
      ) : sites.isError ? (
        <ErrorState
          title="Situs tidak bisa dimuat"
          description="Daftar situs gagal diambil dari server."
          onRetry={() => void sites.refetch()}
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Server} label="Total situs" value={summary.total} sub="terdaftar" />
          <StatCard
            icon={Activity}
            label="Operasional"
            value={summary.up}
            sub="pemantauan aktif"
            tone="up"
          />
          <StatCard
            icon={TriangleAlert}
            label="Tidak tersedia"
            value={summary.down}
            sub="butuh perhatian"
            tone="down"
          />
          <StatCard
            icon={History}
            label="Dijeda"
            value={summary.paused}
            sub="pemantauan nonaktif"
            tone="paused"
          />
        </section>
      )}

      {(sites.data?.length ?? 0) === 0 && !sites.isPending && !sites.isError && (
        <EmptyState
          icon={Server}
          title="Belum ada situs dipantau"
          description="Tambahkan website pertama kamu di halaman Monitors, lalu Webwatch akan mengeceknya secara berkala."
          action={
            <Button asChild>
              <Link to="/monitors">Tambah Situs Pertama</Link>
            </Button>
          }
        />
      )}

      {(sites.data?.length ?? 0) > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-foreground">
                Exception terbaru
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/apm">Semua log</Link>
              </Button>
            </div>
            <div className="mt-2 flex-1">
              {stats.isPending ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i}>
                      <Skeleton className="h-16 rounded-lg" />
                    </li>
                  ))}
                </ul>
              ) : stats.isError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="Log error gagal dimuat"
                  description="Data exception tidak bisa diambil dari server."
                  onRetry={() => void stats.refetch()}
                />
              ) : events.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={Activity}
                  title="Tidak ada error tercatat"
                  description="Belum ada exception yang masuk dari SDK WebWatch pada situs yang kamu pantau."
                />
              ) : (
                <ul className="space-y-3">
                  {events.slice(0, 5).map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant={isErrorEvent(ev.event_type) ? "danger" : "info"}>
                            {ev.event_type}
                          </Badge>
                          <Link
                            to={`/sites/${ev.site_id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {ev.site_name}
                          </Link>
                        </div>
                        <time
                          className="shrink-0 text-xs text-muted-foreground tabular-nums"
                          dateTime={ev.created_at}
                        >
                          {new Date(ev.created_at).toLocaleTimeString("id-ID")}
                        </time>
                      </div>
                      <p className="mt-1.5 truncate text-sm text-foreground" title={ev.message}>
                        {ev.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-foreground">
                Insiden terbaru
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/incidents">Semua insiden</Link>
              </Button>
            </div>
            <div className="mt-2 flex-1">
              {stats.isPending ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i}>
                      <Skeleton className="h-16 rounded-lg" />
                    </li>
                  ))}
                </ul>
              ) : stats.isError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="Insiden gagal dimuat"
                  description="Riwayat insiden tidak bisa diambil dari server."
                  onRetry={() => void stats.refetch()}
                />
              ) : incidents.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={History}
                  title="Tidak ada downtime"
                  description="Belum ada gangguan yang tercatat untuk situs yang kamu pantau."
                />
              ) : (
                <ul className="space-y-3">
                  {incidents.slice(0, 5).map((inc) => (
                    <li key={inc.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link
                            to={`/sites/${inc.site_id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {inc.site_name}
                          </Link>
                          <Badge variant={inc.resolved_at ? "success" : "danger"}>
                            {inc.resolved_at ? "Selesai" : "Berlangsung"}
                          </Badge>
                        </div>
                        <time
                          className="shrink-0 text-xs text-muted-foreground tabular-nums"
                          dateTime={inc.started_at}
                        >
                          {new Date(inc.started_at).toLocaleTimeString("id-ID")}
                        </time>
                      </div>
                      <p
                        className="mt-1.5 truncate text-sm text-muted-foreground"
                        title={inc.error_message ?? "Koneksi gagal"}
                      >
                        {inc.error_message ?? "Koneksi gagal atau timeout"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
