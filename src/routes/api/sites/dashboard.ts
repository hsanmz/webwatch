import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";
import { requireUser } from "@/lib/auth.server";

export const Route = createFileRoute("/api/sites/dashboard")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

        try {
          const { results: events } = await db()
            .prepare(
              `SELECT e.id, e.environment, e.event_type, e.message, e.stack_trace, e.url, e.method, e.user_agent, e.created_at, s.name as site_name, s.id as site_id
               FROM apm_events e
               JOIN sites s ON e.site_id = s.id
               WHERE s.user_id = ?
               ORDER BY e.created_at DESC LIMIT 15`,
            )
            .bind(user.id)
            .all();

          const siteCounts = await db()
            .prepare(
              `SELECT 
                 COUNT(*) as total,
                 COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active
               FROM sites
               WHERE user_id = ?`,
            )
            .bind(user.id)
            .first<{ total: number; active: number }>();

          const eventCounts = await db()
            .prepare(
              `SELECT 
                 COUNT(*) as total_stored,
                 COALESCE(SUM(CASE WHEN e.created_at >= datetime('now', '-24 hours') THEN 1 ELSE 0 END), 0) as last_24h
               FROM apm_events e
               JOIN sites s ON e.site_id = s.id
               WHERE s.user_id = ?`,
            )
            .bind(user.id)
            .first<{ total_stored: number; last_24h: number }>();

          return Response.json({
            events: events ?? [],
            metrics: {
              totalSites: siteCounts?.total ?? 0,
              activeSites: siteCounts?.active ?? 0,
              events24h: eventCounts?.last_24h ?? 0,
              totalStoredEvents: eventCounts?.total_stored ?? 0,
            },
          });
        } catch (error) {
          console.error("[Dashboard API] DB error:", error);
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
