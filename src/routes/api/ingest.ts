import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";
import { newId } from "@/lib/auth.server";
import { sendTelegram, formatApmErrorMessage } from "@/lib/telegram.server";

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Typical APM ingest logic via Bearer token
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return Response.json({ error: "missing_token" }, { status: 401 });
        }
        const key = auth.slice(7);

        // Validate API Key
        const apiKey = await db()
          .prepare("SELECT site_id FROM api_keys WHERE key = ? LIMIT 1")
          .bind(key)
          .first<{ site_id: string }>();
        if (!apiKey) {
          return Response.json({ error: "invalid_key" }, { status: 401 });
        }

        const site = await db()
          .prepare(
            `
          SELECT s.id, s.name, s.url, s.verification_status, u.chat_id 
          FROM sites s 
          JOIN users u ON u.id = s.user_id 
          WHERE s.id = ? LIMIT 1
        `,
          )
          .bind(apiKey.site_id)
          .first<{
            id: string;
            name: string | null;
            url: string;
            verification_status: string;
            chat_id: string | null;
          }>();

        if (!site || site.verification_status !== "verified") {
          return Response.json({ error: "site_not_verified" }, { status: 403 });
        }

        try {
          const body = (await request.json()) as {
            events: Array<{
              type: string;
              message: string;
              environment?: string;
              stack_trace?: string;
              url?: string;
              method?: string;
              user_agent?: string;
            }>;
          };

          if (!body.events || !Array.isArray(body.events)) {
            return Response.json({ error: "invalid_payload" }, { status: 400 });
          }

          const stmt = db().prepare(
            `INSERT INTO apm_events (id, site_id, environment, event_type, message, stack_trace, url, method, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          );

          // Batch insert for scalability
          const batch = body.events.map((ev) =>
            stmt.bind(
              newId(),
              apiKey.site_id,
              ev.environment ?? "production",
              ev.type ?? "log",
              ev.message ?? "",
              ev.stack_trace ?? null,
              ev.url ?? null,
              ev.method ?? null,
              ev.user_agent ?? null,
            ),
          );

          await db().batch(batch);

          // Notify Telegram for the first error in the batch to avoid spam
          if (site.chat_id) {
            const firstError = body.events.find((e) =>
              (e.type ?? "").toLowerCase().includes("error"),
            );
            if (firstError) {
              const msg = formatApmErrorMessage({
                label: site.name || site.url,
                url: site.url,
                environment: firstError.environment || "production",
                eventType: firstError.type || "unknown_error",
                message: firstError.message || "Unknown error occurred",
                endpoint: `${firstError.method || "GET"} ${firstError.url || "/"}`,
              });
              // Send async without awaiting so we don't block the ingest response
              sendTelegram(site.chat_id, msg).catch(console.error);
            }
          }

          return Response.json({ ok: true, ingested: batch.length });
        } catch (error) {
          return Response.json({ error: "bad_request" }, { status: 400 });
        }
      },
    },
  },
});
