import { captureError } from "../capture.js";

/**
 * Fastify integration: a drop-in for `fastify.setErrorHandler`:
 *
 *   fastify.setErrorHandler(fastifyErrorHandler());
 */

export type FastifyRequestLike = {
  raw?: { url?: string; method?: string };
};

export type FastifyReplyLike = {
  status: (code: number) => { send: (payload?: unknown) => unknown };
};

export type FastifyErrorHandler = (
  err: unknown,
  request: FastifyRequestLike,
  reply: FastifyReplyLike,
) => unknown;

export function fastifyErrorHandler(): FastifyErrorHandler {
  return (err, request, reply) => {
    captureError(err, {
      url: request?.raw?.url ?? null,
      method: request?.raw?.method ?? null,
    });

    const statusCode = (err as { statusCode?: unknown }).statusCode;
    const status =
      typeof statusCode === "number" && statusCode >= 400 && statusCode < 600 ? statusCode : 500;

    return reply.status(status).send({
      statusCode: status,
      error: err instanceof Error ? err.name : "Error",
      message: err instanceof Error ? err.message : "Internal Server Error",
    });
  };
}
