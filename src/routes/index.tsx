import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bell, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WebWatch — Monitor Uptime Website + Alert Telegram" },
      {
        name: "description",
        content:
          "Pantau website kamu tiap menit. WebWatch kirim notifikasi Telegram instan saat situs down dan saat sudah pulih kembali.",
      },
      { property: "og:title", content: "WebWatch — Monitor Uptime Website + Alert Telegram" },
      {
        property: "og:description",
        content:
          "Monitoring uptime otomatis dengan keyword check, riwayat insiden 30 hari, dan alert Telegram real-time.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Clock,
    title: "Cek berkala otomatis",
    body: "Interval mulai 1 menit, timeout 10 detik, plus keyword check untuk deteksi halaman rusak walau status 200.",
  },
  {
    icon: Bell,
    title: "Alert Telegram instan",
    body: "Notifikasi DOWN dan RECOVERED langsung ke chat kamu, lengkap dengan durasi downtime dan penyebabnya.",
  },
  {
    icon: ShieldCheck,
    title: "Anti false alarm",
    body: "Threshold kegagalan berturut-turut dan cooldown 10 menit menjaga inbox kamu tetap tenang.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-5 w-5" />
            <span className="font-display text-lg font-bold">WebWatch</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Masuk</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">uptime monitor</p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Tahu duluan saat website kamu down.
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            WebWatch memantau situs kamu tiap menit dan mengirim alert Telegram begitu terjadi
            gangguan — juga saat semuanya kembali normal.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Mulai gratis</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/dashboard">Buka dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-24 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="panel p-6">
              <feature.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-display text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 font-mono text-xs text-muted-foreground">
          WebWatch · uptime monitoring dengan notifikasi Telegram
        </div>
      </footer>
    </div>
  );
}
