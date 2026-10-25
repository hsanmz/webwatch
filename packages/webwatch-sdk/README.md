# @webwatch/sdk

Zero-config error capture SDK for [WebWatch](https://github.com/hsanmz/webwatch) — uncaught
errors and unhandled rejections are auto-captured, batched in memory, and posted to your
WebWatch ingest endpoint with retries. No agent, no per-route wrappers.

## Instalasi

```sh
npm install @webwatch/sdk
# atau
bun add @webwatch/sdk
```

## Quick start (zero-config)

Set two env vars, then import once anywhere on the boot path — that is the whole setup:

```sh
export WEBWATCH_KEY="ww_..."                       # per-site API key dari dashboard WebWatch
export WEBWATCH_URL="https://watch.example.id"     # deployment WebWatch kamu
```

```js
// entrypoint (Node/Bun, Next.js, Express, Hono, Fastify, ...)
import "@webwatch/sdk";
```

Tanpa kedua env itu SDK diam (no-op) dan memberi peringatan sekali lewat `console.warn`
saat ada event masuk — monitoring tidak pernah menghentikan aplikasimu.

## Yang otomatis ditangkap

| Sumber                                  | event_type       | Catatan                                                    |
| --------------------------------------- | ---------------- | ---------------------------------------------------------- |
| `process` unhandledRejection            | `backend_error`  | Termasuk route `async` Express 4 yang gagal                |
| `process` uncaughtException             | `backend_error`  | Via `uncaughtExceptionMonitor` — proses tetap crash normal |
| `window` error _(browser)_              | `frontend_error` | Stack + URL halaman                                        |
| `window` unhandledrejection _(browser)_ | `backend_error`  |                                                            |

> Untuk framework yang menelan error per-route (Express 4 `async`, Hono, Fastify), pakai
> middleware di bawah agar semuanya tercatat — plus ini jamin terkirim sebelum proses mati.

## Framework helpers

### Express

```js
import express from "express";
import { expressErrorMiddleware, wrapAsync } from "@webwatch/sdk/express";

const app = express();
app.get(
  "/users",
  wrapAsync(async (req, res) => res.json({ ok: true })),
);
app.use(expressErrorMiddleware()); // setelah semua route
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
import { fastifyErrorHandler } from "@webwatch/sdk/fastify";

fastify.setErrorHandler(fastifyErrorHandler());
```

### Next.js

```ts
// instrumentation.ts (di root proyek atau src/)
export async function register() {
  await import("@webwatch/sdk/next").then((m) => m.register());
}
```

## API

| Ekspor                                               | Fungsi                                                  |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `capture(type, message, stackTrace?, url?, method?)` | Masukkan event manual (fire-and-forget)                 |
| `captureError(error, options?)`                      | Tangkap `Error`/nilai apa pun lintas root `Error.cause` |
| `flush()`                                            | Paksa kirim seluruh buffer sekarang                     |
| `init(key, { endpoint })`                            | Konfigurasi eksplisit (path bundler browser)            |
| `@webwatch/sdk/next` → `register()`                  | Drop-in untuk `instrumentation.ts`                      |

## Batching & retry

- Queue di memori (maks **1000** event, yang paling tua dibuang saat penuh).
- Flush per **50** event / interval **5 detik**, kirim paralel maksimum 1 batch in-flight.
- Retry eksponensial (3x) untuk 5xx/408/429 dan error jaringan; **tidak** di-retry untuk
  400/401/403/404 (mis. kode `invalid_key`, `site_not_verified`) supaya tidak membabi-buta.
- Event duplikat (type + pesan sama) di-throttle 5 detik anti-storm.

## Catatan

- Browser tanpa bundler: pakai script `GET /api/public/sdk` dari deployment WebWatch —
  satu file ES module, tidak butuh npm.
- Event saat proses crash karena uncaught exception mungkin hilang (flush async tidak
  bisa menunggu exit); middleware framework menutup kasus itu.
- `environment` diambil dari `NODE_ENV` (fallback `production`).
