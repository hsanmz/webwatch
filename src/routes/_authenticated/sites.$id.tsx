import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  History,
  KeyRound,
  Loader2,
  Save,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge, resolveMonitorStatus } from "@/components/app/status-badge";
import { CodeBlock } from "@/components/app/code-block";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/sites/$id")({
  component: SiteDetail,
});

function duration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} jam ${minutes % 60} menit` : `${minutes} menit`;
}

const DAY_MS = 86_400_000;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type SiteRow = {
  id: string;
  name: string | null;
  url: string;
  current_status: string;
  is_active: boolean;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  check_ssl: boolean;
  last_checked_at: string | null;
};

type CheckRow = {
  id: string;
  is_up: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
};

type IncidentRow = {
  id: string;
  started_at: string;
  resolved_at: string | null;
  error_message: string | null;
};

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
};

type Detail = { site: SiteRow; checks: CheckRow[]; incidents: IncidentRow[] };

function isErrorEvent(eventType: string): boolean {
  return eventType.toLowerCase().includes("error");
}

function SiteDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["site-detail", id],
    queryFn: () => api<Detail>(`/api/sites/detail?id=${encodeURIComponent(id)}`),
  });

  const apiKeys = useQuery({
    queryKey: ["site-keys", id],
    queryFn: () =>
      api<{ keys: { key: string; name: string; created_at: string }[] }>(
        `/api/sites/keys?siteId=${encodeURIComponent(id)}`,
      ),
  });

  const apmEvents = useQuery({
    queryKey: ["site-events", id],
    queryFn: () =>
      api<{ events: ApmEventRow[] }>(`/api/sites/events?siteId=${encodeURIComponent(id)}`),
  });

  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [failThreshold, setFailThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");

  const createApiKey = useMutation({
    mutationFn: async (name: string) =>
      api<{ ok: boolean; key: string }>("/api/sites/keys", {
        method: "POST",
        body: JSON.stringify({ siteId: id, name }),
      }),
    onSuccess: () => {
      toast.success("API key berhasil dibuat");
      setKeyName("");
      setKeyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["site-keys", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const site = detail.data?.site ?? null;
  const all = detail.data?.checks ?? [];

  useEffect(() => {
    if (!site) return;
    setIntervalMinutes(String(Math.max(1, Math.round(site.interval_seconds / 60))));
    setFailThreshold(String(site.fail_threshold));
    setKeyword(site.check_keyword ?? "");
    setCheckSsl(site.check_ssl);
  }, [site]);

  const saveSettings = useMutation({
    mutationFn: async () =>
      api<{ ok: boolean }>("/api/sites", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          intervalMinutes: Math.max(1, Number(intervalMinutes) || 5),
          failThreshold: Math.max(1, Number(failThreshold) || 2),
          keyword: keyword.trim() || null,
          ssl: checkSsl,
        }),
      }),
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const now = Date.now();

  function uptimeFor(windowMs: number) {
    const inWindow = all.filter((c) => now - new Date(c.checked_at).getTime() <= windowMs);
    const up = inWindow.filter((c) => c.is_up).length;
    const ms = inWindow.length
      ? Math.round(
          inWindow.reduce((sum, c) => sum + (c.response_time_ms ?? 0), 0) / inWindow.length,
        )
      : null;
    return {
      total: inWindow.length,
      uptime: inWindow.length ? ((up / inWindow.length) * 100).toFixed(2) : null,
      avgMs: ms,
    };
  }

  const windows = {
    "24 jam": uptimeFor(DAY_MS),
    "7 hari": uptimeFor(7 * DAY_MS),
    "30 hari": uptimeFor(30 * DAY_MS),
  };

  const byDay = new Map<string, { total: number; up: number; ms: number }>();
  for (const c of all) {
    const key = dayKey(new Date(c.checked_at));
    const bucket = byDay.get(key) ?? { total: 0, up: 0, ms: 0 };
    bucket.total += 1;
    if (c.is_up) bucket.up += 1;
    bucket.ms += c.response_time_ms ?? 0;
    byDay.set(key, bucket);
  }

  const daily: { label: string; uptime: number | null; avgMs: number | null }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS);
    const bucket = byDay.get(dayKey(date));
    daily.push({
      label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      uptime: bucket?.total ? (bucket.up / bucket.total) * 100 : null,
      avgMs: bucket?.total ? Math.round(bucket.ms / bucket.total) : null,
    });
  }

  const recentLog = [...all].reverse().slice(0, 50);
  const incidents = detail.data?.incidents ?? [];
  const keys = apiKeys.data?.keys ?? [];
  const events = apmEvents.data?.events ?? [];

  const status = site ? resolveMonitorStatus(site.current_status, site.is_active) : null;

  const stale =
    site?.last_checked_at != null &&
    now - new Date(site.last_checked_at).getTime() > site.interval_seconds * 3000;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      {detail.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : detail.isError ? (
        <ErrorState
          title="Detail situs gagal dimuat"
          description="Data situs tidak bisa diambil dari server."
          onRetry={() => void detail.refetch()}
        />
      ) : !site ? (
        <EmptyState
          icon={CheckCircle2}
          title="Situs tidak ditemukan"
          description="Situs yang kamu cari sudah dihapus atau tidak pernah ada."
          action={
            <Button asChild variant="outline">
              <Link to="/monitors">Kembali ke daftar situs</Link>
            </Button>
          }
        />
      ) : (
        <>
          <PageHeader
            eyebrow="Detail situs"
            title={site.name || site.url}
            description={site.url}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/monitors">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Daftar situs
                  </Link>
                </Button>
                <StatusBadge status={site.current_status} active={site.is_active} />
              </div>
            }
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              diperiksa tiap {Math.max(1, Math.round(site.interval_seconds / 60))} menit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              {site.last_checked_at ? (
                <time dateTime={site.last_checked_at} className="tabular-nums">
                  terakhir dicek {formatDateTime(site.last_checked_at)}
                </time>
              ) : (
                "belum pernah dicek"
              )}
            </span>
          </div>

          {stale && (
            <p
              role="status"
              className="rounded-lg border border-warning/30 bg-warning-surface px-4 py-3 text-sm text-foreground"
            >
              Data pengecekan terakhir sudah melewati jadwal. Monitor mungkin sedang berjalan lambat
              atau tidak aktif.
            </p>
          )}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={CheckCircle2}
              label="Status"
              value={status?.label ?? "Tidak Diketahui"}
              sub={site.is_active ? "pemantauan aktif" : "pemantauan dijeda"}
              tone={
                !site.is_active
                  ? "paused"
                  : site.current_status === "up"
                    ? "up"
                    : site.current_status === "down"
                      ? "down"
                      : "default"
              }
            />
            {Object.entries(windows).map(([label, stats]) => (
              <StatCard
                key={label}
                icon={Gauge}
                label={`Uptime ${label}`}
                value={stats.uptime != null ? `${stats.uptime}%` : "Belum ada data"}
                sub={stats.avgMs != null ? `rata-rata ${stats.avgMs} ms` : "belum ada data"}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="panel p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Uptime harian
                </h2>
                <Badge variant="neutral">30 hari</Badge>
              </div>
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="label"
                      fontSize={11}
                      stroke="var(--color-text-muted)"
                      tick={{ fill: "var(--color-text-muted)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      fontSize={11}
                      stroke="var(--color-text-muted)"
                      tick={{ fill: "var(--color-text-muted)" }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : undefined;
                        return n == null
                          ? ["Belum ada data", "uptime"]
                          : [`${n.toFixed(1)}%`, "uptime"];
                      }}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        color: "var(--color-text)",
                      }}
                    />
                    <Bar
                      dataKey="uptime"
                      fill="var(--chart-1)"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Waktu respons
                </h2>
                <Badge variant="neutral">30 hari</Badge>
              </div>
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="msFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="label"
                      fontSize={11}
                      stroke="var(--color-text-muted)"
                      tick={{ fill: "var(--color-text-muted)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      fontSize={11}
                      stroke="var(--color-text-muted)"
                      tick={{ fill: "var(--color-text-muted)" }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : undefined;
                        return n == null
                          ? ["Belum ada data", "rata-rata"]
                          : [`${n} ms`, "rata-rata"];
                      }}
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        color: "var(--color-text)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgMs"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      fill="url(#msFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold text-foreground">Pengaturan</h2>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-3 sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                saveSettings.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (menit)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Gagal sebelum down</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  value={failThreshold}
                  onChange={(e) => setFailThreshold(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword (opsional)</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Login"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch id="ssl" checked={checkSsl} onCheckedChange={setCheckSsl} />
                <Label htmlFor="ssl" className="cursor-pointer">
                  Cek sertifikat SSL
                </Label>
              </div>
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Simpan
              </Button>
            </form>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold text-foreground">
              Integrasi APM & error tracking
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan API key ini di SDK WebWatch untuk mengirim log dan error dari aplikasimu.
            </p>

            <div className="mt-4 space-y-4">
              {apiKeys.isPending ? (
                <Skeleton className="h-20 w-full rounded-lg" />
              ) : apiKeys.isError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="API key gagal dimuat"
                  description="Daftar API key tidak bisa diambil dari server."
                  onRetry={() => void apiKeys.refetch()}
                />
              ) : keys.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={KeyRound}
                  title="Belum ada API key"
                  description="Buat API key untuk mulai mengirim log error dari aplikasi kamu."
                />
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <li
                      key={k.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{k.name}</p>
                        <p className="mt-1 select-all break-all font-mono text-xs text-muted-foreground">
                          {k.key}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <time
                          className="text-xs text-muted-foreground tabular-nums"
                          dateTime={k.created_at}
                        >
                          {new Date(k.created_at).toLocaleDateString("id-ID")}
                        </time>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Cara pasang
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Cara memasang SDK</DialogTitle>
                              <DialogDescription>
                                API key <span className="font-mono">{k.name}</span>. Ganti contoh
                                domain dan key di bawah dengan milikmu.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-5 py-2">
                              <div>
                                <h3 className="mb-2 text-sm font-semibold text-foreground">
                                  1. Frontend (browser / React / Vue / HTML)
                                </h3>
                                <p className="mb-2 text-xs text-muted-foreground">
                                  Letakkan di dalam tag <code>&lt;head&gt;</code> pada file
                                  index.html aplikasimu.
                                </p>
                                <CodeBlock
                                  file="index.html"
                                  code={`<script type="module">
  import { WebWatch } from "${origin}/api/public/sdk";

  WebWatch.init("${k.key}", "${origin}/api/ingest");
</script>`}
                                />
                              </div>
                              <div>
                                <h3 className="mb-2 text-sm font-semibold text-foreground">
                                  2. Backend (Node.js / Express)
                                </h3>
                                <p className="mb-2 text-xs text-muted-foreground">
                                  Letakkan paling bawah sebelum <code>app.listen</code>.
                                </p>
                                <CodeBlock
                                  file="server.js"
                                  code={`import { WebWatch } from "${origin}/api/public/sdk";

WebWatch.init("${k.key}", "${origin}/api/ingest");

app.use(WebWatch.expressErrorHandler());`}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" /> Buat API key baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Buat API key baru</DialogTitle>
                    <DialogDescription>
                      Beri nama agar mudah dikenali, misalnya &ldquo;frontend produksi&rdquo;.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = keyName.trim();
                      if (!name) return;
                      createApiKey.mutate(name);
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Nama API key</Label>
                      <Input
                        id="key-name"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="Frontend produksi"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createApiKey.isPending || !keyName.trim()}>
                        {createApiKey.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Buat key
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold text-foreground">Log APM</h2>
            <div className="mt-4">
              {apmEvents.isPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : apmEvents.isError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="Log APM gagal dimuat"
                  description="Data exception tidak bisa diambil dari server."
                  onRetry={() => void apmEvents.refetch()}
                />
              ) : events.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={History}
                  title="Belum ada error tercatat"
                  description="Belum ada exception yang masuk dari SDK WebWatch pada situs ini."
                />
              ) : (
                <ul className="space-y-3">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isErrorEvent(ev.event_type) ? "danger" : "info"}>
                            {ev.event_type}
                          </Badge>
                          <Badge variant="neutral">{ev.environment}</Badge>
                        </div>
                        <time
                          className="text-xs text-muted-foreground tabular-nums"
                          dateTime={ev.created_at}
                        >
                          {formatDateTime(ev.created_at)}
                        </time>
                      </div>
                      <p className="text-sm font-medium text-foreground">{ev.message}</p>
                      {(ev.method || ev.url) && (
                        <p className="break-all font-mono text-xs text-muted-foreground">
                          {[ev.method, ev.url].filter(Boolean).join(" ")}
                        </p>
                      )}
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

          <section className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-foreground">Insiden</h2>
              <Badge variant="neutral">{incidents.length} total</Badge>
            </div>
            <div className="mt-4">
              {incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada insiden tercatat.</p>
              ) : (
                <ul className="space-y-3">
                  {incidents.map((incident) => (
                    <li
                      key={incident.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Badge variant={incident.resolved_at ? "success" : "danger"}>
                          {incident.resolved_at ? "Selesai" : "Berlangsung"}
                        </Badge>
                        <time
                          className="text-xs text-foreground tabular-nums"
                          dateTime={incident.started_at}
                        >
                          {formatDateTime(incident.started_at)}
                        </time>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {incident.resolved_at
                          ? `berlangsung ${duration(
                              new Date(incident.resolved_at).getTime() -
                                new Date(incident.started_at).getTime(),
                            )}`
                          : "masih berlangsung"}
                      </div>
                      {incident.error_message && (
                        <p className="w-full truncate text-xs text-muted-foreground">
                          {incident.error_message}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-foreground">
                Riwayat pengecekan
              </h2>
              <Badge variant="neutral">50 terakhir</Badge>
            </div>
            <div className="mt-4">
              {recentLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada pengecekan.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Hasil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Respons</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLog.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                          <time dateTime={check.checked_at}>
                            {formatDateTime(check.checked_at)}
                          </time>
                        </TableCell>
                        <TableCell>
                          <Badge variant={check.is_up ? "success" : "danger"}>
                            {check.is_up ? "Berhasil" : "Gagal"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {check.status_code ?? "Tidak ada"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {check.response_time_ms != null
                            ? `${check.response_time_ms} ms`
                            : "Tidak ada"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {check.error_message ?? "Tidak ada"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
