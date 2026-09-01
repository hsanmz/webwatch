import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";

export const Route = createFileRoute("/api/system-status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const d1 = db();
          const sitesRes = await d1
            .prepare("SELECT count(*) as count FROM sites")
            .first<{ count: number }>();
          const apmRes = await d1
            .prepare(
              "SELECT count(*) as count FROM apm_events WHERE created_at > datetime('now', '-24 hours')",
            )
            .first<{ count: number }>();
          const checksRes = await d1
            .prepare(
              "SELECT count(*) as count FROM checks WHERE checked_at > datetime('now', '-24 hours')",
            )
            .first<{ count: number }>();

          // Pintar: Cek kapan terakhir kali Cron Worker menjalankan pengecekan
          // Jika tidak ada pengecekan dalam 10 menit terakhir, asumsikan Worker sedang down
          const lastCheck = await d1
            .prepare("SELECT checked_at FROM checks ORDER BY checked_at DESC LIMIT 1")
            .first<{ checked_at: string }>();
          
          let workerStatus = "operational";
          if (lastCheck && lastCheck.checked_at) {
            const lastCheckTime = new Date(lastCheck.checked_at).getTime();
            const now = Date.now();
            if (now - lastCheckTime > 10 * 60 * 1000) { // 10 menit mati
              workerStatus = "outage";
            }
          }

          const platformStatus = workerStatus === "outage" ? "degraded" : "operational";

          return Response.json({
            status: platformStatus,
            components: [
              { name: "Web Dashboard & API", status: "operational", description: "Layanan antarmuka pengguna dan core API" },
              { name: "Uptime Monitoring Engine", status: workerStatus, description: "Edge workers untuk ping periodik situs pengguna" },
              { name: "APM Ingestion Nodes", status: "operational", description: "Penerima log error dari aplikasi pengguna" },
              { name: "Database & Storage", status: "operational", description: "Penyimpanan data inti dan konfigurasi" }
            ],
            metrics: {
              totalSites: sitesRes?.count || 0,
              apmEvents24h: apmRes?.count || 0,
              checks24h: checksRes?.count || 0,
            },
          });
        } catch (error) {
          // Jika DB error, asumsikan platform down
          return Response.json(
            {
              status: "outage",
              components: [
                { name: "Web Dashboard & API", status: "outage", description: "Layanan antarmuka pengguna dan core API" },
                { name: "Uptime Monitoring Engine", status: "unknown", description: "Edge workers untuk ping periodik situs pengguna" },
                { name: "APM Ingestion Nodes", status: "unknown", description: "Penerima log error dari aplikasi pengguna" },
                { name: "Database & Storage", status: "outage", description: "Penyimpanan data inti dan konfigurasi" }
              ],
              metrics: { totalSites: 0, apmEvents24h: 0, checks24h: 0 },
              error: String(error),
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
