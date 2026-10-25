import { capture, captureError } from "./capture.js";
import { flush } from "./queue.js";
import { autoInit, installGlobalCapture } from "./global-capture.js";
import { setExplicit, describeRuntime, SDK_VERSION, INGEST_PATH } from "./envconfig.js";
import type { CaptureOptions, RuntimeKind, WebWatchEvent } from "./types.js";

/**
 * Public API of @webwatch/sdk.
 *
 * Zero-config server flow:
 *   WEBWATCH_KEY=ww_... WEBWATCH_URL=https://watch.id next dev
 *   (plus `import "@webwatch/sdk"` anywhere on the boot path)
 */

export { capture, captureError, flush };
export { describeRuntime as getRuntime, SDK_VERSION, INGEST_PATH } from "./envconfig.js";
export type { CaptureOptions, WebWatchEvent, RuntimeKind };

export { expressErrorMiddleware, wrapAsync } from "./integrations/express.js";
export { honoOnError } from "./integrations/hono.js";
export { fastifyErrorHandler } from "./integrations/fastify.js";
export { register as nextRegister } from "./integrations/next.js";

export type InitOptions = {
  /** Endpoint base, mis. https://watch.id — /api/ingest ditambah otomatis. */
  endpoint?: string;
};

/**
 * Explicit config. Prefer WEBWATCH_KEY / WEBWATCH_URL on servers; init() is
 * the native path for bundler-built browser bundles where env vars are not
 * available. Calling it twice is safe (last write wins).
 */
export function init(key: string, options: InitOptions = {}): void {
  setExplicit(key, options.endpoint ?? null);
  installGlobalCapture();
}

/**
 * Test hook used by the suite; not part of the documented surface but stable
 * enough for consumers with the same lifecycle need.
 */
export function resetForTests(): void {
  setExplicit(null, null);
}

export type { WebWatchEvent as Event };

// Zero-config: with both env vars present, one bare import starts capturing.
autoInit();
