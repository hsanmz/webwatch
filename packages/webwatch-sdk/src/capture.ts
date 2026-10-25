import type { CaptureOptions, WebWatchEvent } from "./types.js";
import { enqueue } from "./queue.js";
import { describeError } from "./format.js";
import {
  INGEST_PATH,
  resolveEndpoint,
  resolveEnvironment,
  resolveKey,
  userAgent,
} from "./envconfig.js";

/**
 * Public capture surface. Every function is synchronous and never throws:
 * monitoring must not be able to take down the app that hosts it. Events go to
 * the in-memory queue; the network ride happens in flush()/the interval.
 */

const THROTTLE_WINDOW_MS = 5_000;
const THROTTLE_MAX_KEYS = 1000;

const warnedConfig = new Set<string>();
const throttleMap = new Map<string, number>();

function warnOnce(code: string, detail: string): void {
  if (warnedConfig.has(code)) return;
  warnedConfig.add(code);
  console.warn(`[webwatch-sdk] ${detail}`);
}

/** Test hook. */
export function resetCaptureState(): void {
  warnedConfig.clear();
  throttleMap.clear();
}

function recordThrottle(key: string): boolean {
  const now = Date.now();
  if (throttleMap.size > THROTTLE_MAX_KEYS) {
    for (const [k, at] of throttleMap) {
      if (now - at > THROTTLE_WINDOW_MS) throttleMap.delete(k);
    }
    if (throttleMap.size > THROTTLE_MAX_KEYS) throttleMap.clear();
  }
  const last = throttleMap.get(key);
  if (last !== undefined && now - last < THROTTLE_WINDOW_MS) return true;
  throttleMap.set(key, now);
  return false;
}

function buildEvent(
  type: string,
  message: string,
  stackTrace?: string | null,
  options?: CaptureOptions,
): WebWatchEvent {
  return {
    type,
    message,
    stack_trace: stackTrace ?? null,
    url: options?.url ?? null,
    method: options?.method ?? null,
    environment: resolveEnvironment(options?.environment),
    user_agent: userAgent(),
  };
}

function dispatch(event: WebWatchEvent): boolean {
  const configKey = resolveKey();
  const endpoint = resolveEndpoint();

  if (!configKey && !endpoint) {
    warnOnce(
      "missing_config",
      `SDK aktif tapi belum dikonfigurasi. Set WEBWATCH_KEY dan WEBWATCH_URL (endpoint ${INGEST_PATH}) di env, atau panggil init(key, url) sekali di entrypoint.`,
    );
    return false;
  }
  if (!configKey) {
    warnOnce("missing_key", "WEBWATCH_KEY belum diset; event tidak dikirim.");
    return false;
  }
  if (!endpoint) {
    warnOnce(
      "missing_endpoint",
      "WEBWATCH_URL belum diset (mis. https://watch.id); event tidak dikirim.",
    );
    return false;
  }

  if (recordThrottle(`${event.type}\u0000${event.message}`)) return false;

  enqueue(event);
  return true;
}

/** Legacy-shaped capture: main docs keep this signature. Fire-and-forget. */
export function capture(
  type: string,
  message: string,
  stackTrace?: string | null,
  url?: string | null,
  method?: string | null,
): boolean {
  return dispatch(buildEvent(type, message, stackTrace, { url, method }));
}

/** Convenience for thrown/promise-rejected values. Fire-and-forget. */
export function captureError(error: unknown, options?: CaptureOptions): boolean {
  const { message, stack } = describeError(error);
  return dispatch(buildEvent("backend_error", message, stack, options));
}
