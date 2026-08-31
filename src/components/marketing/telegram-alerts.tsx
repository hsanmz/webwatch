import { CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";

const base =
  "flex w-64 items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-panel transition-transform duration-500 hover:-translate-y-1";

export function TelegramAlerts() {
  return (
    <div className="relative flex flex-col gap-[20px] items-start" aria-hidden="true">
      <div
        className={`${base}`}
        style={{ animation: "float-soft 6s ease-in-out infinite", animationDelay: "0s" }}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
          <TriangleAlert className="h-4.5 w-4.5 text-red-600" />
        </span>
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-foreground/80">
            WebWatch Bot <span className="text-muted-foreground">· 12:03</span>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">
            <span className="font-bold text-red-600">DOWN</span> — blog.tokoku.id
          </p>
          <p className="mt-1 font-mono text-[10px] font-medium text-muted-foreground">
            timeout · 3x gagal
          </p>
        </div>
      </div>

      <div
        className={`${base}`}
        style={{ animation: "float-soft 6s ease-in-out infinite", animationDelay: "-2s" }}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100">
          <CheckCircle2 className="h-4.5 w-4.5 text-teal-600" />
        </span>
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-foreground/80">
            WebWatch Bot <span className="text-muted-foreground">· 12:05</span>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">
            <span className="font-bold text-teal-600">PULIH</span> — api.tokoku.id
          </p>
          <p className="mt-1 font-mono text-[10px] font-medium text-muted-foreground">
            downtime 02:14
          </p>
        </div>
      </div>

      <div
        className={`${base}`}
        style={{ animation: "float-soft 6s ease-in-out infinite", animationDelay: "-4s" }}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
        </span>
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-foreground/80">
            WebWatch Bot <span className="text-muted-foreground">· 06:00</span>
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">
            <span className="font-bold text-amber-600">SSL</span> — sertifikat toko.id
          </p>
          <p className="mt-1 font-mono text-[10px] font-medium text-muted-foreground">
            habis dalam 7 hari
          </p>
        </div>
      </div>
    </div>
  );
}
