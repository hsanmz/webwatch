import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Flame,
  History,
  MessageSquare,
  Radar,
  Rocket,
  Rows3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBoard } from "@/components/marketing/status-board";
import { TelegramAlerts } from "@/components/marketing/telegram-alerts";
import { BentoFeatures } from "@/components/marketing/bento-features";

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

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const NAV = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#faq", label: "FAQ" },
  { href: "#harga", label: "Harga" },
];

const STATS = [
  { icon: Radar, value: "1 mnt", label: "interval pengecekan tiap situs" },
  { icon: Zap, value: "≤ 2 mnt", label: "notifikasi setelah status berubah" },
  { icon: ShieldCheck, value: "< 5%", label: "target false alarm yang diizinkan" },
  { icon: History, value: "30 hari", label: "riwayat uptime & insiden tersimpan" },
];

const STEPS = [
  {
    icon: Rocket,
    title: "Buat akun gratis",
    body: "Daftar aman lewat email. Satu menit selesai, sama sekali tanpa butuh kartu kredit.",
  },
  {
    icon: MessageSquare,
    title: "Hubungkan Telegram",
    body: "Buka bot WebWatch di Telegram, tekan /start, lalu salin token ke dashboard.",
  },
  {
    icon: Rows3,
    title: "Tambah situsmu",
    body: "Isi URL website kamu. Mulai detik berikutnya situsmu dipantau, alert langsung aktif.",
  },
];

const FAQS = [
  {
    q: "Seberapa cepat alert terkirim ke Telegram?",
    a: "Maksimal 2 menit sejak status situs berubah — biasanya jauh lebih cepat karena WebWatch mengecek tiap menit. Tak perlu menunggu menumpuk.",
  },
  {
    q: "Apakah ada biaya tersembunyi?",
    a: "100% Gratis selama masa beta, tanpa kartu kredit. Kalau pun nanti ada limitasi, kamu pasti akan diberitahu dari jauh-jauh hari sebelum berubah.",
  },
  {
    q: "Berapa banyak situs yang bisa saya pantau?",
    a: "Jumlahnya tidak dibatasi selama masa beta. Masing-masing situs bisa kamu atur intervalnya, mulai dari yang paling cepat (1 menit) hingga lebih lama.",
  },
  {
    q: "Bagaimana cara kerja bot Telegram-nya?",
    a: "Klik tombol Hubungkan di dashboard, buka bot WebWatch di Telegram dan kirim token unik yang disediakan. Bot akan mengunci sesi tersebut dan mengirim semua notifikasi langsung ke chat personalmu.",
  },
  {
    q: "Apakah data pemantauan saya aman?",
    a: "Data diisolasi secara ketat per akun (RLS) — pengguna lain tidak akan bisa melihat performa situs kamu. Riwayat juga diputar otomatis setiap 30 hari supaya tetap ringkas.",
  },
];

const TICKER = [
  { host: "tokoku.id", ms: "128 ms", up: true },
  { host: "api.tokoku.id", ms: "84 ms", up: true },
  { host: "blog.tokoku.id", ms: "timeout", up: false },
  { host: "checkout.tokoku.id", ms: "213 ms", up: true },
  { host: "cdn.tokoku.id", ms: "96 ms", up: true },
  { host: "staging.tokoku.id", ms: "1.1 s", up: true },
  { host: "bayar.tokoku.id", ms: "timeout", up: false },
  { host: "status.tokoku.id", ms: "54 ms", up: true },
];

function Landing() {
  useReveal();

  return (
    <div
      className="marketing min-h-screen"
      style={{
        backgroundImage: `radial-gradient(75rem 50rem at 50% 0%, oklch(0.72 0.12 178 / 0.15), transparent 70%)`,
      }}
    >
      <div className="bg-primary/10 border-b border-primary/20 text-primary">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.25em] font-semibold">
          <Zap className="h-3.5 w-3.5" />
          Gratis sepenuhnya selama masa beta — tanpa kartu kredit
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="WebWatch" className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
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
          <div className="flex items-center gap-3">
            <span className="mr-2 hidden items-center gap-2 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:flex">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
              Sistem Normal
            </span>
            <Button asChild size="sm" variant="ghost" className="font-semibold">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="shadow-md transition-transform hover:scale-105 font-semibold"
            >
              <Link to="/auth">Mulai Gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6 lg:px-8 lg:pt-32">
          <div className="absolute top-0 -z-10 h-full w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,oklch(0.58_0.12_178/0.12),transparent)] blur-3xl pointer-events-none" />

          <div
            className="rise flex flex-col items-center relative z-10"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="floaty inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/50 backdrop-blur px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-primary shadow-sm mb-4">
              <span className="live-dot h-2 w-2 rounded-full bg-primary" />
              Sistem Monitoring Aktif 24/7
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-[5rem] sm:leading-[1.05]">
              Website kamu down? <br className="hidden sm:block" />
              <span className="text-gradient">Kamu tahu duluan.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl font-medium">
              Pantau situs tiap menit. Dapatkan alert Telegram instan saat ada gangguan dan saat
              pulih kembali.{" "}
              <strong className="text-foreground font-semibold">
                Tanpa delay, tanpa false alarm.
              </strong>
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full px-10 text-lg font-bold shadow-glow transition-all hover:scale-105 hover:shadow-primary/30"
              >
                <Link to="/auth">
                  Mulai Gratis Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-8 text-base font-bold transition-all hover:bg-primary/5 hover:text-foreground"
              >
                <a href="#cara-kerja">
                  <Activity className="mr-2 h-4 w-4 text-primary" /> Lihat Cara Kerja
                </a>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              {[
                { text: "1 Menit Setup", icon: Zap },
                { text: "Tanpa Kartu Kredit", icon: ShieldCheck },
                { text: "Bot Telegram Siap Pakai", icon: MessageSquare },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.text}
                </span>
              ))}
            </div>
          </div>

          <div
            className="rise relative mx-auto mt-24 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-12 max-w-5xl"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-3xl opacity-70" />
            <div className="floaty w-full max-w-md lg:max-w-xl shrink-0">
              <StatusBoard />
            </div>
            <div className="hidden lg:block shrink-0 pt-4">
              <TelegramAlerts />
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="overflow-hidden border-y border-border bg-card/50 py-3">
          <div className="marquee-mask">
            <div className="ticker-track gap-10 px-10">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-12">
                  {TICKER.map((item) => (
                    <span
                      key={`${copy}-${item.host}`}
                      className="flex items-center gap-2 font-mono text-xs font-medium text-foreground/80"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${item.up ? "bg-teal-400" : "bg-red-400"}`}
                      />
                      {item.host}
                      <span className="opacity-50 text-foreground/50">{item.ms}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="panel reveal flex items-start gap-4 p-6 transition-all hover:border-primary/40 hover:shadow-glow"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-3xl font-extrabold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CARA KERJA */}
        <section id="cara-kerja" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="max-w-3xl text-center mx-auto">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-semibold">
                cara kerja
              </p>
              <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Tiga Langkah Mudah.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Tidak ada instalasi, tidak ada konfigurasi rumit, tidak ada kartu kredit. Langsung
                mulai dalam hitungan detik.
              </p>
            </div>
            <div className="relative mt-16 grid gap-8 md:grid-cols-3">
              <div
                className="absolute left-0 right-0 top-12 hidden border-t-2 border-dashed border-border/60 md:block"
                aria-hidden="true"
              />
              {STEPS.map((step, i) => (
                <article
                  key={step.title}
                  className="panel reveal relative p-8 text-center transition-transform hover:-translate-y-1"
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-4 ring-background">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <span className="absolute -top-3 right-6 font-mono text-5xl font-black text-muted-foreground/10">
                    0{i + 1}
                  </span>
                  <h3 className="mt-6 font-display text-xl font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FITUR BENTO */}
        <section id="fitur" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-semibold">
                Fitur Andalan
              </p>
              <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Semua yang kamu butuhkan.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Didesain khusus untuk menjawab satu pertanyaan penting:{" "}
                <span className="text-foreground font-medium">
                  Apakah situs saya baik-baik saja?
                </span>
              </p>
            </div>
            <div className="mt-16">
              <BentoFeatures />
            </div>
          </div>
        </section>

        {/* HARGA */}
        <section id="harga" className="border-t border-border relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] bg-[radial-gradient(circle_at_center,oklch(0.58_0.12_178/0.05),transparent_70%)] blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="text-center mx-auto max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary font-semibold">
                harga
              </p>
              <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Gratis selama beta.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-medium">
                Serius dibangun untuk dipakai, bukan sekadar masa percobaan.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-md rounded-[2rem] border border-primary/20 bg-card p-10 shadow-glow relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/20">
              <div className="absolute -top-12 -right-12 p-4 opacity-5 text-primary rotate-12 pointer-events-none transition-transform duration-700 hover:rotate-45">
                <Zap className="h-48 w-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-black text-foreground">Free Plan</h3>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
                      Akses Beta Terbuka
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-5xl font-black text-foreground text-gradient">
                      Rp0
                    </p>
                    <p className="text-sm font-bold text-muted-foreground mt-1">selamanya*</p>
                  </div>
                </div>
                <p className="mt-6 text-base text-muted-foreground leading-relaxed font-medium">
                  Didesain untuk developer dan pemilik website yang butuh sistem pengawasan andal
                  tanpa pusing memikirkan biaya berlangganan.
                </p>
                <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                <ul className="mt-8 space-y-4 text-sm font-semibold">
                  {[
                    "Jumlah situs tanpa batas*",
                    "Interval pengecekan tercepat (1 menit)",
                    "Alert Telegram instan & real-time",
                    "Peringatan Sertifikat SSL",
                    "Riwayat uptime 30 hari + visualisasi grafik",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                        <Check className="h-3 w-3 text-primary font-bold" />
                      </div>
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  className="mt-10 w-full rounded-xl h-14 text-base font-bold shadow-glow transition-all hover:scale-[1.02]"
                >
                  <Link to="/auth">
                    Klaim Akun Gratis Sekarang <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
                  *ketentuan bisa berubah setelah rilis penuh
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
            <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-primary font-semibold">
              faq
            </p>
            <h2 className="mt-4 text-center font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Pertanyaan yang Sering Muncul
            </h2>
            <div className="mt-14 space-y-4">
              {FAQS.map((item, i) => (
                <FaqItem key={item.q} q={item.q} a={item.a} open={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="relative overflow-hidden border-t border-border">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(50rem 30rem at 20% 120%, oklch(0.58 0.12 178 / 0.15), transparent 60%), radial-gradient(40rem 25rem at 90% -30%, oklch(0.58 0.12 178 / 0.1), transparent 60%)",
            }}
          />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-32 text-center sm:px-6 lg:px-8">
            <p className="floaty inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.25em] text-primary backdrop-blur-md shadow-sm border border-primary/20">
              <Flame className="h-4 w-4" />
              downtime itu mahal. jangan biarkan diam-diam.
            </p>
            <h2 className="font-display text-4xl font-black tracking-tight sm:text-[4.5rem] leading-[1.05]">
              Berhenti Tahu Belakangan. <br />
              <span className="text-primary drop-shadow-sm">Mulai Pantau Sekarang.</span>
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-xl leading-relaxed font-medium">
              Daftar gratis, hubungkan Telegram, tambah situs — seluruhnya di bawah 5 menit.
              Dapatkan peringatan di detik yang sama saat pengunjungmu gagal mengakses situs.
            </p>
            <div className="mt-4 flex gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-full h-14 px-10 text-lg font-bold transition-all hover:scale-105 shadow-glow hover:shadow-primary/30"
              >
                <Link to="/auth">
                  Mulai Gratis Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:px-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <img src="/logo.png" alt="WebWatch" className="h-10 w-auto opacity-90" />
            <p className="mt-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Uptime monitor modern dengan notifikasi Telegram instan. Didesain untuk developer yang
              benci false alarm.
            </p>
          </div>
          <FooterCol
            title="Navigasi Utama"
            links={[
              { label: "Fitur Lengkap", href: "#fitur" },
              { label: "Cara Kerja", href: "#cara-kerja" },
              { label: "Tanya Jawab (FAQ)", href: "#faq" },
              { label: "Harga Beta", href: "#harga" },
            ]}
          />
          <FooterCol
            title="Produk & Akses"
            links={[
              { label: "Masuk / Login", href: "/auth" },
              { label: "Buat Akun Gratis", href: "/auth" },
              { label: "Buka Dashboard", href: "/dashboard" },
            ]}
          />
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              Legal & Ketentuan
            </h3>
            <ul className="mt-6 space-y-3 text-sm font-medium text-muted-foreground">
              <li className="font-mono text-xs opacity-70">© 2026 WebWatch</li>
              <li className="transition-colors hover:text-foreground cursor-pointer">
                Terms of Service
              </li>
              <li className="transition-colors hover:text-foreground cursor-pointer">
                Privacy Policy
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a, open }: { q: string; a: string; open: boolean }) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div className="panel overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none"
      >
        <span className="font-display text-lg font-bold text-foreground">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="border-t border-border px-6 py-5 text-base leading-relaxed text-muted-foreground">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      <ul className="mt-6 space-y-3 text-sm font-medium text-muted-foreground">
        {links.map((link) =>
          link.href.startsWith("/") ? (
            <li key={link.label}>
              <Link
                to={link.href as "/auth" | "/dashboard"}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ) : (
            <li key={link.label}>
              <a href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
