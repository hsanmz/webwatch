import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLockup } from "@/components/app/brand";
import { SystemStatusBadge, resolveSystemStatus } from "@/components/app/status-badge";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status Sistem WebWatch" },
      { name: "description", content: "Status operasional layanan WebWatch." },
    ],
  }),
  component: StatusPage,
});

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

const METRICS: { key: keyof StatusResponse["metrics"]; label: string; hint: string }[] = [
  { key: "totalSites", label: "Situs dipantau", hint: "total situs terdaftar" },
  { key: "checks24h", label: "Pengecekan dijalankan", hint: "dalam 24 jam terakhir" },
  { key: "apmEvents24h", label: "Event APM diterima", hint: "dalam 24 jam terakhir" },
];

function StatusPage() {
  const { data, isPending, isError, refetch } = useQuery<StatusResponse>({
    queryKey: ["system-status"],
    queryFn: async () => {
      const res = await fetch("/api/system-status");
      if (!res.ok) throw new Error("Gagal mengambil status sistem");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const overall = resolveSystemStatus(data?.status);
  const components = data?.components ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="WebWatch, beranda">
            <BrandLockup className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/docs" className="transition-colors hover:text-foreground">
              Dokumentasi
            </Link>
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">Masuk</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-content flex-1 px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Status sistem WebWatch
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Halaman ini menampilkan kondisi edge, ingestion, dan cron yang dipakai untuk memantau
            situs kamu. Data diambil ulang tiap menit.
          </p>
        </div>

        <section
          aria-live="polite"
          className="panel mt-10 flex flex-wrap items-center justify-between gap-4 p-6"
        >
          <div>
            <p className="text-xs font-medium text-muted-foreground">Status keseluruhan</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{overall.label}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data?.error ?? "Tidak ada gangguan yang dilaporkan pada layanan kami."}
            </p>
          </div>
          <SystemStatusBadge status={data?.status} />
        </section>

        {isPending ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            className="mt-8"
            title="Status sistem gagal dimuat"
            description="Endpoint status tidak bisa dihubungi. Coba muat ulang."
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <section className="mt-12">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Komponen layanan
                </h2>
              </div>
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {components.map((component) => (
                  <li
                    key={component.name}
                    className="flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{component.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {component.description}
                      </p>
                    </div>
                    <SystemStatusBadge status={component.status} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Skala platform
                </h2>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {METRICS.map((metric) => (
                  <div key={metric.key} className="panel p-5">
                    <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                    <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                      {(data?.metrics[metric.key] ?? 0).toLocaleString("id-ID")}
                    </dd>
                    <p className="mt-1.5 text-xs text-muted-foreground">{metric.hint}</p>
                  </div>
                ))}
              </dl>
            </section>

            <section className="panel mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Pantau situsmu sendiri
                </h2>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  WebWatch mengirim alert ke Telegram saat status situs berubah, jadi kamu tidak
                  perlu membuka halaman ini untuk tahu.
                </p>
              </div>
              <Button asChild>
                <Link to="/auth">
                  Mulai pantau
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <p>© 2026 WebWatch</p>
          <Link to="/" className="transition-colors hover:text-foreground">
            Kembali ke beranda
          </Link>
        </div>
      </footer>
    </div>
  );
}
