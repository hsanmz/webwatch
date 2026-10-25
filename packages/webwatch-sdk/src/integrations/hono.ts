import { captureError } from "../capture.js";

/**
 * Hono integration: a drop-in for `app.onError`:
 *
 *   const app = new Hono();
 *   app.onError(honoOnError());
 *
 * Captures the error, then re-applies the standard hono default response so
 * behavior is unchanged.
 */

export type HonoContextLike = {
  req: {
    method?: string;
    path?: string;
    raw?: { url?: string; method?: string };
  };
};

export type HonoErrorHandler = (
  err: Error,
  context: HonoContextLike,
) => Response | Promise<Response>;

export function honoOnError(): HonoErrorHandler {
  return async (err, context) => {
    captureError(err, {
      url: context?.req?.raw?.url ?? context?.req?.path ?? null,
      method: context?.req?.method ?? context?.req?.raw?.method ?? null,
    });

    const status =
      ((err as { status?: unknown; statusCode?: unknown }).status as number | undefined) ??
      ((err as { statusCode?: unknown }).statusCode as number | undefined) ??
      500;

    if (!Number.isInteger(status) || status < 400 || status > 599) {
      return new Response("Internal Server Error", { status: 500 });
    }

    return new Response(err.message || "Internal Server Error", { status });
  };
}
