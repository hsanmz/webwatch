import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getAppEnv } = await import("@/lib/wrangler-env");
        let envValue;
        try {
          envValue = getAppEnv().TELEGRAM_WEBHOOK_SECRET;
        } catch {
          // ignore when env is not set
        }
        const expected =
          envValue ||
          (typeof process !== "undefined" ? process.env["TELEGRAM_WEBHOOK_SECRET"] : undefined);
        if (!expected) return Response.json({ error: "No secret" }, { status: 500 });

        const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
        if (!timingSafeEqual(digest(provided), digest(expected))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = await request.json();
        try {
          const { handleTelegramUpdate } = await import("@/lib/bot.server");
          await handleTelegramUpdate(update);
        } catch (error) {
          console.error("[telegram] update handling failed", error);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
