import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/lib/wrangler-env";
import { newId, requireUser } from "@/lib/auth.server";
import crypto from "node:crypto";

export const Route = createFileRoute("/api/sites/keys")({
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
            "SELECT key, name, created_at FROM api_keys WHERE site_id = ? ORDER BY created_at DESC",
          )
          .bind(siteId)
          .all();
        return Response.json({ keys: results ?? [] });
      },
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

        const body = (await request.json()) as { siteId: string; name?: string };
        if (!body.siteId) return Response.json({ error: "site_id_required" }, { status: 400 });

        const site = await db()
          .prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?")
          .bind(body.siteId, user.id)
          .first();
        if (!site) return Response.json({ error: "not_found" }, { status: 404 });

        const rawKey = crypto.randomBytes(24).toString("hex");
        const key = `ww_${rawKey}`;

        await db()
          .prepare("INSERT INTO api_keys (key, site_id, name) VALUES (?, ?, ?)")
          .bind(key, body.siteId, body.name || "Default Key")
          .run();

        return Response.json({ ok: true, key });
      },
    },
  },
});
