import { setAppEnv } from "../../lib/wrangler-env";

export default function (nitroApp: any) {
  nitroApp.hooks.hook("request", (event: any) => {
    if (event.context.cloudflare?.env) {
      setAppEnv(event.context.cloudflare.env);
      globalThis.__env__ = event.context.cloudflare.env;
    }
  });
}
