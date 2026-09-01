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

          const { results: incidents } = await db()
            .prepare(
              `SELECT i.id, i.started_at, i.resolved_at, i.error_message, s.name as site_name, s.id as site_id
               FROM incidents i
               JOIN sites s ON i.site_id = s.id
               WHERE s.user_id = ?
               ORDER BY i.started_at DESC LIMIT 15`,
            )
            .bind(user.id)
            .all();

          return Response.json({ events: events ?? [], incidents: incidents ?? [] });
        } catch (error) {
          console.error("[Dashboard API] DB error:", error);
          return Response.json({ error: "server_error" }, { status: 500 });
        }
      },
    },
  },
});
