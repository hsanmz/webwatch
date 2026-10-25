import { Bug, KeyRound } from "lucide-react";

/*
 * The alert shapes Telegram actually sends: APM ALERT from ingest, and the
 * OTP login code. Bodies are examples.
 */
const ALERTS = [
  {
    icon: Bug,
    tone: "border-danger/25 bg-danger-surface text-danger",
    title: "APM ALERT",
    body: "contoh-api.id",
    detail: "frontend_error · TypeError: Cannot read property 'x' of undefined",
    time: "12:03",
  },
  {
    icon: KeyRound,
    tone: "border-primary/20 bg-primary-subtle text-primary",
    title: "KODE MASUK",
    body: "kamu@webwatch.id",
    detail: "Kode OTP 6 digit · berlaku 5 menit",
    time: "09:12",
  },
];

export function TelegramAlerts() {
  return (
    <div className="space-y-2">
      {ALERTS.map((alert) => (
        <div key={alert.title} className="panel flex items-start gap-3 p-4">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${alert.tone}`}
            aria-hidden="true"
          >
            <alert.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">WebWatch Bot · {alert.time}</p>
            <p className="mt-1 text-sm text-foreground">
              <span className="font-semibold">{alert.title}</span>
              <span className="text-muted-foreground"> · {alert.body}</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{alert.detail}</p>
          </div>
        </div>
      ))}
      <p className="px-1 text-xs text-muted-foreground">Contoh isi pesan, bukan error nyata.</p>
    </div>
  );
}
