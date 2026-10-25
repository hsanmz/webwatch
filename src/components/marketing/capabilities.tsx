import { Bug, KeyRound, ShieldAlert, Terminal, Gauge } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The capability list reads like an instrument spec sheet: a hairline-divided
 * list where each row pairs one promise with the mock that shows it working.
 * The left column carries the words; the right column carries the evidence.
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
    <div className="grid gap-6 py-10 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  );
}

function ApmMock() {
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-danger-surface px-1.5 py-0.5 font-mono text-xs font-medium text-danger">
          frontend_error
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
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

function CommandMock() {
  const lines = [
    { cmd: "/listsite", out: "3 situs · 2 terverifikasi · 1 pending" },
    {
      cmd: "/addsite api.baru.id",
      out: "✅ Ditambahkan · ID: abc12345 · Status: pending verifikasi",
    },
  ];
  return (
    <div className="panel p-4">
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

function AutoInstrumentMock() {
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-success-surface px-1.5 py-0.5 font-mono text-xs font-medium text-success">
          npm install @webwatch/sdk
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium text-foreground">
        Auto-detect framework (Next.js, Express, Hono, Vue, dll)
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted p-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
        {`WebWatch.init(process.env.WEBWATCH_KEY)
✓ Express error handler attached
✓ Next.js error boundary registered
✓ Unhandled rejection captured
✓ Console.error wrapped`}
      </pre>
    </div>
  );
}

function BatchingMock() {
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-info-surface px-1.5 py-0.5 font-mono text-xs font-medium text-info">
          batch: 12 events
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          sent in 45ms
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium text-foreground">
        Batch otomatis, retry eksponensial, queue di memori
      </p>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="h-6 flex-1 rounded-sm bg-primary/20" />
        ))}
      </div>
    </div>
  );
}

export function Capabilities() {
  return (
    <div className="divide-y divide-border border-y border-border">
      <Row
        icon={Bug}
        title="Auto-capture error tanpa config"
        body="SDK satu berkas menangkap error frontend (uncaught, unhandled rejection) dan backend (Express, Hono, Fastify) lengkap dengan stack trace, URL, dan method request."
      >
        <ApmMock />
      </Row>

      <Row
        icon={Gauge}
        title="Zero-config instrumentation"
        body="npm install @webwatch/sdk → set WEBWATCH_KEY + WEBWATCH_URL, satu import langsung menangkap error global. Helper Express, Hono, Fastify, Next.js siap pakai — tidak perlu wrapper per route."
      >
        <AutoInstrumentMock />
      </Row>

      <Row
        icon={KeyRound}
        title="API key per situs"
        body="Setiap situs punya API key ww_... sendiri untuk isolasi tim, dibuat dari dashboard. Telemetri hanya diterima setelah kepemilikan domain terverifikasi."
      >
        <CommandMock />
      </Row>

      <Row
        icon={ShieldAlert}
        title="Alert Telegram real-time"
        body="Event error pertama dari setiap batch dikirim ke chat Telegram Anda dengan format rapi. Kode OTP login juga dikirim via bot."
      >
        <CommandMock />
      </Row>

      <Row
        icon={Terminal}
        title="Batching & retry otomatis"
        body="Event dikumpulkan batch, dikirim async dengan retry eksponensial. Queue di memori, tidak blokir main thread aplikasi."
      >
        <BatchingMock />
      </Row>
    </div>
  );
}
