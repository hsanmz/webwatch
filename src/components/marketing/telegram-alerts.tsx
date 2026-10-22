import { CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";

/*
 * The three alert shapes Telegram actually sends. The message bodies are
 * examples, and the caption under them says so, so nothing here reads as a
 * real incident from a real customer.
 */
const ALERTS = [
  {
    icon: TriangleAlert,
    tone: "border-danger/25 bg-danger-surface text-danger",
    title: "DOWN",
    body: "contoh-blog.id",
    detail: "timeout · 3x gagal",
    time: "12:03",
  },
  {
    icon: CheckCircle2,
    tone: "border-success/25 bg-success-surface text-success",
    title: "PULIH",
    body: "contoh-api.id",
    detail: "downtime 02:14",
    time: "12:05",
  },
  {
    icon: ShieldAlert,
    tone: "border-warning/25 bg-warning-surface text-warning",
    title: "SSL",
    body: "sertifikat contoh-toko.id",
    detail: "habis dalam 7 hari",
    time: "06:00",
  },
];

export function TelegramAlerts() {
  return (
    <div className="flex flex-col gap-4">
      {ALERTS.map((alert) => (
        <div key={alert.title} className="panel flex items-start gap-3 p-4">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${alert.tone}`}
          >
            <alert.icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">WebWatch Bot · {alert.time}</p>
            <p className="mt-1 text-sm text-foreground">
              <span className="font-semibold text-foreground">{alert.title}</span>
              <span className="text-muted-foreground"> · {alert.body}</span>
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{alert.detail}</p>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Contoh isi pesan, bukan incident nyata.</p>
    </div>
  );
}
