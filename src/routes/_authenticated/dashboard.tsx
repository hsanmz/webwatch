import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Activity, Server } from "lucide-react";

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
  head: () => ({ meta: [{ title: "Dashboard - WebWatch" }] }),
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

function Dashboard() {
  const { data: user } = useCurrentUser();
  const sites = useSites();
  const stats = useDashboardStats();

  const connected = user?.chat_id != null;

  const summary = useMemo(() => {
    const list = sites.data ?? [];
    return {
      total: list.length,
      active: list.filter((s) => s.is_active && s.verification_status === "verified").length,
      pending: list.filter((s) => s.verification_status === "pending").length,
    };
  }, [sites.data]);

  const events = stats.data?.events ?? [];

  return (
    <>
      {!connected && user && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-warning/30 bg-warning-surface p-5">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">
              Telegram belum terhubung
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Notifikasi error APM belum bisa dikirim. Hubungkan akun Telegram supaya alert error
              langsung masuk ke chat.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-warning/40 text-warning">
            <Link to="/auth">Hubungkan Telegram</Link>
          </Button>
        </section>
      )}

      <PageHeader
        eyebrow="Ringkasan"
        title="Dashboard"
        description="Log error dan exception dari seluruh aplikasi yang kamu pantau."
      />

      {/* ── Stat row ────────────────────────────────────────────────── */}
      {sites.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Server} label="Total situs" value={summary.total} sub="terdaftar" />
          <StatCard
            icon={Activity}
            label="Aktif & Terverifikasi"
            value={summary.active}
            sub="menerima log error"
            tone="up"
          />
          <StatCard
            icon={Activity}
            label="Menunggu verifikasi"
            value={summary.pending}
            sub="belum bisa terima log"
            tone="warning"
          />
        </section>
      )}

      {(sites.data?.length ?? 0) === 0 && !sites.isPending && !sites.isError && (
        <EmptyState
          icon={Server}
          title="Belum ada situs dipantau"
          description="Tambahkan website pertama kamu untuk mulai menerima log error dari aplikasi."
          action={
            <Button asChild>
              <Link to="/docs">Lihat Cara Menambah Situs</Link>
            </Button>
          }
        />
      )}

      {(sites.data?.length ?? 0) > 0 && (
        <section className="panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold text-foreground">
                Exception terbaru
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link to="/apm">Semua log</Link>
            </Button>
          </div>

          {!stats.isPending && !stats.isError && events.length > 0 && (
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-2 text-[11px] font-medium text-muted-foreground">
              <span>Event · Situs · Environment</span>
              <span>Waktu</span>
            </div>
          )}

          <div className="flex-1 p-5">
            {stats.isPending ? (
              <ul className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-24 rounded-lg" />
                  </li>
                ))}
              </ul>
            ) : stats.isError ? (
              <ErrorState
                className="min-h-[180px]"
                title="Log error gagal dimuat"
                description="Data exception tidak bisa diambil dari server."
                onRetry={() => void stats.refetch()}
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
                {events.slice(0, 10).map((ev) => (
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
                        {new Date(ev.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
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
      )}
    </>
  );
}
