// TINY scheduler for WebWatch. Cloudflare Cron Trigger fires every minute and
// posts to the main (Nitro) worker's guarded monitor endpoint, because the
// Nitro cloudflare-module preset wraps the worker and swallows the `scheduled`
// event for our own code. This keeps the monitor driver platform-native and
// independent of framework internals / isolate warm-up.
export default {
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const res = await env.MAIN.fetch(env.TARGET_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-webwatch-cron": env.CRON_SECRET,
            },
            body: "{}",
          });
          if (!res.ok) {
            console.error(`[scheduler] cron run failed: ${res.status} ${await res.text()}`);
          }
        } catch (error) {
          console.error("[scheduler] cron run error", error);
        }
      })(),
    );
  },
};

interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
  MAIN: Fetcher;
}
