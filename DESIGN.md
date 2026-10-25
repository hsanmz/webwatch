# WebWatch — Technical Design

> Architecture, data model, and runtime flows of the WebWatch APM (error monitoring) platform.
>
> This document describes **what is actually implemented**. Where the product plan and the
> implementation diverge, the divergence is recorded in
> [Known Gaps](#19-known-gaps--technical-debt) rather than papered over.
>
> The synthetic uptime monitoring product area (probes, checks, incidents, SSL warning, cron
> scheduler worker) was **removed**. Where this document mentions those words it explains why
> they are gone — it never documents them as live behaviour.

---

## Table of Contents

1. [Product Goals](#1-product-goals)
2. [System Topology](#2-system-topology)
3. [Component Breakdown](#3-component-breakdown)
4. [Build & Runtime Pipeline](#4-build--runtime-pipeline)
5. [Environment & Binding Resolution](#5-environment--binding-resolution)
6. [Data Model (Cloudflare D1)](#6-data-model-cloudflare-d1)
7. [Authentication & Session Model](#7-authentication--session-model)
8. [Site Lifecycle & Domain Verification](#8-site-lifecycle--domain-verification)
9. [APM Ingestion Protocol](#9-apm-ingestion-protocol)
10. [Notification Model](#10-notification-model)
11. [Telegram Bot Interface](#11-telegram-bot-interface)
12. [Public Status Page](#12-public-status-page)
13. [The `@webwatch/sdk` npm Package](#13-the-webwatchsdk-npm-package)
14. [API Surface & Route Map](#14-api-surface--route-map)
15. [Frontend Architecture](#15-frontend-architecture)
16. [Design System](#16-design-system)
17. [Security Model](#17-security-model)
18. [Testing](#18-testing)
19. [Known Gaps & Technical Debt](#19-known-gaps--technical-debt)
20. [Deployment](#20-deployment)

---

## 1. Product Goals

| Goal                                      | Priority | Notes                                                                                      |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Error-log ingestion for user applications | Core     | `POST /api/ingest`, Bearer per-site API key, batch of events, stored in D1                 |
| Zero-config developer onboarding          | Core     | Two env vars (`WEBWATCH_KEY`, `WEBWATCH_URL`) + one import; no-install CDN SDK as fallback |
| Immediate Telegram alerting on errors     | Core     | APM errors + OTP login codes, HTML parse mode                                              |
| Domain ownership verification             | Core     | Blocks a user from claiming someone else's domain                                          |
| Public status page                        | Minor    | `/status` backed by `/api/system-status`                                                   |

Runtime target is a single Cloudflare Worker with a D1 database. No queue workers, no cron
triggers, no external services besides Telegram.

---

## 2. System Topology

```
┌────────────────────────────┐        ┌────────────────────────────┐
│  Customer app (browser)    │        │  Customer app (server)     │
│  SDK via /api/public/sdk   │        │  @webwatch/sdk (npm)       │
└─────────────┬──────────────┘        └─────────────┬──────────────┘
              │       POST /api/ingest (Bearer ww_) │
              ▼                                     ▼
      ┌───────────────────────────────────────────────────┐
      │        Cloudflare Worker "webwatch"               │
      │   TanStack Start + Nitro, cloudflare-module       │
      │  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
      │  │ Dashboard/API│  │ Ingest     │  │ Telegram  │  │
      │  │ (SSR/React)  │  │ + bot      │  │ Bot API   │  │
      │  └──────────────┘  └────────────┘  └───────────┘  │
      └───────────────────────────┬───────────────────────┘
                                  ▼
                            ┌──────────┐
                            │ Cloudflare│
                            │     D1    │
                            └──────────┘
```

**Why there is no scheduler anymore.** The old uptime feature required a cron a minute, which
the Nitro `cloudflare-module` preset cannot host (it swallows the `scheduled` event), so a
separate `webwatch-scheduler` Worker existed. With uptime monitoring removed there is nothing to
schedule: ingestion, alerting, and verification are all request-driven. The scheduler worker and
`cron/run` route were deleted, and `wrangler.jsonc` has `"triggers": {}`.

---

## 3. Component Breakdown

| Component         | Location                               | Responsibility                                                      |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Routes (pages)    | `src/routes/*.tsx`, `_authenticated/*` | UI pages; file-based routing via TanStack Router                    |
| Routes (API)      | `src/routes/api/**`                    | Thin HTTP verb wiring to lib functions                              |
| Site/domain logic | `src/lib/sites-api.server.ts`          | Site CRUD, URL normalization, SSRF guard, verification              |
| APM ingest        | `src/routes/api/ingest.ts`             | Public endpoint; auth via `api_keys`; batch insert; Telegram alert  |
| Auth flows        | `src/lib/auth-flows.server.ts`         | HTTP-shaped operations for OTP login/link/logout and `/api/auth/*`  |
| Auth primitives   | `src/lib/auth.server.ts`               | Sessions, OTP codes, links, `ensureUser`, `newId`, `sha256Hex`      |
| Telegram          | `src/lib/telegram.server.ts`           | `sendTelegram`, `botUsername`, `escapeHtml`, message formatters     |
| Bot dispatcher    | `src/lib/bot.server.ts`                | `/start` linking, site commands, its own SSRF guard                 |
| Binding access    | `src/lib/wrangler-env.ts`              | Single accessor for the Worker env (D1 + secrets)                   |
| Error pipeline    | `src/lib/error-capture.ts`             | Expands `console.error` arguments into full messages for Nitro logs |
| SDK (npm)         | `packages/webwatch-sdk/`               | `@webwatch/sdk` source, build, tests                                |
| SDK (CDN build)   | `src/routes/api/public/sdk.ts`         | ES-module string served at `GET /api/public/sdk`                    |
| Migrations        | `migrations/d1/0001..0007`             | Schema evolution; 0007 removes the uptime surface                   |

---

## 4. Build & Runtime Pipeline

- `bun run build` → Vite → Nitro build into `.output/`; Nitro preset is
  `cloudflare-module` (`vite.config.ts`).
- `wrangler.jsonc` deploys `.output/server/index.mjs` with `no_bundle: true` (the bundle is
  already produced by Nitro), `nodejs_compat`, an `ASSETS` binding pointing at `.output/public`,
  and the D1 database `webwatch` bound as `DB`.
- `bunx tsc --noEmit` (root config) checks `src/` only. The SDK package has its own tsconfig
  (see §13.6). ESLint flat config covers the whole repo including `packages/`.
- `src/routeTree.gen.ts` is generated by TanStack Router — never hand-edit.

---

## 5. Environment & Binding Resolution

TanStack Start route handlers never receive the Worker `env` directly. The entry module captures
it once per isolate and `src/lib/wrangler-env.ts` re-exposes it:

```
setAppEnv(env)            → snapshot captured at startup
getAppEnv()               → snapshot | request runtime cloudflare env | globalThis.__env__
db()                      → getAppEnv().DB
```

`AppEnv` fields: `DB` (required), `TELEGRAM_BOT_TOKEN?`, `TELEGRAM_BOT_USERNAME?`,
`TELEGRAM_WEBHOOK_SECRET?`. Calling `getAppEnv()` without any binding source throws a
descriptive error — the intended message when running `bun run dev`, which cannot inject D1.

---

## 6. Data Model (Cloudflare D1)

Timestamps are ISO-8601 UTC strings, defaulted by SQLite:
`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`. IDs (except `otp_codes.id`) are
`crypto.randomUUID()` strings generated in `newId()`.

### 6.1 `users`

| Column        | Type | Notes                     |
| ------------- | ---- | ------------------------- |
| `id`          | TEXT | PK (UUID)                 |
| `email`       | TEXT | NOT NULL UNIQUE           |
| `chat_id`     | TEXT | Telegram chat once linked |
| `tg_username` | TEXT | Display name              |
| `created_at`  | TEXT |                           |

### 6.2 `sessions`

| Column       | Type | Notes                                                     |
| ------------ | ---- | --------------------------------------------------------- |
| `token_hash` | TEXT | PK — SHA-256 of the 32-byte session token (raw in cookie) |
| `user_id`    | TEXT | FK → users ON DELETE CASCADE                              |
| `expires_at` | TEXT | 30 days                                                   |
| `created_at` | TEXT |                                                           |

Index: `idx_sessions_user(user_id)`.

### 6.3 `otp_codes`

| Column       | Type    | Notes                                   |
| ------------ | ------- | --------------------------------------- |
| `id`         | INTEGER | PK AUTOINCREMENT                        |
| `email`      | TEXT    |                                         |
| `code_hash`  | TEXT    | SHA-256 of "`email:code`"               |
| `expires_at` | TEXT    | 5 minutes                               |
| `used`       | INTEGER | 0/1                                     |
| `attempts`   | INTEGER | failed verify attempts (migration 0002) |
| `created_at` | TEXT    |                                         |

Index: `idx_otp_email(email)`.

### 6.4 `telegram_links`

| Column        | Type | Notes                                       |
| ------------- | ---- | ------------------------------------------- |
| `token`       | TEXT | PK — 16 random bytes hex (`/start <token>`) |
| `email`       | TEXT |                                             |
| `chat_id`     | TEXT | filled when the chat completes `/start`     |
| `tg_username` | TEXT |                                             |
| `status`      | TEXT | `pending` → `linked`                        |
| `expires_at`  | TEXT | 10 minutes TTL                              |
| `created_at`  | TEXT |                                             |

Index: `idx_tg_links_email(email)`.

### 6.5 `sites`

| Column                | Type    | Notes                                                    |
| --------------------- | ------- | -------------------------------------------------------- |
| `id`                  | TEXT    | PK (UUID)                                                |
| `user_id`             | TEXT    | FK → users ON DELETE CASCADE                             |
| `name`                | TEXT    | defaults to hostname at creation                         |
| `url`                 | TEXT    | globally unique (`idx_sites_url`, migrations 0002/0006)  |
| `is_active`           | INTEGER | 0/1 — **APM ingest toggle** (repurposed, migration 0007) |
| `verification_token`  | TEXT    | content that must appear in `webwatch-verify.txt`        |
| `verification_status` | TEXT    | `pending` \| `verified` (default `pending` on new rows)  |
| `created_at`          | TEXT    |                                                          |

Indexes: `idx_sites_user(user_id)`, `idx_sites_active(is_active)`.

> The uptime columns (`interval_seconds`, `fail_threshold`, `check_keyword`, `check_ssl`,
> `current_status`, `consecutive_failures`, `last_checked_at`, `last_notified_at`,
> `ssl_last_warned_at`) and the `checks`/`incidents` tables were dropped by migration 0007.

### 6.6 `api_keys`

| Column       | Type | Notes                                                           |
| ------------ | ---- | --------------------------------------------------------------- |
| `key`        | TEXT | PK — plaintext `ww_` + 24 random bytes hex, emitted at creation |
| `site_id`    | TEXT | FK → sites ON DELETE CASCADE                                    |
| `name`       | TEXT | defaults to `Default Key`                                       |
| `created_at` | TEXT |                                                                 |

Index: `idx_api_keys_site(site_id)`.

### 6.7 `apm_events`

| Column        | Type | Notes                                                   |
| ------------- | ---- | ------------------------------------------------------- |
| `id`          | TEXT | PK (UUID)                                               |
| `site_id`     | TEXT | FK → sites ON DELETE CASCADE                            |
| `environment` | TEXT | default `production`                                    |
| `event_type`  | TEXT | free-form (`frontend_error`, `backend_error`, `log`, …) |
| `message`     | TEXT | NOT NULL (empty string allowed by ingest fallback)      |
| `stack_trace` | TEXT | nullable                                                |
| `url`         | TEXT | nullable                                                |
| `method`      | TEXT | nullable                                                |
| `user_agent`  | TEXT | nullable                                                |
| `created_at`  | TEXT |                                                         |

Indexes: `idx_apm_events_site_time(site_id, created_at)`,
`idx_apm_events_type(site_id, event_type)`.

---

## 7. Authentication & Session Model

Passwordless: **email → OTP code sent to the already-linked Telegram chat.**

### 7.1 Chat linking

1. `POST /api/auth/otp { email }` → `auth-flows.server.ts` calls `createLinkForEmail(email)`
   which inserts `telegram_links { token: 16-byte hex, status: 'pending', expires: +10 min }`
   and returns the deep link `https://t.me/<bot>/start=<token>`.
2. The user sends `/start <token>` in Telegram. `bot.server.ts` validates the token
   (`pending`, not expired), sets `chat_id`/`tg_username`/`status='linked'`, and calls
   `ensureUser(email)` — creating the `users` row carrying `chat_id` when absent.
3. `/api/auth/link-status` polls until `linked`.

### 7.2 OTP

`POST /api/auth/otp { email }` → `createOtpForEmail(email)`:

- 6-digit code (`getRandomValues % 1_000_000`, zero-padded).
- Stored as `sha256Hex(email + ':' + code)`, TTL 5 minutes.
- Purges expired/used rows; caps active codes per email at 3 (deletes the oldest).
- Resend guard `OTP_RESEND_MIN_MS = 30 s` in the route handler.
- Sends `formatOtpMessage(email, code)` to the linked chat.

`POST /api/auth/verify { email, code }` → `verifyOtp`:

- Hash-compare against unused, unexpired rows (single SQL fetch).
- Failure bumps `attempts` for all live codes of the email; at 5 failures all codes are wiped.
- Success marks the row `used`, deletes all codes for that email, and issues the session.

### 7.3 Sessions

`issueSession(userId)`:

- Token: 32 random bytes hex (`ww_session` cookie value, never stored raw).
- `sessions.token_hash = sha256Hex(token)`, `expires_at = +30 days`.
- Cookie: `ww_session=<token>; Path=/; HttpOnly; Secure; SameSite=Lax`.
- `sessionUserFromRequest(request)` re-hashes the cookie token and joins
  `sessions × users` with `expires_at > now`, returning `{ id, email, chat_id, tg_username }`.
- `requireUser(request)` is the alias used by every authenticated route.
- `destroySession` deletes by token hash; `clearSessionCookie` expires the cookie.

---

## 8. Site Lifecycle & Domain Verification

### 8.1 Creation

Two entry points share the same rules:

- `POST /api/sites { url }` (dashboard), or bot `/addsite <url>`.

`normalizeUrl` / bot URL parser:

- Accepts with or without scheme (`https://` implied), lowercases host, requires a dot.
- SSRF blocklist on the hostname string: `localhost`, `*.local`, `*.internal`, `127.0.0.0/8`,
  `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, `172.16..172.31`, `::1`/`fc00:`/`fe80:`.
- **Global** uniqueness on `sites.url` (a monitored origin belongs to exactly one account);
  uniqueness violations return `url_taken` (HTTP 409) / a bot inline message.
- New rows: `name = hostname`, `verification_token = newId()`, `verification_status = 'pending'`.

### 8.2 Verification

`POST /api/sites/verify { id }` (owner-scoped):

1. Already `verified` → `{ ok: true, status: "verified" }` (idempotent).
2. Fetches `GET https://<site.url>/webwatch-verify.txt` with a 10-second abort timeout and
   `User-Agent: WebWatch-Verifier/1.0`.
3. If the body **contains** the verification token → `verification_status = 'verified'`.
4. Errors: `not_found`, `no_token`, `file_not_found`, `token_mismatch`, `network_error`,
   `server_error`.

The verification flow is the gate for ingestion (§9). No pause/probe semantics are attached to
sites anymore; `is_active` purely toggles ingest acceptance.

### 8.3 API keys

`src/routes/api/sites/keys.ts` (thin file, inlined logic):

- `GET /api/sites/keys?siteId=` — full keys of the site (owner-scoped; keys are plaintext).
- `POST /api/sites/keys { siteId, name? }` — `ww_` + `crypto.randomBytes(24).toString("hex")`,
  stored plaintext, returned once in the response body.

---

## 9. APM Ingestion Protocol

`POST /api/ingest` — public, CORS `*` (browser SDKs post from customer origins;
`OPTIONS` preflight is handled explicitly).

### 9.1 Authentication

```
Authorization: Bearer ww_…
```

- Missing header → `missing_token` (401).
- `SELECT * FROM api_keys k JOIN sites s ON ... WHERE k.key = ?` — unknown key →
  `invalid_key` (401).
- `sites.verification_status !== 'verified'` → `site_not_verified` (403).
- `sites.is_active = 0` → ingestion rejected (APM toggle).

### 9.2 Payload

```json
{
  "events": [
    {
      "type": "backend_error",
      "message": "Payment gateway timeout",
      "environment": "production",
      "stack_trace": "TypeError: ...\n    at ...",
      "url": "/api/pay",
      "method": "POST",
      "user_agent": "webwatch-sdk/0.1.0 (node)"
    }
  ]
}
```

- `events` array required → else `invalid_payload` (400).
- Per-event fallbacks: `environment ?? "production"`, `type ?? "log"`, `message ?? ""`,
  `stack_trace/url/method/user_agent ?? null`.

### 9.3 Write path

A single prepared `INSERT INTO apm_events (...)` is reused per event via `.bind(...)`, the D1
batch is executed in slices of **50** with `db().batch(...)`.

Success: `{ ok: true, ingested: <n> }`.

### 9.4 Telegram alert

After the insert, if the site owner has a `chat_id` and **any** event in the batch has a `type`
containing `error` (case-insensitive), `formatApmErrorMessage` renders and `sendTelegram` is
**awaited**. Only the **first** such event is alerted — one message per batch, no cooldown
period.

### 9.5 Error codes

| Code                | HTTP | Cause                                                                          |
| ------------------- | ---- | ------------------------------------------------------------------------------ |
| `missing_token`     | 401  | No `Authorization` header                                                      |
| `invalid_key`       | 401  | Key not in `api_keys`                                                          |
| `site_not_verified` | 403  | Verification gate                                                              |
| `invalid_payload`   | 400  | `events` missing/not array                                                     |
| `bad_request`       | 400  | Any exception inside the POST body path — _including_ D1 failures (§19 gap G1) |

---

## 10. Notification Model

`src/lib/telegram.server.ts` exposes:

| Function                                                                         | Used for                                                                                                    |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sendTelegram(chatId, text)`                                                     | `POST api.telegram.org/bot<token>/sendMessage`, `parse_mode=HTML`, `disable_web_page_preview`, logs non-2xx |
| `escapeHtml(value)`                                                              | Mandatory wrapper for every interpolated value                                                              |
| `formatOtpMessage(email, code)`                                                  | 🔐 Kode masuk WebWatch (uses the raw 6-digit code in `<code>`)                                              |
| `formatApmErrorMessage({label, url, environment, eventType, message, endpoint})` | 🚨 APM ALERT — one per failing batch                                                                        |
| `botUsername()`                                                                  | `TELEGRAM_BOT_USERNAME` env/var, `@` stripped, used for deep links                                          |

No DOWN/RECOVERED/SSL-expiry formatters exist anymore — those belonged to the removed uptime
product.

---

## 11. Telegram Bot Interface

`POST /api/public/telegram/webhook`:

1. Compares `x-telegram-bot-api-secret-token` to `TELEGRAM_WEBHOOK_SECRET` with a timing-safe
   SHA-256 digest comparison; failures → 401. Missing secret config → 500 (`"No secret"`).
2. `bot.server.ts#handleTelegramUpdate` parses only `message.text` commands.
3. Update handling errors are logged and swallowed — the endpoint still answers
   `{ ok: true }` so Telegram does not retry-run the update.

Commands (from `HELP`, Indonesian copy):

| Command            | Behaviour                                                             |
| ------------------ | --------------------------------------------------------------------- |
| `/start <token>`   | Links chat (§7.1); bare `/start` answers with onboarding text         |
| `/help`            | Command list                                                          |
| `/addsite <url>`   | Same normalization + SSRF blocklist as the API; global URL uniqueness |
| `/listsite`        | Lines with status icons: `✅ verified`, `⏳ pending`, `⏸️ inactive`   |
| `/removesite <id>` | Deletes the site (cascade removes `api_keys`, `apm_events`)           |
| `/pause <id>`      | `is_active = 0` — ingest paused                                       |
| `/resume <id>`     | `is_active = 1`                                                       |

`<id>` may be the first 8 chars of the UUID (`findSite` uses `id LIKE '<ref>%'`, owner-scoped,
limit 2 to detect ambiguity).

---

## 12. Public Status Page

`GET /api/system-status` feeds `/status`:

- Reads `count(*)` from `sites` and `apm_events` in the last 24 hours.
- Returns a **static, positive** `components` list (dashboard/API, ingestion, database) plus the
  two metrics — `status: "operational"` is not a real per-component health probe (§19 gap G5).
- On any D1 error it answers `status: "outage"` with HTTP 200 and the error string embedded in
  the payload.

---

## 13. The `@webwatch/sdk` npm Package

Source: `packages/webwatch-sdk/` — TypeScript, zero runtime dependencies, published as ESM
(`NodeNext`), build via `bun run build:sdk` → `dist/`. Engine: Node ≥ 18 (also Bun; browser via
bundler).

### 13.1 Configuration

| Source                             | Key            | Endpoint (`/api/ingest` appended) |
| ---------------------------------- | -------------- | --------------------------------- |
| `WebWatch.init(key, { endpoint })` | wins           | wins                              |
| Env                                | `WEBWATCH_KEY` | `WEBWATCH_URL`                    |

`joinEndpoint` appends `/api/ingest` to a bare base URL, leaves a URL already pointing at the
ingest path untouched, and passes relative paths through (for inlined `import.meta.env`
configurations). With neither key nor URL the SDK is inert and `console.warn`s **once** when
events start arriving; it never throws into the host app.

`environment` recorded on events comes from `NODE_ENV` (fallback `production`), overridable
per-call. `user_agent` self-reports: `webwatch-sdk/<version> (<node|bun|edge|browser>)`.

### 13.2 Capture surface

- `capture(type, message, stackTrace?, url?, method?)` — legacy-shaped, fire-and-forget.
- `captureError(error, { url?, method?, environment? })` — expands `Error.message/stack`, walks
  `Error.cause` up to depth 3 appending `caused by: …`, degrades non-Errors to strings.
- `flush()` — awaited drain of the queue.
- Duplicate suppression: same `type + message` within a 5-second window is dropped;
  a 1000-key map with window-based eviction.

### 13.3 Batching (queue)

- In-memory buffer, max **1000** events, overflow drops the **oldest** first.
- One flush loop at a time (`inFlight` guard); each flush splices chunks of **50** (matching the
  ingest write path) and sends until the buffer empties.
- A `setInterval` of **5 s** carries the periodic flush; it is `unref()`-ed so the host process
  is never kept alive by the SDK. With no config, a flush drops the buffer silently (the
  warning happens at capture time, not at send time).

### 13.4 Transport (retry)

`sendEvents(endpoint, key, events)` — POST JSON with `Authorization: Bearer …`:

- Retries up to 3 times with exponential backoff (0.5 s → 4 s) on **408/429/5xx and network
  errors**.
- **Fail fast** on 400/401/403/404 (mis. `invalid_key`, `site_not_verified`) — retrying identical
  payloads would only hammer the host; logs one `console.error` per distinct failure class.
- After exhausting retries the batch is dropped with a single console error.

### 13.5 Auto-capture hooks

`installGlobalCapture()` is idempotent and runs when both env vars are present at import time:

- Node/Bun: `process.on('unhandledRejection')` → `captureError`; `process.on('uncaughtExceptionMonitor')`
  → `captureError` **while letting the process crash naturally** (unlike `uncaughtException`,
  which would suppress the crash).
- Browser: `window.error` → `capture('frontend_error', …)`, `window.unhandledrejection` →
  `captureError`, `beforeunload` → `void flush()`.
- Known edge: a process dying from an uncaught exception may exit before the async flush
  completes; framework middleware is the guaranteed path for those.

### 13.6 Integrations & exports

| Import                  | Exports                                                                                                               | Notes                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `@webwatch/sdk`         | `init`, `capture`, `captureError`, `flush`, `getRuntime`, `SDK_VERSION`, `INGEST_PATH`, integration re-exports, types | Runs `autoInit()` on import                                  |
| `@webwatch/sdk/express` | `expressErrorMiddleware()`, `wrapAsync(handler)`                                                                      | 4-arg error middleware + async catch for Express 4           |
| `@webwatch/sdk/hono`    | `honoOnError()`                                                                                                       | Drop-in `app.onError`; re-applies the default error Response |
| `@webwatch/sdk/fastify` | `fastifyErrorHandler()`                                                                                               | Drop-in `setErrorHandler`                                    |
| `@webwatch/sdk/next`    | `register()`                                                                                                          | `instrumentation.ts` hook; only hooks the Node.js runtime    |

Build/type-check/tests: `bun run build:sdk`,
`bun node_modules/typescript/lib/tsc.js -p packages/webwatch-sdk/tsconfig.json --noEmit`,
and vitest picks up `packages/webwatch-sdk/src/*.test.ts` (§18).

### 13.7 Relationship to the CDN build

`/api/public/sdk` serves an inline ES module (`WebWatchClient` class with `init(key, endpoint)`,
window listeners, an express handler, and a `fetch`-per-event `capture` — no batching, no
retry budget). It covers the "no npm install" niche. The npm package and this script are
**separate implementations of the same ingest contract** and can drift independently (§19 gap
G0b). Do not let one gain features the contract does not have.

---

## 14. API Surface & Route Map

### 14.1 Public

| Endpoint                            | Handler notes                                       |
| ----------------------------------- | --------------------------------------------------- |
| `OPTIONS/POST /api/ingest`          | `src/routes/api/ingest.ts` — full logic inline (§9) |
| `GET /api/public/sdk`               | Serves the CDN SDK module with `text/javascript`    |
| `POST /api/public/telegram/webhook` | Secret-checked relay to `bot.server.ts` (§11)       |
| `GET /api/system-status`            | Heuristic status + metrics (§12)                    |

### 14.2 Auth

| Endpoint                    | Notes                                       |
| --------------------------- | ------------------------------------------- |
| `POST /api/auth/otp`        | Link creation / OTP send; 30 s resend guard |
| `POST /api/auth/verify`     | OTP check; sets `ww_session` cookie         |
| `GET /api/auth/me`          | Current `SessionUser` or `null`             |
| `GET /api/auth/link-status` | `pending` \| `linked` + deep link           |
| `POST /api/auth/logout`     | Destroys session                            |

### 14.3 Sites (all owner-scoped via `requireUser`)

| Endpoint                                     | Semantics                                                |
| -------------------------------------------- | -------------------------------------------------------- |
| `GET /api/sites`                             | Owner's sites, `ORDER BY created_at ASC`                 |
| `POST /api/sites { url }`                    | Create; `url_taken` on global uniqueness violation       |
| `PATCH /api/sites { id, name?, is_active? }` | Current value kept when a field is omitted               |
| `DELETE /api/sites { id }`                   | Cascade deletes `api_keys` + `apm_events`                |
| `GET /api/sites/detail?id=`                  | Site + last **100** events DESC                          |
| `GET /api/sites/dashboard`                   | Last **15** events across the owner's sites (JOIN sites) |
| `GET /api/sites/events?siteId=`              | Last **100** events of one site (ownership re-checked)   |
| `GET /api/sites/keys?siteId=`                | Key list (§8.3)                                          |
| `POST /api/sites/keys`                       | Creates `ww_…` key                                       |
| `POST /api/sites/verify { id }`              | Verification probe (§8.2)                                |

Every error is `{ "error": "<machine_code>" }`; every `try/catch` ends in
`server_error` (500) unless a more specific code above is defined.

---

## 15. Frontend Architecture

- **Public routes**: `/` (landing), `/docs`, `/status`, `/auth`.
  `/auth` drives the linking + OTP loop entirely through the auth API and polling.
- **Authenticated routes** (`src/routes/_authenticated/route.tsx` guards the shell):
  `/dashboard`, `/sites/$id` (verification card, key list, event stream), `/apm` ("Log Error
  (APM)" — cross-site event feed), `/settings`.
- **Data access** is TanStack Query over `src/lib/api.ts#api<T>` (`credentials: "same-origin"`,
  throws with the `data.error` string on non-2xx). Mutations invalidate the cache.
- Sites are **added from the Telegram bot**, therefore the dashboard CTA links to `/docs`
  instead of an add-site form.
- Marketing copy on the landing page matches shipped behaviour only (no uptime/SSL claims).

---

## 16. Design System

Tokens live in `src/styles.css` as Tailwind v4 `@theme inline` variables; details in
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

| Group      | Tokens                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Typography | `--font-display` / `--font-sans` → Space Grotesk; `--font-mono` → IBM Plex Mono (loaded in `__root.tsx`)                    |
| Surfaces   | `--color-bg`, `--color-surface`, `--color-surface-muted`, `--color-card`, `--color-border`, `--color-border-strong`         |
| Text       | `--color-text`, `--color-text-muted`, `--color-text-subtle`                                                                 |
| Accents    | `--color-primary(-hover                                                                                                     | -subtle)`, `--color-focus`; `--color-s/w/d/i`roles for success, warning, danger, info (+their`-surface`) |
| Status     | `--up`, `--down`, `--degraded`, `--paused` — used by the remaining site-state badges (verified, error alert, paused ingest) |
| Charts     | `--chart-1` … `--chart-5`                                                                                                   |
| Code       | `--code-plain`, `--code-keyword`, `--code-string`, `--code-attribute`, `--code-punctuation`                                 |
| Shape      | `--radius-xs/sm/md/lg/xl`, `--shadow-sm/md/lg`                                                                              |
| Containers | `--container-reading`, `--container-content`, `--container-wide`                                                            |

The palette is OKLCH. Add colors as semantic tokens (never inline hex) and document the reason.

---

## 17. Security Model

| Surface          | Control                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Sessions         | 32-byte random token, **SHA-256-hashed at rest**, HttpOnly + Secure + SameSite=Lax cookie, 30-day expiry enforced in SQL |
| OTP codes        | SHA-256 of `email:code`, single-use, 5-minute TTL, ≤ 3 active per email, 5-attempt lockout, 30 s resend guard            |
| Telegram linking | One-time 10-minute tokens consumed by `/start <token>`; linking creates the user on the spot                             |
| Webhook          | Timing-safe comparison of the secret header (`sha256` + `timingSafeEqual`)                                               |
| Ingest           | Bearer `ww_` key → implied site (no user input chooses the site); verification gate; `is_active` kill switch; CORS `*`   |
| URL acceptance   | Scheme normalization + hostname best-effort SSRF blocklist (§8.1); **string-level only**, no DNS resolution (§19 gap G4) |
| Ownership        | Every site/key/event query carries `AND user_id = ?` derived from the session, never from the body                       |
| Secrets          | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` via `wrangler secret put`; `wrangler-env.ts` is the only reader          |
| SQL              | Prepared statements everywhere; no string interpolation                                                                  |

---

## 18. Testing

- Runner: Vitest, Node environment. Include globs: `src/**/*.test.ts` **and**
  `packages/**/src/**/*.test.ts` (the app suite and the SDK suite run together with
  `bun run test`).
- Test names are written in **Indonesian**, matching the existing suite style.
- Current coverage: `src/lib/telegram-server.test.ts` (escapeHtml, OTP message, APM alert
  format) and the SDK suite (`envconfig`, `capture`, `queue`, `transport`) — 32 tests.
- Vitest transforms but does not type-check: run the per-area `tsc` commands from §3/§13.6.
- There is no server-side integration test harness; D1-dependent paths are exercised through
  `bunx wrangler dev` locally. Keep pure logic in pure modules so new logic stays unit-testable.

---

## 19. Known Gaps & Technical Debt

These are real divergences between the product surface and the implementation. They are listed
so nobody documents unimplemented behaviour as shipped. Fix or re-check any item before
relying on it.

| #   | Gap                                                                                                            | Impact                                                                              | Suggested fix                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| G0  | `@webwatch/sdk` is not published to the npm registry yet                                                       | The only no-install path is the CDN build; npm instructions don't work externally   | `npm publish` from `packages/webwatch-sdk/` once the contract is stable             |
| G0b | The CDN build (`/api/public/sdk`) and the npm SDK are two separate implementations of one contract             | They drift independently (CDN build lacks batching/retry/throttle; per-event fetch) | Generate the CDN build from the npm source (shared core + browser adapter)          |
| G1  | `POST /api/ingest` wraps **all** DB failures in a catch-all returning `bad_request` (400)                      | Server-side faults masquerade as client faults; SDKs cannot distinguish             | Narrow the `catch` and return `server_error` (500) for storage failures             |
| G2  | No rate limiting on `/api/ingest`                                                                              | One valid key can insert unbounded rows (cost amplification)                        | Per-key token bucket (Durable Objects or Workers Rate Limiting binding)             |
| G3  | `apm_events` is never purged; `telegram_links`/`otp_codes` rows accumulate until ad-hoc cleanup                | Unbounded storage growth                                                            | Scheduled purge worker + retention window per `created_at` (schema already indexed) |
| G4  | `sites.url` SSRF guard: hostname **string** only, duplicated in `sites-api.server.ts` and `bot.server.ts`      | Hostnames resolving to private IPs pass; two implementations to keep in sync        | Resolve DNS before acceptance; extract one shared guard module                      |
| G5  | `/api/system-status` components are static "operational" entries; an outage is inferred only from a D1 failure | Public status page can claim healthy ingestion while it is degraded                 | Derive per-component health from real signals (error rates, recent ingest ages)     |
| G6  | API keys stored **plaintext** and re-served in full by `GET /api/sites/keys`                                   | A leaked DB dump leaks usable keys; rotation is manual (create new, delete site)    | Store hashes, show the key once at creation, add rotate/revoke endpoints            |
| G7  | `src/server/plugins/env.ts` is dead code (the registered plugin is root `server/plugins/env.ts`)               | Confusion when editing environment wiring                                           | Delete the dead file                                                                |
| G8  | APM Telegram alerts have **no cooldown** — every failing batch sends one message                               | A fast-failing app can flood the owner's chat                                       | Rate-limit alerts per site (e.g., 1 message/minute) or batch digest                 |
| G9  | `sites.is_active` doubles as the APM ingest toggle (naming/semantics carried over from uptime)                 | Reads as "monitor on/off"; no distinction between pause-origin and pause-signalling | Rename or introduce an explicit `apm_enabled` column in a future migration          |

Status-page wording, docs, and UI copy must not promise anything a listed gap blocks (e.g. no
"rate limited", no "unlimited retention").

---

## 20. Deployment

```sh
bunx wrangler d1 migrations apply webwatch --remote   # 0001..0007 in order
bun run build                                         # Nitro → .output/
bunx wrangler deploy                                  # single worker "webwatch"
```

Secrets:

```sh
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Register the Telegram webhook (same secret as above):

```sh
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url="https://<deployment>/api/public/telegram/webhook" \
  -d secret_token="$TELEGRAM_WEBHOOK_SECRET"
```

There is **no** cron trigger, no scheduler worker, no service binding. Locally:

```sh
bunx wrangler d1 migrations apply webwatch --local
bun run build && bunx wrangler dev
```
