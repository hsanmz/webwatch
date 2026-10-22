import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, MessageSquare, Radio, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLockup } from "@/components/app/brand";
import { StatusBoard } from "@/components/marketing/status-board";
import { TelegramAlerts } from "@/components/marketing/telegram-alerts";
import { Capabilities } from "@/components/marketing/capabilities";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WebWatch: APM & Uptime Monitoring + Alert Telegram" },
      {
        name: "description",
        content:
          "Pantau error aplikasi dan uptime website kamu. WebWatch mengirim notifikasi Telegram saat situs down atau aplikasi crash.",
      },
      { property: "og:title", content: "WebWatch: APM & Uptime Monitoring" },
      {
        property: "og:description",
        content: "Application Performance Monitoring dan uptime monitoring dengan alert Telegram.",
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
  { icon: Radio, value: "1 menit", label: "interval pengecekan tercepat per situs" },
  {
    icon: MessageSquare,
    value: "≤ 2 menit",
    label: "notifikasi setelah status berubah, pada interval 1 menit",
  },
  { icon: ShieldCheck, value: "30 hari", label: "riwayat uptime dan insiden tersimpan" },
];

const TRACKS = [
  {
    id: "situs",
    label: "Pantau situs",
    body: "Masukkan URL, unggah webwatch-verify.txt, lalu biarkan worker kami mengecek sesuai interval yang kamu atur. Kamu hanya perlu tahu saat ada yang berubah.",
    steps: [
      "Tambahkan domain dan atur interval pengecekan",
      "Unggah webwatch-verify.txt di web root untuk memverifikasi kepemilikan",
      "Hubungkan Telegram untuk menerima alert downtime dan pemulihan",
    ],
  },
  {
    id: "aplikasi",
    label: "Pantau aplikasi",
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
    q: "Seberapa cepat alert terkirim ke Telegram?",
    a: "Alert dikirim pada pemeriksaan berikutnya. Untuk situs dengan interval 1 menit, notifikasi sampai sekitar 2 menit setelah status berubah. Alert DOWN dan RECOVERED untuk satu situs dijeda 10 menit supaya chat tidak dibanjiri.",
  },
  {
    q: "Berapa banyak situs yang bisa dipantau?",
    a: "Tidak ada batas jumlah situs selama masa beta. Tiap situs punya interval sendiri, dari 1 menit untuk yang paling penting sampai 24 jam untuk yang paling longgar.",
  },
  {
    q: "Bagaimana cara kerja bot Telegram-nya?",
    a: "Di dashboard kamu menekan tombol hubungkan, membuka bot WebWatch di Telegram, lalu mengirim kode yang disediakan. Bot mengunci sesi tersebut dan mengirim semua notifikasi ke chat itu.",
  },
  {
    q: "Apakah data pemantauan saya aman?",
    a: "Setiap query dijalankan dengan filter pemilik akun, jadi satu akun tidak bisa membaca atau mengubah data akun lain. Riwayat uptime diputar otomatis setelah 30 hari. Kredensial disimpan dalam bentuk hash SHA-256, bukan nilai aslinya.",
  },
  {
    q: "Apakah perlu memasang package npm?",
    a: "Tidak untuk frontend. SDK disajikan dari deployment kamu sendiri lewat /api/public/sdk, jadi tidak ada CDN pihak ketiga yang perlu dipercaya. Untuk backend, middleware Express bisa dipasang atau cukup panggil WebWatch.capture() dari blok catch.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="WebWatch, beranda">
            <BrandLockup className="h-8 w-auto" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
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
              <Link to="/auth">Daftar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-content px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <div>
              <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Tahu sebelum user komplain.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                WebWatch mengecek situs kamu tiap menit dan mengirim alert ke Telegram saat ada yang
                berubah. Untuk aplikasimu, SDK menangkap error beserta stack trace-nya di detik yang
                sama.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Pantau situs pertama
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#pasang">Lihat cara pasang</a>
                </Button>
              </div>

              <dl className="mt-12 grid gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-3">
                {FACTS.map((fact) => (
                  <div key={fact.label}>
                    <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <fact.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {fact.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-4">
              <StatusBoard />
              <TelegramAlerts />
            </div>
          </div>
        </section>

        <section id="kemampuan" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Satu tempat untuk dua hal yang harus dijaga
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Availability situs dan kesehatan aplikasi punya bentuk masalah yang berbeda, jadi
                WebWatch juga menanganinya dengan cara yang berbeda.
              </p>
            </div>
            <div className="mt-12">
              <Capabilities />
            </div>
          </div>
        </section>

        <section id="pasang" className="border-t border-border">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Dua jalur, satu akun
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Kamu bisa memakai WebWatch hanya untuk uptime, hanya untuk APM, atau keduanya.
                Keduanya memakai akun yang sama.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {TRACKS.map((track) => (
                <article key={track.id} className="panel p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {track.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{track.body}</p>
                  <ol className="mt-5 space-y-3">
                    {track.steps.map((step, i) => (
                      <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="font-mono text-xs tabular-nums text-primary">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="harga" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  Gratis selama beta
                </h2>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
                  Tidak ada kartu kredit, tidak ada trials yang hangus, tidak ada batas jumlah situs
                  selama masa beta. Kalau nanti ada perubahan, kamu diberi tahu lebih dulu.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Jumlah situs tidak dibatasi selama beta",
                    "Interval pengecekan paling cepat 1 menit",
                    "Alert Telegram untuk downtime dan pemulihan",
                    "Peringatan sertifikat SSL sebelum kedaluwarsa",
                    "Riwayat uptime 30 hari lengkap dengan grafik",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel h-fit p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Paket beta</p>
                    <p className="mt-1 font-display text-4xl font-bold text-foreground">Gratis</p>
                  </div>
                  <Badge variant="success">Akses terbuka</Badge>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Seluruh kemampuan WebWatch terbuka untuk semua pengguna beta.
                </p>
                <Button asChild size="lg" className="mt-6 w-full">
                  <Link to="/auth">Buka akun beta</Link>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ketentuan bisa berubah setelah rilis penuh.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Pertanyaan yang sering muncul
            </h2>
            <div className="mt-10 divide-y divide-border border-y border-border">
              {FAQS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Mulai dari satu domain. Sisanya menyusul.
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-primary-foreground/85">
              Daftar, verifikasi kepemilikan domain, hubungkan Telegram, lalu pasang SDK kalau kamu
              juga butuh melacak error aplikasi.
            </p>
            <div>
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">
                  Pantau situs pertama
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLockup className="h-7 w-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Uptime monitor dan APM dengan alert Telegram.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
      </footer>
    </div>
  );
}

/*
 * A native disclosure, not a button with hidden state. The answer stays in
 * the document, so it is readable without JavaScript, reachable by keyboard
 * and visible to a crawler. The browser owns the open state.
 */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-semibold text-foreground">{q}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180 group-open:text-primary"
          aria-hidden="true"
        />
      </summary>
      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
    </details>
  );
}
