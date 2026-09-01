// The Worker runtime hands bindings/vars to each fetch/scheduled invocation.
// TanStack Start route handlers do not receive `env` directly, so the entry
// module captures it once per isolate and this module re-exposes it. The env is
// stable for the lifetime of a Worker isolate.
import { getRequest } from "@tanstack/react-start/server";

export type AppEnv = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};

let currentEnv: AppEnv | undefined;

export function setAppEnv(env: unknown): void {
  currentEnv = env as AppEnv;
}

export function getAppEnv(): AppEnv {
  if (currentEnv) return currentEnv;
  
  try {
    const req = getRequest() as any;
    const env = req?.runtime?.cloudflare?.env ?? req?.cf?.env;
    if (env && env.DB) {
      currentEnv = env as AppEnv;
      return currentEnv;
    }
  } catch (e) {}

  const globalEnv = (globalThis as { __env__?: AppEnv }).__env__;
  if (globalEnv && globalEnv.DB) return globalEnv;

  throw new Error(
    "App environment is not available. Jika Anda menjalankan `vite dev` secara lokal, Cloudflare bindings (seperti D1) belum ter-inject. Silakan gunakan `npm run build && npx wrangler dev` atau deploy untuk menguji fitur database.",
  );
}

export function db(): D1Database {
  return getAppEnv().DB;
}
