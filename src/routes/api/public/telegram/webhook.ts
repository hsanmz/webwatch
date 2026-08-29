import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (!expected) return new Response("Server configuration error", { status: 500 });

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
