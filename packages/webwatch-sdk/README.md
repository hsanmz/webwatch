# @webwatch/sdk

Zero-config error capture SDK for [WebWatch](https://github.com/hsanmz/webwatch) — automatically captures unhandled exceptions, unhandled promise rejections, and runtime errors, batches them in memory, and posts them to your WebWatch ingest endpoint with automatic retries. Zero server agents, zero per-route boilerplate.

---

## Installation

```sh
npm install @webwatch/sdk
# or
bun add @webwatch/sdk
# or
pnpm add @webwatch/sdk
```

---

## Quick Start (Zero-Config)

Set two environment variables, then import `@webwatch/sdk` once at the entrypoint of your application:

```sh
export WEBWATCH_KEY="ww_..."                       # Site API key from your WebWatch dashboard
export WEBWATCH_URL="https://watch.example.com"     # Your WebWatch deployment origin
```

```js
// At your application entrypoint (Node/Bun, Next.js, Express, Hono, Fastify, etc.)
import "@webwatch/sdk";
```

Without these environment variables, the SDK remains completely dormant (no-op) and outputs a single console warning when an event is recorded — error monitoring will never break or block your application.

---

## What Gets Captured Automatically

| Source                                  | `event_type`     | Details                                                  |
| --------------------------------------- | ---------------- | -------------------------------------------------------- |
| `process` unhandledRejection            | `backend_error`  | Includes rejected async routes in backend frameworks     |
| `process` uncaughtException             | `backend_error`  | Uses `uncaughtExceptionMonitor` — process exits normally |
| `window` error _(browser)_              | `frontend_error` | Captures stack trace + page URL                          |
| `window` unhandledrejection _(browser)_ | `backend_error`  | Catches unhandled browser promise rejections             |

---

## Framework Integrations

### Express

```js
import express from "express";
import { expressErrorMiddleware, wrapAsync } from "@webwatch/sdk/express";

const app = express();

app.get(
  "/api/users",
  wrapAsync(async (req, res) => {
    const users = await fetchUsers();
    res.json(users);
  }),
);

// Register after all routes and handlers
app.use(expressErrorMiddleware());
```

### Hono

```js
import { Hono } from "hono";
import { honoOnError } from "@webwatch/sdk/hono";

const app = new Hono();
app.onError(honoOnError());
```

### Fastify

```js
import Fastify from "fastify";
import { fastifyErrorHandler } from "@webwatch/sdk/fastify";

const app = Fastify();
app.setErrorHandler(fastifyErrorHandler());
```

### Next.js (App Router / Pages Router)

```ts
// instrumentation.ts (in your project root or src/ directory)
export async function register() {
  await import("@webwatch/sdk/next").then((m) => m.register());
}
```

---

## Programmatic API

| Export                                               | Description                                             |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `capture(type, message, stackTrace?, url?, method?)` | Enqueue a custom event manually (fire-and-forget)       |
| `captureError(error, options?)`                      | Capture an `Error` or any value across recursive causes |
| `flush()`                                            | Manually force an immediate flush of buffered events    |
| `init(key, { endpoint })`                            | Explicit programmatic initialization (e.g. browser)     |
| `@webwatch/sdk/next` → `register()`                  | Drop-in helper for Next.js `instrumentation.ts`         |

### Manual Capture Example

```js
import { captureError } from "@webwatch/sdk";

try {
  await processPayment();
} catch (err) {
  captureError(err, {
    url: "/api/pay",
    method: "POST",
  });
}
```

---

## Batching, Retries & Throttling

- **In-Memory Queue**: Buffered up to **1,000** events. When the queue overflows, the oldest events are safely discarded.
- **Flush Cadence**: Flushes every **50** events or every **5 seconds**, with at most 1 in-flight batch request at a time.
- **Exponential Retry**: Up to 3 retry attempts with exponential backoff for `5xx`, `408`, `429`, and network connection drops. Client errors (`400`, `401`, `403`, `404`) fail fast and are not retried.
- **Duplicate Throttling**: Identical events (matching `type` and `message`) are throttled within a 5-second window to prevent alert storms.

---

## Notes & Best Practices

- **Browser without bundlers**: Use the zero-install CDN script from `GET /api/public/sdk` hosted by your WebWatch deployment.
- **Docker & Kubernetes**: Inject `WEBWATCH_KEY` and `WEBWATCH_URL` into your container environment. No background daemon or sidecar container needed.
- **Monorepos (Turborepo, Nx, pnpm)**: Install `@webwatch/sdk` per workspace service (`apps/web`, `apps/api`) and assign dedicated per-service API keys to keep alerts cleanly partitioned.
- **Process crashes**: When a process exits due to an uncaught exception, asynchronous flushes cannot block process termination; using framework middleware ensures exceptions are flushed before handling terminates.
- **Environment detection**: The `environment` tag is automatically determined from `process.env.NODE_ENV` (defaults to `production`).
