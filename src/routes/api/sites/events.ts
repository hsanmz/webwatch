import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";
import { requireUser } from "@/lib/auth.server";

export const Route = createFileRoute("/api/sites/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const siteId = url.searchParams.get("siteId");
        if (!siteId) return Response.json({ error: "site_id_required" }, { status: 400 });

        const site = await db()
          .prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?")
          .bind(siteId, user.id)
          .first();
        if (!site) return Response.json({ error: "not_found" }, { status: 404 });

        const { results } = await db()
          .prepare(
            "SELECT id, environment, event_type, message, stack_trace, url, method, user_agent, created_at FROM apm_events WHERE site_id = ? ORDER BY created_at DESC LIMIT 100",
          )
          .bind(siteId)
          .all();

        return Response.json({ events: results ?? [] });
      },
    },
  },
});
