import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, MessageSquare, Bug, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLockup } from "@/components/app/brand";
import { TelegramAlerts } from "@/components/marketing/telegram-alerts";
import { Capabilities } from "@/components/marketing/capabilities";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WebWatch: APM & Error Monitoring + Alert Telegram" },
      {
        name: "description",
        content:
          "Terima log error dari aplikasi frontend/backend kamu dan dapatkan alert Telegram instan saat error terjadi.",
      },
      { property: "og:title", content: "WebWatch: APM & Error Monitoring" },
      {
        property: "og:description",
        content: "Application Performance Monitoring dan error monitoring dengan alert Telegram.",
      },
    ],
  }),
  component: Landing,
});

const NAV = [
  { href: "#kemampuan", label: "Kemampuan" },
  { href: "#pasang", label: "Cara pasang" },
  { href: "#faq", label: "FAQ" },
  { href: "#harga", label: "Harga" },
];

const FACTS = [
  { icon: Bug, value: "Real-time", label: "error terkirim ke Telegram" },
  {
    icon: MessageSquare,
    value: "≤ 2 menit",
    label: "notifikasi Telegram setelah error terjadi",
  },
  { icon: ShieldCheck, value: "30 hari", label: "riwayat error tersimpan" },
];

const TRACKS = [
  {
    id: "situs",
    step: "01",
    label: "Daftarkan situs",
    body: "Masukkan URL domain, unggah webwatch-verify.txt di web root untuk verifikasi kepemilikan. Setelah terverifikasi, situs siap menerima log error dari SDK.",
    steps: [
      "Tambahkan domain di dashboard",
      "Unggah webwatch-verify.txt di web root untuk memverifikasi kepemilikan",
      "Hubungkan Telegram untuk menerima alert error real-time",
    ],
  },
  {
    id: "aplikasi",
    step: "02",
    label: "Pasang SDK ke aplikasi",
    body: "Tempel satu berkas SDK ke frontend atau backend. Error, exception, dan stack trace masuk ke dashboard begitu terjadi, lengkap dengan URL dan method request.",
    steps: [
      "Buat API key di halaman detail situs",
      "Tempel skrip SDK di frontend atau pasang middleware Express di backend",
      "Baca stack trace lengkap di menu APM",
    ],
  },
];

const FAQS = [
  {
    q: "Seberapa cepat alert error terkirim ke Telegram?",
    a: "Alert dikirim segera setelah batch error diterima dari SDK. Hanya error pertama per batch yang dikirim untuk menghindari spam. Cooldown 10 menit per situs.",
  },
  {
    q: "Berapa banyak situs/aplikasi yang bisa dipantau?",
    a: "Tidak ada batas jumlah situs selama masa beta. Tiap situs punya API key sendiri. Mendukung monorepo dengan satu project key.",
  },
  {
    q: "Bagaimana cara kerja bot Telegram-nya?",
    a: "Di dashboard kamu menekan tombol hubungkan, membuka bot WebWatch di Telegram, lalu mengirim kode yang disediakan. Bot mengunci sesi tersebut dan mengirim semua notifikasi ke chat itu.",
  },
  {
    q: "Apakah data pemantauan saya aman?",
    a: "Setiap query dijalankan dengan filter pemilik akun, jadi satu akun tidak bisa membaca atau mengubah data akun lain. Event APM disimpan per situs. Kredensial disimpan dalam bentuk hash SHA-256, bukan nilai aslinya.",
  },
  {
    q: "Apakah perlu memasang package npm?",
    a: "Tidak untuk frontend. SDK disajikan dari deployment kamu sendiri lewat /api/public/sdk, jadi tidak ada CDN pihak ketiga yang perlu dipercaya. Untuk backend, middleware Express bisa dipasang atau cukup panggil WebWatch.capture() dari blok catch. Paket npm @webwatch/sdk akan hadir untuk zero-config auto-instrumentation.",
  },
  {
    q: "Framework apa yang didukung?",
    a: "Frontend: React, Vue, Svelte, Next.js, Nuxt, Astro, Remix, HTML vanilla. Backend: Express, Hono, Fastify, NestJS, Koa, Bun, Cloudflare Workers. SDK satu file bekerja di mana saja JavaScript berjalan.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="WebWatch, beranda">
            <BrandLockup className="h-7 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:text-foreground"
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
              <Link to="/auth">Daftar gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-wide px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
            <div>
              {/* Eyebrow */}
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
                <span className="font-mono text-xs font-medium text-primary">
                  APM · Error Monitoring · Alert Telegram
                </span>
              </div>

              <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
                Tahu sebelum
                <br />
                user komplain.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                WebWatch menangkap error aplikasi kamu real-time dan mengirim alert ke Telegram. SDK
                ultra-ringan, zero-config, bekerja di frontend dan backend.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Mulai gratis
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#pasang">Cara pasang</a>
                </Button>
              </div>

              {/* Instrument stat row */}
              <dl
                className="mt-14 grid gap-x-0 border-t border-border pt-8 sm:grid-cols-3"
                aria-label="Statistik platform"
              >
                {FACTS.map((fact, i) => (
                  <div
                    key={fact.label}
                    className={`pb-6 sm:pb-0 sm:pr-8 ${i > 0 ? "pt-6 sm:border-l sm:border-border sm:pl-8 sm:pt-0" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <fact.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <dt>{fact.label}</dt>
                    </div>
                    <dd className="mt-2 font-display text-3xl font-bold tabular-nums text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-3">
              <TelegramAlerts />
            </div>
          </div>
        </section>

        {/* ── Capabilities ──────────────────────────────────────────────── */}
        <section id="kemampuan" className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-wide px-4 py-20 sm:px-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-medium text-primary">Kemampuan</span>
            </div>
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Satu tempat untuk error monitoring yang penting
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Error frontend, backend, dan API — semuanya dikumpulkan, dikirim ke Telegram, dan
                bisa dilacak di dashboard.
              </p>
            </div>
            <div className="mt-12">
              <Capabilities />
            </div>
          </div>
        </section>

        {/* ── Install tracks ────────────────────────────────────────────── */}
        <section id="pasang" className="border-t border-border">
          <div className="mx-auto max-w-wide px-4 py-20 sm:px-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-medium text-primary">Cara pasang</span>
            </div>
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Dua langkah, satu akun
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Daftarkan domain, pasang SDK, selesai. Tidak perlu konfigurasi per route atau
                endpoint.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {TRACKS.map((track) => (
                <article key={track.id} className="panel p-7">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-2xl font-bold tabular-nums text-primary/30 select-none">
                      {track.step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {track.label}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {track.body}
                      </p>
                      <ol className="mt-6 space-y-3.5">
                        {track.steps.map((step, i) => (
                          <li key={step} className="flex gap-3 text-sm">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary-subtle font-mono text-[10px] font-bold tabular-nums text-primary">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section id="harga" className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-wide px-4 py-20 sm:px-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-medium text-primary">Harga</span>
            </div>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Gratis selama beta
                </h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                  Tidak ada kartu kredit, tidak ada trials yang hangus, tidak ada batas jumlah situs
                  selama masa beta. Kalau nanti ada perubahan, kamu diberi tahu lebih dulu.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {[
                    "Jumlah situs/aplikasi tidak dibatasi selama beta",
                    "Alert Telegram real-time untuk setiap error yang masuk",
                    "SDK error capture untuk frontend & backend",
                    "Stack trace lengkap dengan URL & method",
                    "Batching otomatis + retry eksponensial",
                    "API key per situs untuk isolasi telemetri",
                    "Bot Telegram untuk manajemen situs & alert",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                        <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel h-fit p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Paket saat ini</p>
                    <p className="mt-1.5 font-display text-5xl font-bold leading-none text-foreground">
                      Gratis
                    </p>
                  </div>
                  <Badge variant="success">Akses terbuka</Badge>
                </div>
                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Seluruh kemampuan WebWatch APM terbuka untuk semua pengguna beta. Tidak ada yang
                    dikunci di balik paywall.
                  </p>
                </div>
                <Button asChild size="lg" className="mt-6 w-full">
                  <Link to="/auth">
                    Buka akun beta
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Ketentuan bisa berubah setelah rilis penuh.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-wide px-4 py-20 sm:px-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
              <span className="font-mono text-xs font-medium text-primary">FAQ</span>
            </div>
            <div className="grid gap-12 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  Pertanyaan yang sering muncul
                </h2>
              </div>
              <div className="divide-y divide-border border-t border-border">
                {FAQS.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="border-t border-primary/20 bg-[var(--brand-950)]">
          <div className="mx-auto max-w-wide px-4 py-20 sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                {/* Mini eye-icon mark */}
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                  <img src="/favicon.png" alt="" aria-hidden="true" className="h-7 w-7" />
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Mulai dari satu domain.
                  <br className="hidden sm:block" />
                  <span className="text-[var(--brand-500)]"> Sisanya menyusul.</span>
                </h2>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">
                  Daftar, verifikasi kepemilikan domain, hubungkan Telegram, lalu pasang SDK ke
                  aplikasimu.
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[var(--brand-900)] hover:bg-white/90"
                >
                  <Link to="/auth">
                    Pantau error pertama
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-wide px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <BrandLockup className="h-7 w-auto" />
              <p className="mt-2.5 text-sm text-muted-foreground">
                APM & Error Monitoring dengan alert Telegram.
              </p>
            </div>
            <nav
              className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-muted-foreground"
              aria-label="Tautan situs"
            >
              <Link to="/docs" className="transition-colors hover:text-foreground">
                Dokumentasi
              </Link>
              <Link to="/status" className="transition-colors hover:text-foreground">
                Status sistem
              </Link>
              <Link to="/auth" className="transition-colors hover:text-foreground">
                Masuk
              </Link>
            </nav>
            <p className="text-xs text-muted-foreground">© 2026 WebWatch</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/*
 * A native disclosure. The answer stays in the document — readable without
 * JavaScript, reachable by keyboard, visible to a crawler.
 */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group">
      <summary className="flex w-full cursor-pointer list-none items-start justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-semibold text-foreground">{q}</span>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180 group-open:text-primary"
          aria-hidden="true"
        />
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  );
}
