import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft, Activity, Info, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — WebWatch" },
      { name: "description", content: "Real-time system status for WebWatch services." },
    ],
  }),
  component: StatusPage,
});

const STATUS_BG = {
  operational: "bg-emerald-500",
  degraded: "bg-yellow-500",
  outage: "bg-red-500",
  unknown: "bg-muted"
};

type StatusResponse = {
  status: "operational" | "degraded" | "outage";
  metrics: {
    totalSites: number;
    apmEvents24h: number;
    checks24h: number;
  };
  history: Array<{
    day: string;
    up_checks: number;
    total_checks: number;
  }>;
  incidents: Array<{
    started_at: string;
    resolved_at: string | null;
    error_message: string;
    site_name: string;
  }>;
  error?: string;
};

const getHistoryBars = (realHistory: StatusResponse['history']) => {
  const bars = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const realData = realHistory.find(h => h.day === dateStr);
    
    if (realData) {
      const uptimePct = realData.total_checks > 0 ? (realData.up_checks / realData.total_checks) * 100 : 100;
      bars.push({
        date: dateStr,
        status: uptimePct >= 99 ? 'operational' : (uptimePct >= 95 ? 'degraded' : 'outage'),
        pct: uptimePct.toFixed(2)
      });
    } else {
      bars.push({
        date: dateStr,
        status: 'operational',
        pct: "100.00"
      });
    }
  }
  return bars;
};

function StatusPage() {
  const { data, isLoading, isError } = useQuery<StatusResponse>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const res = await fetch('/api/system-status');
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 60000
  });

  const bars = getHistoryBars(data?.history || []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-sm font-semibold transition-transform hover:scale-105"
          >
            <img src="/logo.png" alt="WebWatch" className="h-7 w-auto" />
            <span className="text-foreground">Status</span>
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Docs
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-500">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Gagal Memuat Status</h1>
            <p>Sistem tidak dapat terhubung ke database WebWatch.</p>
          </div>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className={`rounded-2xl border p-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]
                ${data?.status === 'operational' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}
              `}>
                <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0
                  ${data?.status === 'operational' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}
                `}>
                  {data?.status === 'operational' ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
                </div>
                <div className="text-center md:text-left">
                  <h1 className={`font-display text-3xl font-bold mb-2 ${data?.status === 'operational' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {data?.status === 'operational' ? 'Semua Sistem Normal' : 'Gangguan Sistem Terdeteksi'}
                  </h1>
                  <p className={`font-medium ${data?.status === 'operational' ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                    {data?.status === 'operational' 
                      ? `Layanan WebWatch beroperasi dengan ${data?.metrics.totalSites} situs aktif terpantau.`
                      : data?.error || 'Sistem gagal terhubung ke database atau edge workers sedang down.'}
                  </p>
                </div>
                <div className={`md:ml-auto mt-4 md:mt-0 text-sm font-mono px-4 py-2 rounded-full
                  ${data?.status === 'operational' ? 'text-emerald-500/60 bg-emerald-500/10' : 'text-red-500/60 bg-red-500/10'}
                `}>
                  Diperbarui: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl overflow-hidden mb-16 shadow-sm"
            >
              <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-3">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-display font-bold text-lg">Metrik Platform Global (24 Jam Terakhir)</h2>
              </div>
              <div className="divide-y divide-border">
                {[
                  { name: "Situs Dipantau (Total)", value: data?.metrics.totalSites, tag: "Database" },
                  { name: "Uptime Pings (HTTP Checks)", value: data?.metrics.checks24h.toLocaleString('id-ID'), tag: "Edge Workers" },
                  { name: "APM Error Log Diterima", value: data?.metrics.apmEvents24h.toLocaleString('id-ID'), tag: "Ingestion API" },
                ].map((metric) => (
                  <div key={metric.name} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/10">
                    <div>
                      <h3 className="font-semibold text-foreground">{metric.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Sistem: {metric.tag}</p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono font-bold">{metric.value}</span>
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Live
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-16"
            >
              <h2 className="font-display font-bold text-2xl mb-6">Uptime Keseluruhan (30 Hari)</h2>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-end justify-between h-16 gap-1 w-full group">
                  {bars.map((bar, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-sm transition-all duration-300 hover:opacity-80 ${STATUS_BG[bar.status as keyof typeof STATUS_BG]}`}
                      style={{ height: bar.pct === '100.00' ? '100%' : '60%' }}
                      title={`${bar.date}: ${bar.pct}% Uptime`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs font-mono text-muted-foreground mt-4 pt-4 border-t border-border">
                  <span>30 hari lalu</span>
                  <span>Real Database Agregasi</span>
                  <span>Hari ini</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="font-display font-bold text-2xl mb-8">Log Insiden WebWatch Global</h2>
              <div className="space-y-8">
                {!data?.incidents || data.incidents.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                    Tidak ada insiden tercatat di database saat ini.
                  </div>
                ) : (
                  data.incidents.map((incident, i) => (
                    <div key={i} className="relative pl-8 md:pl-0">
                      <div className="hidden md:block absolute left-48 top-2 bottom-[-2rem] w-px bg-border last:bg-transparent" />
                      
                      <div className="md:flex gap-12 relative">
                        <div className="hidden md:block w-36 shrink-0 pt-1 text-right">
                          <span className="text-sm font-mono text-muted-foreground">
                            {new Date(incident.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })}
                          </span>
                        </div>
                        <div className="absolute left-[-2rem] top-2 md:static md:w-3 md:h-3 md:mt-2.5 rounded-full bg-primary/20 border-2 border-primary shrink-0 z-10" />
                        <div className="flex-1 bg-card border border-border p-6 rounded-2xl shadow-sm mb-4">
                          <div className="md:hidden text-xs font-mono text-muted-foreground mb-3">
                            {new Date(incident.started_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <h3 className="font-bold text-lg">{incident.site_name}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                              ${incident.resolved_at ? 'bg-muted text-muted-foreground' : 'bg-red-500/10 text-red-500'}`}>
                              {incident.resolved_at ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                              {incident.resolved_at ? 'Resolved' : 'Active'}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-sm">
                            {incident.error_message || "Downtime detected without specific error message."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </main>
      <footer className="mt-auto border-t border-border bg-background py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
          <p>Terhubung langsung ke database produksi WebWatch (Real-time).</p>
        </div>
      </footer>
    </div>
  );
}
