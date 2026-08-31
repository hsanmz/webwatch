import { createFileRoute } from "@tanstack/react-router";

// Private manual trigger for the monitor. Guarded by the same secret as the
// Telegram webhook; used for verification and on-demand runs. The automatic
// schedule runs on the Cloudflare Cron Trigger ("* * * * *") instead.
export const Route = createFileRoute("/api/public/cron/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (!expected) return new Response("Server configuration error", { status: 500 });

        const provided = request.headers.get("x-webwatch-cron") ?? "";
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
        if (!timingSafeEqual(digest(provided), digest(expected))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runScheduledMonitor } = await import("@/lib/monitor.server");
        const checked = await runScheduledMonitor();
        return Response.json({ ok: true, checked });
      },
    },
  },
});
