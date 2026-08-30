import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sites/$id")({
  component: SiteDetail,
});

function duration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} jam ${minutes % 60} menit` : `${minutes} menit`;
}

function SiteDetail() {
  const { id } = Route.useParams();

  const site = useQuery({
    queryKey: ["site", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id,name,url,current_status,is_active,interval_seconds,check_keyword,fail_threshold")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const checks = useQuery({
    queryKey: ["checks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checks")
        .select("id,is_up,status_code,response_time_ms,error_message,checked_at")
        .eq("site_id", id)
        .gte("checked_at", since)
        .order("checked_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
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

  const total = checks.data?.length ?? 0;
  const up = checks.data?.filter((c) => c.is_up).length ?? 0;
  const uptime = total ? ((up / total) * 100).toFixed(2) : "—";
  const avg = total
    ? Math.round(
        checks.data!.reduce((sum, c) => sum + (c.response_time_ms ?? 0), 0) / total,
      )
    : null;

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
            <div className="panel p-5">
              <p className="font-mono text-xs text-muted-foreground">Uptime (50 cek terakhir)</p>
              <p className="mt-2 font-display text-xl font-semibold">{uptime}%</p>
            </div>
            <div className="panel p-5">
              <p className="font-mono text-xs text-muted-foreground">Rata-rata respons</p>
              <p className="mt-2 font-display text-xl font-semibold">{avg != null ? `${avg} ms` : "—"}</p>
            </div>
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
            <h2 className="font-display text-base font-semibold">Riwayat pengecekan</h2>
            <ul className="mt-4 space-y-2">
              {checks.data?.length === 0 && (
                <li className="text-sm text-muted-foreground">Belum ada pengecekan.</li>
              )}
              {checks.data?.map((check) => (
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
