import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const { runDueChecks, purgeOldData } = await import("@/lib/monitor.server");
        const results = await runDueChecks();

        // Daily retention pass (runs on the midnight UTC invocation only).
        if (new Date().getUTCHours() === 0 && new Date().getUTCMinutes() < 5) {
          await purgeOldData();
        }

        return Response.json({ ok: true, checked: results.length });
      },
    },
  },
});
