import { captureError } from "../capture.js";

/**
 * Express integration. `expressErrorMiddleware()` returns a 4-argument error
 * middleware — the ONLY argument position where Express recognizes an error
 * handler, so registration must happen after routes:
 *
 *   app.use(webwatchExpress());
 *
 * Express 4 does not automatically route rejected async handlers into the
 * error middleware; pair with `wrapAsync` for async controllers.
 */

export type ExpressNext = (err?: unknown) => void;

export type ExpressErrorRequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
};

export type ExpressErrorMiddleware = (
  err: unknown,
  req: ExpressErrorRequestLike,
  res: unknown,
  next: ExpressNext,
) => void;

export function expressErrorMiddleware(): ExpressErrorMiddleware {
  return (err, req, _res, next) => {
    captureError(err, {
      url: req?.originalUrl ?? req?.url ?? null,
      method: req?.method ?? null,
    });
    next(err);
  };
}

/**
 * Wraps a plain async handler so rejections reach next(err) on Express 4:
 *
 *   app.get("/users", wrapAsync(async (req, res) => { ... }));
 */
export function wrapAsync<Req, Res>(
  handler: (req: Req, res: Res, next: ExpressNext) => unknown,
): (req: Req, res: Res, next: ExpressNext) => void {
  return (req, res, next) => {
    try {
      const result = handler(req, res, next);
      if (result instanceof Promise) {
        Promise.resolve(result).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}
