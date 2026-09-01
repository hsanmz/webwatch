import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Server,
  Loader2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// --- ROUTE SETUP ---
export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "System Status — WebWatch" },
      { name: "description", content: "Real-time system status for WebWatch services." },
    ],
  }),
  component: StatusPage,
});

// --- TYPES ---
type ComponentStatus = {
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  description: string;
};

type StatusResponse = {
  status: "operational" | "degraded" | "outage";
  components: ComponentStatus[];
  metrics: {
    totalSites: number;
    apmEvents24h: number;
    checks24h: number;
  };
  error?: string;
};

// --- MODULAR UI COMPONENTS ---

const StatusHero = () => (
  <div className="text-center py-16 md:py-24 relative">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background blur-3xl opacity-50" />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-6 border border-primary/20">
        <ShieldCheck className="h-4 w-4" /> Transparansi Real-time
      </span>
      <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight mb-6">
        Status Sistem <span className="text-primary">WebWatch</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Pantau operasional infrastruktur kami secara real-time. Kami berkomitmen memberikan uptime
        terbaik untuk pemantauan situs Anda.
      </p>
    </motion.div>
  </div>
);

const GlobalStatusBanner = ({
  status,
  error,
}: {
  status: StatusResponse["status"];
  error?: string;
}) => {
  const isOperational = status === "operational";
  const isDegraded = status === "degraded";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className={`relative overflow-hidden rounded-3xl p-8 md:p-12 mb-16 border shadow-2xl transition-all duration-500
        ${isOperational ? "border-emerald-500/30 shadow-emerald-500/10 bg-gradient-to-br from-emerald-500/10 via-background to-background" : ""}
        ${isDegraded ? "border-yellow-500/30 shadow-yellow-500/10 bg-gradient-to-br from-yellow-500/10 via-background to-background" : ""}
        ${status === "outage" ? "border-red-500/30 shadow-red-500/10 bg-gradient-to-br from-red-500/10 via-background to-background" : ""}
      `}
    >
      <div
        className={`absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full opacity-20 blur-3xl
        ${isOperational ? "bg-emerald-500" : isDegraded ? "bg-yellow-500" : "bg-red-500"}
      `}
      />

      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
        <div
          className={`flex items-center justify-center h-20 w-20 md:h-24 md:w-24 rounded-full border-4 shrink-0
          ${isOperational ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-500" : ""}
          ${isDegraded ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-500" : ""}
          ${status === "outage" ? "border-red-500/30 bg-red-500/20 text-red-500" : ""}
        `}
        >
          {isOperational ? (
            <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12" />
          ) : (
            <AlertTriangle className="h-10 w-10 md:h-12 md:w-12" />
          )}
        </div>

        <div className="text-center md:text-left flex-1">
          <h2
            className={`text-3xl md:text-4xl font-display font-bold mb-3 tracking-tight
            ${isOperational ? "text-emerald-500" : isDegraded ? "text-yellow-500" : "text-red-500"}
          `}
          >
            {isOperational && "Semua Sistem Beroperasi Normal"}
            {isDegraded && "Sebagian Layanan Mengalami Kendala"}
            {status === "outage" && "Gangguan Sistem Mayor"}
          </h2>
          <p className="text-lg text-foreground/80 font-medium">
            {isOperational
              ? "Infrastruktur WebWatch berjalan mulus tanpa hambatan."
              : error || "Teknisi kami sedang menangani kendala pada infrastruktur core WebWatch."}
          </p>
        </div>

        <div className="shrink-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-full px-5 py-2.5 border border-border/50 text-sm font-mono text-muted-foreground shadow-sm">
          <span className="relative flex h-2.5 w-2.5 mr-3">
            {isOperational && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOperational ? "bg-emerald-500" : isDegraded ? "bg-yellow-500" : "bg-red-500"}`}
            ></span>
          </span>
          Live Update
        </div>
      </div>
    </motion.div>
  );
};

const ComponentStatusList = ({ components }: { components: ComponentStatus[] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="mb-20"
  >
    <div className="flex items-center gap-3 mb-8">
      <Server className="h-6 w-6 text-primary" />
      <h3 className="font-display font-bold text-2xl">Status Komponen Core</h3>
    </div>

    <div className="grid grid-cols-1 bg-card border border-border rounded-3xl overflow-hidden shadow-sm divide-y divide-border">
      {components.map((comp) => (
        <div
          key={comp.name}
          className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/20 transition-colors duration-300"
        >
          <div className="flex-1">
            <h4 className="font-bold text-foreground text-xl mb-1.5 tracking-tight">{comp.name}</h4>
            <p className="text-muted-foreground">{comp.description}</p>
          </div>
          <div className="flex items-center gap-3 bg-background/50 border border-border rounded-full px-5 py-2.5 shadow-sm shrink-0">
            {comp.status === "operational" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-semibold text-emerald-500">Operational</span>
              </>
            )}
            {comp.status === "outage" && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-500">Outage</span>
              </>
            )}
            {(comp.status === "degraded" || comp.status === "unknown") && (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-yellow-500">Degraded</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const PlatformMetrics = ({ metrics }: { metrics: StatusResponse["metrics"] }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="mb-24"
  >
    <div className="flex items-center gap-3 mb-8">
      <Activity className="h-6 w-6 text-primary" />
      <h3 className="font-display font-bold text-2xl">Skala Platform (24 Jam)</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        {
          name: "Situs Dipantau Aktif",
          value: metrics.totalSites,
          tag: "Kapasitas Server",
          glow: "from-blue-500/20",
        },
        {
          name: "Ping Dieksekusi",
          value: metrics.checks24h.toLocaleString("id-ID"),
          tag: "Monitoring Engine",
          glow: "from-emerald-500/20",
        },
        {
          name: "Log APM Diterima",
          value: metrics.apmEvents24h.toLocaleString("id-ID"),
          tag: "Ingestion API",
          glow: "from-purple-500/20",
        },
      ].map((metric) => (
        <div
          key={metric.name}
          className="relative overflow-hidden bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div
            className={`absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl ${metric.glow} to-transparent opacity-50 rounded-bl-full`}
          />
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 relative z-10">
            {metric.tag}
          </p>
          <div className="flex items-end gap-3 mb-3 relative z-10">
            <span className="text-4xl md:text-5xl font-mono font-bold tracking-tighter text-foreground">
              {metric.value}
            </span>
          </div>
          <h4 className="font-medium text-foreground/80 relative z-10">{metric.name}</h4>
        </div>
      ))}
    </div>
  </motion.div>
);

const StatusCTA = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4 }}
    className="relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-10 md:p-16 text-center shadow-2xl"
  >
    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-white/10 to-transparent opacity-20" />

    <div className="relative z-10 flex flex-col items-center">
      <Zap className="h-12 w-12 text-primary-foreground/80 mb-6" />
      <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 tracking-tight">
        Pastikan Web Anda Selalu Online
      </h2>
      <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
        WebWatch dipercaya memantau ribuan pengecekan setiap harinya. Dapatkan notifikasi instan via
        Telegram saat web Anda down.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          variant="secondary"
          className="font-bold text-primary rounded-full px-8 h-14 text-lg hover:scale-105 transition-transform"
          asChild
        >
          <Link to="/auth">
            Mulai Pantau Gratis <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  </motion.div>
);

// --- MAIN PAGE COMPONENT ---
function StatusPage() {
  const { data, isLoading, isError } = useQuery<StatusResponse>({
    queryKey: ["system-status"],
    queryFn: async () => {
      const res = await fetch("/api/system-status");
      if (!res.ok) throw new Error("Failed to fetch status");
      return res.json();
    },
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-base font-bold transition-transform hover:scale-105"
          >
            <img src="/logo.png" alt="WebWatch" className="h-7 w-auto" />
            <span className="text-foreground tracking-tight">
              Web<span className="text-primary">Watch</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link to="/docs">
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <StatusHero />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground">
              Memuat Metrik Real-time...
            </p>
          </div>
        ) : isError ? (
          <div className="rounded-3xl border-2 border-red-500/20 bg-red-500/5 p-12 text-center text-red-500">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 opacity-80" />
            <h2 className="font-display text-3xl font-bold mb-3">Koneksi Terputus</h2>
            <p className="text-lg">
              Sistem tidak dapat terhubung ke server utama WebWatch saat ini.
            </p>
          </div>
        ) : data ? (
          <>
            <GlobalStatusBanner status={data.status} error={data.error} />
            <ComponentStatusList components={data.components} />
            <PlatformMetrics metrics={data.metrics} />
            <StatusCTA />
          </>
        ) : null}
      </main>
    </div>
  );
}
