import { capture, captureError } from "./capture.js";
import { flush } from "./queue.js";
import { resolveEndpoint, resolveKey } from "./envconfig.js";

/**
 * One-time installation of process/window error hooks so that simply
 * importing the package (with WEBWATCH_KEY + WEBWATCH_URL set) starts
 * capturing: unhandledRejection, uncaughtExceptionMonitor, and — in the
 * browser — window error + unhandledrejection.
 *
 * Known edge: a process that is dying from an uncaught error may exit before
 * the flush finishes; framework middleware (express/hono/fastify/next) is the
 * guaranteed path for those.
 */

let installed = false;

export function isGlobalCaptureInstalled(): boolean {
  return installed;
}

export function installGlobalCapture(): void {
  if (installed) return;
  installed = true;

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      capture(
        "frontend_error",
        event.message ?? "Uncaught error",
        (event as ErrorEvent).error?.stack ?? null,
        window.location.href,
        "GET",
      );
    });
    window.addEventListener("unhandledrejection", (event) => {
      captureError((event as PromiseRejectionEvent).reason, {
        url: window.location.href,
        method: "GET",
      });
    });
    window.addEventListener("beforeunload", () => {
      void flush();
    });
    return;
  }

  if (typeof process !== "undefined" && typeof process.on === "function") {
    process.on("unhandledRejection", (reason) => {
      captureError(reason);
    });

    // uncaughtExceptionMonitor fires and still lets the process crash naturally
    // (unlike uncaughtException, which would swallow the crash). Available on
    // every runtime we claim to support (Node >= 18, Bun).
    process.on("uncaughtExceptionMonitor", (error) => {
      captureError(error);
    });
  }
}

/**
 * Zero-config bootstrap. Called on package import; explicit init() clears the
 * gate so late-arriving envs get picked up on the next capture.
 */
export function autoInit(): void {
  const key = resolveKey();
  const endpoint = resolveEndpoint();
  if (key && endpoint) installGlobalCapture();
}
