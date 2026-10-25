import { setAppEnv } from "../../lib/wrangler-env";

type NitroRequestEvent = {
  context?: { cloudflare?: { env?: unknown } };
};

type NitroAppLike = {
  hooks: { hook: (name: string, hook: (event: NitroRequestEvent) => void) => void };
};

export default function (nitroApp: NitroAppLike) {
  nitroApp.hooks.hook("request", (event) => {
    if (event.context?.cloudflare?.env) {
      setAppEnv(event.context.cloudflare.env);
      (globalThis as Record<string, unknown>)["__env__"] = event.context.cloudflare.env;
    }
  });
}
