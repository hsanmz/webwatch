import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request gagal (${res.status})`);
  return data;
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

  const createApiKey = useMutation({
    mutationFn: async (name: string) =>
      api<{ ok: boolean; key: string }>("/api/sites/keys", {
        method: "POST",
        body: JSON.stringify({ siteId: id, name }),
      }),
    onSuccess: () => {
      toast.success("API Key berhasil dibuat");
      queryClient.invalidateQueries({ queryKey: ["site-keys", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [failThreshold, setFailThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);

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
      uptime: inWindow.length ? ((up / inWindow.length) * 100).toFixed(2) : "—",
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> kembali ke dashboard
      </Link>

      {detail.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {!detail.isLoading && !site && (
        <p className="text-sm text-muted-foreground">Situs tidak ditemukan.</p>
      )}

      {site && (
        <>
          <header>
            <h1 className="font-display text-2xl font-bold">{site.name || site.url}</h1>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{site.url}</p>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5">
              <p className="font-mono text-xs text-muted-foreground">Status</p>
              <p className="mt-2 font-display text-xl font-semibold">
                {!site.is_active ? "Paused" : site.current_status.toUpperCase()}
              </p>
            </div>
            {Object.entries(windows).map(([label, stats]) => (
              <div key={label} className="panel p-5">
                <p className="font-mono text-xs text-muted-foreground">Uptime {label}</p>
                <p className="mt-2 font-display text-xl font-semibold">{stats.uptime}%</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {stats.avgMs != null ? `rata-rata ${stats.avgMs} ms` : "belum ada data"}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="panel p-5">
              <h2 className="font-display text-base font-semibold">Uptime harian (30 hari)</h2>
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      fontSize={10}
                      stroke="var(--muted-foreground)"
                      tick={{ fill: "var(--muted-foreground)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      fontSize={10}
                      stroke="var(--muted-foreground)"
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : undefined;
                        return n == null ? ["—", "uptime"] : [`${n.toFixed(1)}%`, "uptime"];
                      }}
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="uptime"
                      fill="var(--primary)"
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="font-display text-base font-semibold">Response time (30 hari)</h2>
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="msFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      fontSize={10}
                      stroke="var(--muted-foreground)"
                      tick={{ fill: "var(--muted-foreground)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      fontSize={10}
                      stroke="var(--muted-foreground)"
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : undefined;
                        return n == null ? ["—", "rata-rata"] : [`${n} ms`, "rata-rata"];
                      }}
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgMs"
                      stroke="var(--primary)"
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
            <h2 className="font-display text-base font-semibold">Pengaturan</h2>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_1fr] sm:items-end"
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
                {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Simpan
              </Button>
            </form>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold">Integrasi APM & Error Tracking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan API Key ini di SDK WebWatch untuk mengirim log dan error dari aplikasimu.
            </p>
            <div className="mt-4 space-y-4">
              <ul className="space-y-3">
                {apiKeys.data?.keys.length === 0 && (
                  <li className="text-sm text-muted-foreground">Belum ada API Key.</li>
                )}
                {apiKeys.data?.keys.map((k) => (
                  <li
                    key={k.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{k.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground select-all">
                        {k.key}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => {
                  const name = prompt("Nama API Key:");
                  if (name) createApiKey.mutate(name);
                }}
                disabled={createApiKey.isPending}
              >
                {createApiKey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat API Key Baru
              </Button>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold">APM & Error Logs</h2>
            <div className="mt-4">
              <ul className="space-y-3">
                {apmEvents.isLoading && (
                  <li className="text-sm text-muted-foreground">Memuat...</li>
                )}
                {apmEvents.data?.events.length === 0 && (
                  <li className="text-sm text-muted-foreground">Belum ada error atau log.</li>
                )}
                {apmEvents.data?.events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${ev.event_type.includes("error") ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"}`}
                        >
                          {ev.event_type}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {ev.environment}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{ev.message}</p>
                    {(ev.method || ev.url) && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {ev.method} {ev.url}
                      </p>
                    )}
                    {ev.stack_trace && (
                      <pre className="mt-2 w-full overflow-x-auto rounded-md bg-muted p-2 font-mono text-[10px] text-muted-foreground">
                        {ev.stack_trace}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold">Insiden</h2>
            <ul className="mt-4 space-y-3">
              {detail.data?.incidents.length === 0 && (
                <li className="text-sm text-muted-foreground">Belum ada insiden 🎉</li>
              )}
              {detail.data?.incidents.map((incident) => (
                <li key={incident.id} className="font-mono text-xs text-muted-foreground">
                  <span className="text-foreground">
                    {new Date(incident.started_at).toLocaleString()}
                  </span>{" "}
                  ·{" "}
                  {incident.resolved_at
                    ? duration(
                        new Date(incident.resolved_at).getTime() -
                          new Date(incident.started_at).getTime(),
                      )
                    : "masih berlangsung"}
                  {incident.error_message ? ` · ${incident.error_message}` : ""}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5">
            <h2 className="font-display text-base font-semibold">
              Riwayat pengecekan (50 terakhir)
            </h2>
            <ul className="mt-4 space-y-2">
              {recentLog.length === 0 && (
                <li className="text-sm text-muted-foreground">Belum ada pengecekan.</li>
              )}
              {recentLog.map((check) => (
                <li
                  key={check.id}
                  className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${check.is_up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
                  />
                  <span className="text-foreground">
                    {new Date(check.checked_at).toLocaleString()}
                  </span>
                  <span>{check.status_code ?? "—"}</span>
                  <span>{check.response_time_ms ?? "—"} ms</span>
                  {check.error_message && <span>{check.error_message}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
