// The Worker runtime hands bindings/vars to each fetch/scheduled invocation.
// TanStack Start route handlers do not receive `env` directly, so the entry
// module captures it once per isolate and this module re-exposes it. The env is
// stable for the lifetime of a Worker isolate.
export type AppEnv = {
  DB: D1Database;
};

let currentEnv: AppEnv | undefined;

export function setAppEnv(env: unknown): void {
  currentEnv = env as AppEnv;
}

export function getAppEnv(): AppEnv {
  if (currentEnv) return currentEnv;
  const globalEnv = (globalThis as { __env__?: AppEnv }).__env__;
  if (globalEnv) return globalEnv;
  throw new Error("App environment is not available");
}

export function db(): D1Database {
  return getAppEnv().DB;
}
