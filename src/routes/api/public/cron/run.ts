import { createFileRoute } from "@tanstack/react-router";

// Private manual trigger for the monitor. Guarded by the same secret as the
// Telegram webhook; used for verification and on-demand runs. The automatic
// schedule runs on the Cloudflare Cron Trigger ("* * * * *") instead.
export const Route = createFileRoute("/api/public/cron/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getAppEnv } = await import("@/lib/wrangler-env");
        let envValue;
        try {
          envValue = getAppEnv().TELEGRAM_WEBHOOK_SECRET;
        } catch {
          // ignore when env is not set
        }
        const expected =
          envValue ||
          (typeof process !== "undefined" ? process.env["TELEGRAM_WEBHOOK_SECRET"] : undefined);

        if (!expected) {
          console.error("[cron] TELEGRAM_WEBHOOK_SECRET is not configured");
          return Response.json({ error: "No secret" }, { status: 500 });
        }

        const provided = request.headers.get("x-webwatch-cron") ?? "";

        async function hashString(v: string) {
          const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
          return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
        }

        const providedHash = await hashString(provided);
        const expectedHash = await hashString(expected);

        // Standard string comparison is sufficient here for a pre-hashed webhook secret check
        if (providedHash !== expectedHash) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runScheduledMonitor } = await import("@/lib/monitor.server");
        const checked = await runScheduledMonitor();
        return Response.json({ ok: true, checked });
      },
    },
  },
});
