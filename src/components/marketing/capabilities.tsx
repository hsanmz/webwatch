import { Gauge, KeyRound, Lock, Radio, Terminal, Timer } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The capability list replaces a bento mosaic. It reads like an instrument
 * spec sheet: a hairline separated list where each row pairs one promise with
 * the thing that does the work. No two rows look alike, because the mocks
 * are different shapes.
 */
function Row({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof Gauge;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 py-8 lg:grid-cols-2 lg:items-center lg:gap-10">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}

function AvailabilityMock() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Uptime per periode</p>
        <p className="font-mono text-xs text-muted-foreground">24 jam · 7 hari · 30 hari</p>
      </div>
      <div className="mt-4 flex h-16 items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[3px] ${i === 24 ? "bg-danger" : "bg-up/70"}`}
            style={{ height: `${i === 24 ? 34 : 70 + ((i * 13) % 30)}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Setiap kolom adalah satu hari. Riwayat disimpan 30 hari, lalu diputar otomatis.
      </p>
    </div>
  );
}

function KeywordMock() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-up" aria-hidden="true" />
        <span className="truncate font-mono text-xs text-muted-foreground">contoh-toko.id</span>
        <span className="ml-auto shrink-0 rounded bg-success-surface px-1.5 py-0.5 font-mono text-xs text-success">
          &quot;keranjang&quot;
        </span>
      </div>
      <dl className="mt-3 grid gap-1.5 font-mono text-xs text-muted-foreground">
        <div className="flex justify-between gap-3">
          <dt>status</dt>
          <dd className="text-foreground">200 OK</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>keyword</dt>
          <dd className="text-success">ditemukan</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>kesimpulan</dt>
          <dd className="text-success">operasional</dd>
        </div>
      </dl>
    </div>
  );
}

function SslMock() {
  const pct = 12;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="none" strokeWidth="5" className="stroke-border" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="100.5"
              strokeDashoffset={100.5 * (1 - pct / 100)}
              className="stroke-warning"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-warning">
            9 hari
          </span>
        </div>
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-foreground">contoh-toko.id</p>
          <p className="mt-1 text-warning">sertifikat hampir kedaluwarsa</p>
          <p className="mt-0.5 text-muted-foreground">
            Peringatan dikirim 7 hari sebelum habis, maksimal sekali dalam 24 jam.
          </p>
        </div>
      </div>
    </div>
  );
}

function FlapMock() {
  const seq = [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-1" aria-hidden="true">
        {seq.map((ok, i) => (
          <span key={i} className={`h-6 flex-1 rounded-sm ${ok ? "bg-up" : "bg-danger"}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>2x gagal beruntun baru ditandai down</span>
        <span>cooldown 10 menit antar alert</span>
      </div>
    </div>
  );
}

function CommandMock() {
  const lines = [
    { cmd: "/status", out: "3 situs dipantau · 2 up · 1 down" },
    { cmd: "/history contoh-toko.id", out: "uptime 30 hari · 1 insiden" },
  ];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {lines.map((line) => (
        <div key={line.cmd} className="leading-relaxed">
          <p className="font-mono text-xs text-foreground">
            <span className="text-primary">$</span> {line.cmd}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{line.out}</p>
        </div>
      ))}
    </div>
  );
}

function ApmMock() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-danger-surface px-1.5 py-0.5 text-xs font-medium text-danger">
          frontend_error
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          production
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium text-foreground">
        TypeError: cannot read properties of undefined
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted p-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
        {`at checkout (checkout.js:42:11)
at async submitOrder (checkout.js:88:5)`}
      </pre>
    </div>
  );
}

export function Capabilities() {
  return (
    <div className="divide-y divide-border border-y border-border">
      <Row
        icon={Radio}
        title="Pengecekan tiap menit"
        body="Setiap situs aktif dicek ulang tiap 60 detik dari worker edge. Kenaikan uptime, keyword, dan SSL ikut terbaca pada pengecekan yang sama."
      >
        <AvailabilityMock />
      </Row>

      <Row
        icon={KeyRound}
        title="Cek keyword halaman"
        body="Situs bisa membalas 200 OK sementara halamannya justru rusak. Cek keyword memastikan isi halaman masih memuat teks yang kamu tentukan."
      >
        <KeywordMock />
      </Row>

      <Row
        icon={Lock}
        title="Sertifikat SSL"
        body="WebWatch tahu sertifikatmu hampir kedaluwarsa dan mengirim peringatan sebelum pengunjung melihat layar merah."
      >
        <SslMock />
      </Row>

      <Row
        icon={Timer}
        title="Anti false alarm"
        body="Situs harus gagal beberapa kali berturut-turut baru ditandai down, dan notifikasi yang sama ditahan selama 10 menit."
      >
        <FlapMock />
      </Row>

      <Row
        icon={Terminal}
        title="Kelola dari Telegram"
        body="Tambah situs, cek status, lihat riwayat, jeda atau lanjutkan. Semua perintah bot tersedia di chat yang sama dengan alertnya."
      >
        <CommandMock />
      </Row>

      <Row
        icon={Gauge}
        title="Stack trace dari aplikasi"
        body="SDK satu berkas menangkap error frontend dan backend lengkap dengan stack trace, URL, dan method request."
      >
        <ApmMock />
      </Row>
    </div>
  );
}
