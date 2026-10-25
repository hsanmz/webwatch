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

          return Response.json({
            status: "operational",
            components: [
              {
                name: "Web Dashboard & API",
                status: "operational",
                description: "Layanan antarmuka pengguna dan core API",
              },
              {
                name: "APM Ingestion Nodes",
                status: "operational",
                description: "Penerima log error dari aplikasi pengguna",
              },
              {
                name: "Database & Storage",
                status: "operational",
                description: "Penyimpanan data inti dan konfigurasi",
              },
            ],
            metrics: {
              totalSites: sitesRes?.count || 0,
              apmEvents24h: apmRes?.count || 0,
            },
          });
        } catch (error) {
          // Jika DB error, asumsikan platform down
          return Response.json(
            {
              status: "outage",
              components: [
                {
                  name: "Web Dashboard & API",
                  status: "outage",
                  description: "Layanan antarmuka pengguna dan core API",
                },
                {
                  name: "APM Ingestion Nodes",
                  status: "unknown",
                  description: "Penerima log error dari aplikasi pengguna",
                },
                {
                  name: "Database & Storage",
                  status: "outage",
                  description: "Penyimpanan data inti dan konfigurasi",
                },
              ],
              metrics: { totalSites: 0, apmEvents24h: 0 },
              error: String(error),
            },
            { status: 200 },
          );
        }
      },
    },
  },
});
