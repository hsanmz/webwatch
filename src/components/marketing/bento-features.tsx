import { Bell, Bot, Gauge, KeyRound, Lock, ShieldCheck, Timer } from "lucide-react";
import type { ReactNode } from "react";

function Pane({
  icon: Icon,
  title,
  body,
  children,
  className = "",
}: {
  icon: typeof Bell;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`panel reveal flex flex-col p-6 ${className}`}>
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex-1">{children}</div>
    </article>
  );
}

const BARS = [
  72, 88, 64, 92, 78, 84, 70, 96, 82, 74, 90, 68, 86, 76, 94, 80, 66, 88, 72, 95, 70, 84, 60, 92,
  76, 66, 90, 78, 86, 74,
];

function UptimeChart() {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-4xl font-bold text-foreground">
            99.87<span className="text-primary">%</span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            uptime · 30 hari terakhir
          </p>
        </div>
        <div className="flex gap-1.5">
          {["24j", "7h", "30h"].map((w, i) => (
            <span
              key={w}
              className={`rounded-md px-2 py-1 font-mono text-[10px] ${
                i === 2
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex h-24 items-end gap-[3px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[3px] ${i === 23 ? "bg-[var(--down)]" : "bg-[var(--up)]/70"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>+30 hari</span>
        <span>insiden terseleksi · durasi 02:14</span>
      </div>
    </div>
  );
}

function TelegramBubbles() {
  const rows = [
    { label: "DOWN", tone: "text-[var(--down)]", name: "blog.tokoku.id", time: "12:03" },
    { label: "PULIH", tone: "text-[var(--up)]", name: "api.tokoku.id", time: "12:05" },
    { label: "SSL", tone: "text-[var(--paused)]", name: "toko.id", time: "06:00" },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`rounded-lg rounded-tl-none border border-border bg-secondary px-3 py-2 ${
            row.label === "DOWN" ? "rise" : ""
          }`}
        >
          <p className="font-mono text-[10px] text-muted-foreground">{row.time}</p>
          <p className="mt-0.5 text-sm">
            <span className={`font-semibold ${row.tone}`}>{row.label}</span>
            <span className="text-muted-foreground"> — {row.name}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function KeywordMock() {
  return (
    <div className="rounded-lg border border-border bg-secondary p-3">
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-[var(--up)]" />
        <span className="font-mono text-xs text-muted-foreground">todok.product__c →</span>
        <span className="ml-auto rounded bg-[var(--up)]/15 px-1.5 py-0.5 font-mono text-[10px] text-[var(--up)]">
          {'"keranjang"'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>status 200 ✓</span>
        <span>keyword ada ✓</span>
        <span className="text-[var(--up)]">UP</span>
      </div>
    </div>
  );
}

function SslMock() {
  const pct = 8;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 40 40" className="h-14 w-14 -rotate-90">
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
              className="stroke-[var(--paused)]"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-[var(--paused)]">
            9 hari
          </span>
        </div>
        <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          <p>tokoku.id</p>
          <p className="text-[var(--paused)]">⚠ habis dalam 9 hari</p>
          <p>perpanjang sebelum kadaluarsa</p>
        </div>
      </div>
    </div>
  );
}

function FlapMock() {
  const seq = [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1];
  return (
    <div>
      <div className="flex gap-1">
        {seq.map((ok, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-sm ${
              ok ? "bg-[var(--up)]" : i >= 7 ? "bg-[var(--down)]/60" : "bg-[var(--down)]"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>threshold 3x gagal ♨</span>
        <span className="text-[var(--paused)]">cooldown 10 mnt</span>
      </div>
    </div>
  );
}

function CommandMock() {
  const lines = [
    { cmd: "/status", out: "3 site dipantau · 2 up · 1 down" },
    { cmd: "/history tokoku.id", out: "uptime 99.9% · insiden 1 (30h)" },
  ];
  return (
    <div className="rounded-lg border border-border bg-card p-3 font-mono text-[11px] shadow-sm">
      {lines.map((l) => (
        <div key={l.cmd} className="leading-relaxed">
          <p className="text-foreground font-medium">
            <span className="text-primary font-bold">$</span> {l.cmd}
          </p>
          <p className="text-muted-foreground">{l.out}</p>
        </div>
      ))}
    </div>
  );
}

export function BentoFeatures() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Pane
        icon={Bell}
        title="Alert Telegram instan"
        body="DOWN, PULIH, sampai peringatan SSL — semua masuk ke chat pribadi kamu, bukan email."
        className="md:col-span-4"
      >
        <UptimeChart />
      </Pane>
      <Pane
        icon={ShieldCheck}
        title="Riwayat & grafik"
        body="Uptime 24 jam, 7 hari, 30 hari. Kepastian, bukan tebakan."
        className="md:col-span-2"
      >
        <TelegramBubbles />
      </Pane>
      <Pane
        icon={KeyRound}
        title="Keyword check"
        body="Halaman 'terbuka' tapi isinya rusak? Tetap ketahuan."
        className="md:col-span-2"
      >
        <KeywordMock />
      </Pane>
      <Pane
        icon={Lock}
        title="Cek SSL & expiry"
        body="Peringatan sebelum pengunjung lihat layar merah."
        className="md:col-span-2"
      >
        <SslMock />
      </Pane>
      <Pane
        icon={Timer}
        title="Anti false alarm"
        body="Threshold kegagalan + cooldown 10 menit. Inbox tenang."
        className="md:col-span-2"
      >
        <FlapMock />
      </Pane>
      <Pane
        icon={Bot}
        title="Kelola dari Telegram"
        body="Buat situs, cek status, lihat history — cukup dari chat."
        className="md:col-span-3"
      >
        <CommandMock />
      </Pane>
      <Pane
        icon={Gauge}
        title="Bandingkan sendiri"
        body="Kerja 24 jam, alert ≤ 2 menit, riwayat otomatis — tanpa wajib cara manual."
        className="md:col-span-3"
      >
        <div className="rounded-lg border border-border bg-secondary p-4">
          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-2 font-mono text-[11px]">
            <span />
            <span className="font-semibold text-foreground">WebWatch</span>
            <span className="text-muted-foreground">Cek manual</span>
            <span>Alert ≤ 2 mnt</span>
            <span className="text-[var(--up)]">✓</span>
            <span className="text-[var(--down)]">✕</span>
            <span>Kerja 24 jam</span>
            <span className="text-[var(--up)]">✓</span>
            <span className="text-[var(--down)]">✕</span>
            <span>Riwayat otomatis</span>
            <span className="text-[var(--up)]">✓</span>
            <span className="text-[var(--down)]">✕</span>
          </div>
        </div>
      </Pane>
    </div>
  );
}
