import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";
import { newId } from "@/lib/auth.server";
import { sendTelegram, formatApmErrorMessage } from "@/lib/telegram.server";

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
          },
        });
      },
      POST: async ({ request }) => {
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // Typical APM ingest logic via Bearer token
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
          return Response.json({ error: "missing_token" }, { status: 401, headers: corsHeaders });
        }
        const key = auth.slice(7);

        // Validate API Key and fetch site in one query
        const site = await db()
          .prepare(
            `
          SELECT s.id, s.name, s.url, s.verification_status, u.chat_id, ak.site_id
          FROM api_keys ak
          JOIN sites s ON s.id = ak.site_id
          JOIN users u ON u.id = s.user_id 
          WHERE ak.key = ? LIMIT 1
        `,
          )
          .bind(key)
          .first<{
            id: string;
            name: string | null;
            url: string;
            verification_status: string;
            chat_id: string | null;
            site_id: string;
          }>();

        if (!site) {
          return Response.json({ error: "invalid_key" }, { status: 401, headers: corsHeaders });
        }

        if (site.verification_status !== "verified") {
          return Response.json(
            { error: "site_not_verified" },
            { status: 403, headers: corsHeaders },
          );
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
            return Response.json(
              { error: "invalid_payload" },
              { status: 400, headers: corsHeaders },
            );
          }

          const stmt = db().prepare(
            `INSERT INTO apm_events (id, site_id, environment, event_type, message, stack_trace, url, method, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          );

          // Batch insert for scalability
          const batch = body.events.map((ev) =>
            stmt.bind(
              newId(),
              site.site_id,
              ev.environment ?? "production",
              ev.type ?? "log",
              ev.message ?? "",
              ev.stack_trace ?? null,
              ev.url ?? null,
              ev.method ?? null,
              ev.user_agent ?? null,
            ),
          );

          // D1 typically limits batches to 100 statements
          const CHUNK_SIZE = 50;
          for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
            await db().batch(batch.slice(i, i + CHUNK_SIZE));
          }

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
              // Await the send so it doesn't get cancelled by the serverless runtime
              await sendTelegram(site.chat_id, msg).catch(console.error);
            }
          }

          return Response.json({ ok: true, ingested: batch.length }, { headers: corsHeaders });
        } catch (error) {
          return Response.json({ error: "bad_request" }, { status: 400, headers: corsHeaders });
        }
      },
    },
  },
});
