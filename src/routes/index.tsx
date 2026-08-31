import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Clock,
  KeyRound,
  Lock,
  MessageSquare,
  Rocket,
  Rows3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBoard } from "@/components/marketing/status-board";

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
          "Monitoring uptime otomatis dengan keyword check, cek SSL, riwayat insiden 30 hari, dan alert Telegram real-time.",
      },
    ],
  }),
  component: Landing,
});

const WORDMARK = (
  <>
    <span className="text-primary">Web</span>
    <span className="text-foreground">Watch</span>
  </>
);

const NAV = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#harga", label: "Harga" },
];

const STATS = [
  { value: "1 mnt", label: "interval pengecekan" },
  { value: "≤ 10 dtk", label: "batas timeout" },
  { value: "10 mnt", label: "cooldown anti-spam" },
  { value: "30 hari", label: "riwayat uptime & insiden" },
];

const STEPS = [
  {
    icon: Rocket,
    title: "Buat akun",
    body: "Daftar gratis lewat email atau Google. Butuh satu menit, tanpa kartu kredit.",
  },
  {
    icon: MessageSquare,
    title: "Hubungkan Telegram",
    body: "Buka bot WebWatch di Telegram, tekan /start, lalu salin token ke dashboard.",
  },
  {
    icon: Rows3,
    title: "Tambah situs",
    body: "Isi nama + URL. Detik berikutnya situs kamu dipantau, alert langsung dikirim ke Telegram.",
  },
];

const FEATURES = [
  {
    icon: Bell,
    title: "Alert Telegram instan",
    body: "Notifikasi DOWN dan RECOVERED langsung ke chat kamu, lengkap dengan durasi downtime dan penyebab terjadinya.",
  },
  {
    icon: ShieldCheck,
    title: "Anti false alarm",
    body: "Threshold kegagalan berturut-turut plus cooldown 10 menit. Inbox kamu tetap tenang, kamu tidak kelelahan karena alert palsu.",
  },
  {
    icon: Clock,
    title: "Cek berkala otomatis",
    body: "Interval mulai 1 menit dengan timeout 10 detik, bekerja terus-menerus tanpa kamu disuruh-suruh.",
  },
  {
    icon: KeyRound,
    title: "Keyword check",
    body: "Tentukan kata kunci yang wajib ada di halaman. Halaman 'terbuka' tapi isinya rusak? Tetap ketahuan.",
  },
  {
    icon: Lock,
    title: "Cek SSL & masa berlaku",
    body: "Sertifikat mendekati habis, atau sudah kadaluarsa? WebWatch mengingatkan sebelum pengunjung melihat layar merah.",
  },
  {
    icon: BarChart3,
    title: "Riwayat & grafik 30 hari",
    body: "Uptime 24 jam, 7 hari, dan 30 hari plus grafik response time — biar jelas apa yang sebenarnya terjadi.",
  },
];

const AUDIENCE = [
  {
    title: "Developer & pelaku startup",
    body: "Jangan biarkan pengguna pertama kamu nemu halaman error duluan di tengah malam.",
  },
  {
    title: "UMKM, toko online & landing page",
    body: "Bisnis tergerus tiap menit website kamu offline. Alert telegram = kerusakan langsung ketahuan.",
  },
  {
    title: "Agency & pemilik banyak situs",
    body: "Kelola banyak situs dari satu dashboard, laporan uptime siap jadi bukti ke klien.",
  },
];

function Landing() {
  return (
    <div
      className="marketing min-h-screen"
      style={{
        backgroundImage: `radial-gradient(55rem 40rem at 85% -10%, oklch(0.72 0.12 178 / 0.16), transparent 60%),
          radial-gradient(40rem 30rem at -10% 35%, oklch(0.72 0.12 178 / 0.12), transparent 55%)`,
      }}
    >
      <div className="bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.25em]">
          <Zap className="h-3.5 w-3.5" />
          Gratis selama masa beta — tanpa kartu kredit
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="WebWatch" className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Mulai gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              uptime monitor + tkln bot
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
              Website kamu down? <span className="text-gradient">Kamu tahu duluan.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Kami memantau situs kamu tiap menit dan kirim alert Telegram begitu ada gangguan —
              juga kabar baik saat semuanya pulih kembali. Tenang, riwayat 30 hari tersimpan rapi.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Mulai gratis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/dashboard">Lihat contoh dashboard</Link>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" />
              langsung jalan · tanpa kartu kredit · batalkan kapan saja
            </p>
          </div>

          <div className="relative">
            <StatusBoard />
            <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              contoh notifikasi · dipantau tiap 1 menit
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid grid-cols-2 gap-y-8 rounded-2xl border border-border bg-card px-6 py-8 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cara-kerja" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">cara kerja</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-foreground">
              Dari nol sampai terpantau, cuma 3 langkah
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <article key={step.title} className="panel p-6">
                  <div className="flex items-center justify-between">
                    <step.icon className="h-5 w-5 text-primary" />
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="fitur" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">fitur</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-foreground">
              Cukup, tanpa gimmick. Semua yang dibutuhkan.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="panel p-6">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-display text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">untuk siapa</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-foreground">
              Siapa pun yang punya website, kami jaga.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {AUDIENCE.map((item) => (
                <div key={item.title} className="panel p-6">
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="harga">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-primary">
              harga
            </p>
            <h2 className="mt-3 text-center font-display text-3xl font-bold tracking-tight text-foreground">
              Gratis selama beta.
            </h2>
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold">Free Plan</h3>
                <p className="font-display text-2xl font-bold text-foreground">
                  Rp0<span className="text-sm font-normal text-muted-foreground">/bulan</span>
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Untuk developer & pemilik website yang butuh jaga-jaga.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Jumlah situs tanpa batas*",
                  "Interval pengecekan mulai 1 menit",
                  "Alert Telegram real-time",
                  "Cek SSL & masa berlaku sertifikat",
                  "Riwayat uptime 30 hari + grafik",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8 w-full">
                <Link to="/auth">Buat akun gratis</Link>
              </Button>
              <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
                *ketentuan bisa berubah setelah masa beta berakhir
              </p>
            </div>
          </div>
        </section>

        <section className="bg-foreground text-background">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Berhenti tahu belakangan. Mulai pantau sekarang.
            </h2>
            <p className="max-w-xl text-sm text-background/70">
              Daftar gratis, hubungkan Telegram, tambah situs — seluruhnya di bawah 5 menit.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/auth">
                Mulai gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between">
          <p className="font-display text-lg font-bold">{WORDMARK}</p>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Masuk
            </Link>
            <Link to="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <span className="font-mono text-xs">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
