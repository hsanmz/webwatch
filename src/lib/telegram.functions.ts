import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTelegramLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { randomBytes } = await import("node:crypto");
    const { botUsername } = await import("./telegram.server");
    const token = randomBytes(16).toString("hex");

    const { error } = await context.supabase.from("telegram_links").insert({
      user_id: context.userId,
      token,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const username = botUsername();
    return {
      url: `https://t.me/${username}?start=${token}`,
      botUsername: username,
    };
  });
