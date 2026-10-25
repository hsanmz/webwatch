import { installGlobalCapture } from "../global-capture.js";
import { flush } from "../queue.js";

/**
 * Next.js integration: `register()` is the entry point Next calls from
 * `instrumentation.ts`:
 *
 *   // instrumentation.ts (project root or src/)
 *   export async function register() {
 *     await import("@webwatch/sdk/next").then((m) => m.register());
 *   }
 */

export async function register(): Promise<void> {
  const runtime = process.env["NEXT_RUNTIME"];
  if (runtime && runtime !== "nodejs") {
    // Edge runtime has no process error hooks; capture there relies on the
    // explicit capture() calls you make in middleware/handlers.
    return;
  }
  installGlobalCapture();
  void flush();
}
