import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";

export const Route = createFileRoute("/api/system-status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const d1 = db();
          const sitesRes = await d1.prepare("SELECT count(*) as count FROM sites").first<{count: number}>();
          const apmRes = await d1.prepare("SELECT count(*) as count FROM apm_events WHERE created_at > datetime('now', '-24 hours')").first<{count: number}>();
          const checksRes = await d1.prepare("SELECT count(*) as count FROM checks WHERE checked_at > datetime('now', '-24 hours')").first<{count: number}>();

          const historyRes = await d1.prepare(`
            SELECT date(checked_at, '+7 hours') as day, 
                   SUM(CASE WHEN is_up = 1 THEN 1 ELSE 0 END) as up_checks,
                   COUNT(*) as total_checks
            FROM checks
            WHERE checked_at > datetime('now', '-30 days')
            GROUP BY date(checked_at, '+7 hours')
            ORDER BY date(checked_at, '+7 hours') ASC
          `).all<{day: string; up_checks: number; total_checks: number}>();

          const incidentsRes = await d1.prepare(`
            SELECT i.started_at, i.resolved_at, i.error_message, s.name as site_name
            FROM incidents i
            JOIN sites s ON i.site_id = s.id
            ORDER BY i.started_at DESC
            LIMIT 5
          `).all<{started_at: string; resolved_at: string | null; error_message: string; site_name: string}>();

          return Response.json({
            status: "operational",
            metrics: {
              totalSites: sitesRes?.count || 0,
              apmEvents24h: apmRes?.count || 0,
              checks24h: checksRes?.count || 0,
            },
            history: historyRes.results || [],
            incidents: incidentsRes.results || []
          });
        } catch (error) {
          // Changed to 200 so UI renders this properly instead of generic query failure
          return Response.json({
            status: "outage",
            metrics: { totalSites: 0, apmEvents24h: 0, checks24h: 0 },
            history: [],
            incidents: [],
            error: String(error)
          }, { status: 200 });
        }
      }
    }
  }
});
