import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

async function authenticate(request: Request): Promise<Response | null> {
  // Platform-issued cron secret.
  const denied = await authenticateCronRequest(request);
  if (!denied) return null;

  // Database scheduler token (pg_cron), stored in the vault.
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return denied;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("webwatch_cron_token");
  if (!data || typeof data !== "string") return denied;

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(token), digest(data)) ? null : denied;
}

export const Route = createFileRoute("/api/public/cron/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticate(request);
        if (denied) return denied;

        const { runDueChecks, purgeOldData } = await import("@/lib/monitor.server");
        const results = await runDueChecks();

        // Daily retention pass (runs on the midnight UTC invocation only).
        const now = new Date();
        if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
          await purgeOldData();
        }

        return Response.json({ ok: true, checked: results.length });
      },
    },
  },
});
