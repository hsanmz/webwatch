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

import { supabase } from "@/integrations/supabase/client";
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

type CheckRow = {
  id: string;
  is_up: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
};

function SiteDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const site = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select(
          "id,name,url,current_status,is_active,interval_seconds,fail_threshold,check_keyword,check_ssl",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const checks = useQuery({
    queryKey: ["checks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checks")
        .select("id,is_up,status_code,response_time_ms,error_message,checked_at")
        .eq("site_id", id)
        .gte("checked_at", since)
        .order("checked_at", { ascending: true });
      if (error) throw error;
      return data as CheckRow[];
    },
  });

  const incidents = useQuery({
    queryKey: ["incidents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("id,started_at,resolved_at,error_message")
        .eq("site_id", id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [failThreshold, setFailThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);

  useEffect(() => {
    if (!site.data) return;
    setIntervalMinutes(String(Math.max(1, Math.round(site.data.interval_seconds / 60))));
    setFailThreshold(String(site.data.fail_threshold));
    setKeyword(site.data.check_keyword ?? "");
    setCheckSsl(site.data.check_ssl);
  }, [site.data]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sites")
        .update({
          interval_seconds: Math.max(1, Number(intervalMinutes) || 5) * 60,
          fail_threshold: Math.max(1, Number(failThreshold) || 2),
          check_keyword: keyword.trim() || null,
          check_ssl: checkSsl,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      queryClient.invalidateQueries({ queryKey: ["site", id] });
      queryClient.invalidateQueries({ queryKey: ["checks", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const all = checks.data ?? [];
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

      {site.isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {!site.isLoading && !site.data && (
        <p className="text-sm text-muted-foreground">Situs tidak ditemukan.</p>
      )}

      {site.data && (
        <>
          <header>
            <h1 className="font-display text-2xl font-bold">{site.data.name || site.data.url}</h1>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{site.data.url}</p>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5">
              <p className="font-mono text-xs text-muted-foreground">Status</p>
              <p className="mt-2 font-display text-xl font-semibold">
                {!site.data.is_active ? "Paused" : site.data.current_status.toUpperCase()}
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
                    <Bar dataKey="uptime" fill="var(--primary)" radius={[3, 3, 0, 0]} />
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
            <h2 className="font-display text-base font-semibold">Insiden</h2>
            <ul className="mt-4 space-y-3">
              {incidents.data?.length === 0 && (
                <li className="text-sm text-muted-foreground">Belum ada insiden 🎉</li>
              )}
              {incidents.data?.map((incident) => (
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
