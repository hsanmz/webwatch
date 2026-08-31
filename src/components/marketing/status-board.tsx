import { useEffect, useState } from "react";

const ROWS = [
  { host: "tokoku.id", ms: 128, up: true },
  { host: "api.tokoku.id", ms: 84, up: true },
  { host: "blog.tokoku.id", ms: 0, up: false },
  { host: "checkout.tokoku.id", ms: 213, up: true },
];

function Bars({ down }: { down: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {bars.map((i) => {
        const bad = down && i > 22;
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full ${bad ? "bg-[var(--down)]" : "bg-[var(--up)]/70"}`}
            style={{ height: `${bad ? 24 : 40 + ((i * 37) % 60)}%` }}
          />
        );
      })}
    </div>
  );
}

function UptimeLine() {
  return (
    <div className="hidden flex-col items-end gap-1 sm:flex">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] text-white/40">30 hari</span>
        <span className="font-mono text-[10px] text-white/40">uptime</span>
      </div>
      <div className="flex h-8 items-end gap-[2px]">
        {Array.from({ length: 30 }, (_, i) => {
          const dip = i === 24 || i === 7;
          return (
            <span
              key={i}
              className={`w-[3px] rounded-t-[2px] ${dip ? "bg-[var(--down)]/80" : "bg-[var(--up)]"}`}
              style={{ height: dip ? "30%" : `${75 + ((i * 11) % 25)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StatusBoard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel overflow-hidden border border-border shadow-panel bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            webwatch · monitor
          </span>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-primary" />
          live · cek ke-{tick + 1}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {ROWS.map((row) => (
          <li key={row.host} className="flex items-center gap-4 px-5 py-3.5 bg-card">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${row.up ? "bg-primary" : "bg-[var(--down)]"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-medium text-foreground">{row.host}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.up ? `${row.ms + ((tick * 7) % 19)} ms · 200 OK` : "timeout · 3x gagal"}
              </p>
            </div>
            <Bars down={!row.up} />
          </li>
        ))}
      </ul>

      <div className="border-t border-border bg-muted/10 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          telegram · baru saja
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            <span className="font-bold text-[var(--down)]">DOWN</span>
            <span className="text-muted-foreground"> — blog.tokoku.id</span>
          </p>
          <UptimeLine />
        </div>
        <p className="mt-1.5 font-mono text-[11px] font-medium text-muted-foreground/80">
          Error: Timeout (&gt;10s) · gagal berturut-turut: 3x · durasi 02:14
        </p>
      </div>
    </div>
  );
}
