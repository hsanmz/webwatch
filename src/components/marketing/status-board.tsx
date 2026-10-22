import { Badge } from "@/components/ui/badge";

/*
 * A picture of the monitor list. The rows are illustrative, and the panel
 * says so, so the landing page never passes off sample data as a live feed.
 */
const ROWS = [
  { host: "contoh-toko.id", ms: 128, up: true },
  { host: "contoh-api.id", ms: 84, up: true },
  { host: "contoh-blog.id", ms: 0, up: false },
  { host: "contoh-checkout.id", ms: 213, up: true },
];

function Bars({ down }: { down: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="flex h-6 items-end gap-[3px]" aria-hidden="true">
      {bars.map((i) => {
        const bad = down && i > 22;
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full ${bad ? "bg-danger" : "bg-up/70"}`}
            style={{ height: `${bad ? 24 : 40 + ((i * 37) % 60)}%` }}
          />
        );
      })}
    </div>
  );
}

export function StatusBoard() {
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <span className="font-mono text-xs text-muted-foreground">webwatch · monitor</span>
        <Badge variant="neutral">contoh tampilan</Badge>
      </div>

      <ul className="divide-y divide-border">
        {ROWS.map((row) => (
          <li key={row.host} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${row.up ? "bg-up" : "bg-danger"}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-medium text-foreground">{row.host}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {row.up ? `${row.ms} ms · 200 OK` : "timeout · 3x gagal"}
              </p>
            </div>
            <Bars down={!row.up} />
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-5 py-4">
        <p className="font-mono text-xs text-muted-foreground">telegram · 12:03</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          <span className="font-semibold text-danger">DOWN</span>
          <span className="text-muted-foreground"> · contoh-blog.id</span>
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          timeout · 3x gagal berturut-turut · durasi 02:14
        </p>
      </div>
    </div>
  );
}
