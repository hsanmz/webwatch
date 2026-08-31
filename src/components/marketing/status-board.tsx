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

export function StatusBoard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel glow-ring overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--down)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--paused)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--up)]/60" />
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--up)]" />
          live · cek ke-{tick + 1}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {ROWS.map((row) => (
          <li key={row.host} className="flex items-center gap-4 px-5 py-4">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.up ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm">{row.host}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.up ? `${row.ms + ((tick * 7) % 19)} ms · 200 OK` : "timeout · 3x gagal"}
              </p>
            </div>
            <Bars down={!row.up} />
          </li>
        ))}
      </ul>

      <div className="border-t border-border bg-[var(--surface)]/60 px-5 py-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          telegram · baru saja
        </p>
        <p className="mt-2 text-sm">
          <span className="text-[var(--down)]">🔴 DOWN</span> — blog.tokoku.id
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Error: Timeout (&gt;10s) · gagal berturut-turut: 3x
        </p>
      </div>
    </div>
  );
}
