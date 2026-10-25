import type { RuntimeKind } from "./types.js";

export const SDK_VERSION = "0.1.0";
export const INGEST_PATH = "/api/ingest";

/**
 * Configuration precedence:
 *   key      init(key)          >  WEBWATCH_KEY
 *   endpoint init(key, url)     >  WEBWATCH_URL
 *
 * Zero-config flow: set WEBWATCH_KEY and WEBWATCH_URL, then simply import the
 * package — no init() call needed. Without both, the SDK stays inert.
 */

let explicitKey: string | null = null;
let explicitEndpoint: string | null = null;

export function setExplicit(key: string | null, endpoint: string | null): void {
  explicitKey = key?.trim() ? key.trim() : null;
  explicitEndpoint = endpoint?.trim() ? endpoint.trim() : null;
}

/** Test hook: clear everything that could leak between test files. */
export function resetConfig(): void {
  explicitKey = null;
  explicitEndpoint = null;
}

export function readEnv(name: string): string | undefined {
  const scoped = typeof process !== "undefined" ? process.env : undefined;
  const value = scoped?.[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function describeRuntime(): RuntimeKind {
  const global = globalThis as {
    Bun?: unknown;
    EdgeRuntime?: unknown;
  };
  if (typeof window !== "undefined") return "browser";
  if (typeof global.Bun !== "undefined") return "bun";
  if (typeof global.EdgeRuntime === "string") return "edge";
  return "node";
}

export function userAgent(): string {
  return `webwatch-sdk/${SDK_VERSION} (${describeRuntime()})`;
}

/**
 * Endpoint join: accepts either a bare base URL ("https://watch.id") or one
 * that already points at the ingest path ("https://watch.id/api/ingest").
 * Relative values (e.g. a bundler-inlined "/api/ingest") are returned as-is.
 */
export function joinEndpoint(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (trimmed.endsWith(INGEST_PATH)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return `${trimmed}${INGEST_PATH}`;
  return trimmed;
}

export function resolveKey(): string | null {
  return explicitKey ?? readEnv("WEBWATCH_KEY") ?? null;
}

export function resolveEndpoint(): string | null {
  const raw = explicitEndpoint ?? readEnv("WEBWATCH_URL");
  return raw ? joinEndpoint(raw) : null;
}

/** environment value recorded on every event. */
export function resolveEnvironment(override?: string | null): string {
  if (override) return override;
  return readEnv("NODE_ENV") ?? "production";
}
