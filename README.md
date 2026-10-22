<div align="center">
  <img src="public/logo.png" alt="WebWatch logo" width="108" />
  <h1>WebWatch</h1>
  <p>Self-hosted uptime monitoring and APM — edge-native, Telegram-first, no passwords.</p>

  <p>
    <a href="./DESIGN.md">Architecture</a> ·
    <a href="./AGENTS.md">Contributing</a> ·
    <a href="#api-reference">API reference</a> ·
    <a href="#known-limitations">Known limitations</a>
  </p>
</div>

---

WebWatch is a self-hosted monitoring platform built for developers who want one place to track whether their sites are up and whether their apps are throwing errors — delivered to Telegram, with no third-party dashboard required.

Two pillars run side by side:

- **Synthetic uptime monitoring** — the platform probes your URLs on a schedule, records response times and availability, and opens incidents automatically when a configurable failure threshold is crossed.
- **Application Performance Monitoring (APM)** — a tiny browser/Node SDK posts error batches to a Bearer-authenticated ingestion endpoint. No agent, no npm install required: the SDK is served directly from your deployment.

Every critical event — site down, site recovered, SSL expiry warning, APM error — is delivered to your Telegram chat. Login is also Telegram-based: you receive a 6-digit OTP on your bot, so no passwords are ever stored or transmitted.

The entire stack runs on **Cloudflare Workers + D1**. There is no long-lived server, no connection pool, and no external queue.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Database](#database)
- [SDK usage](#sdk-usage)
- [Domain verification](#domain-verification)
- [Telegram bot](#telegram-bot)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)
- [License](#license)

---

## Features

### Uptime monitoring

- HTTP(S) probes with a configurable interval per site (1–1440 minutes; stored as seconds internally)
- Configurable failure threshold: a site transitions to `down` only after N **consecutive** failures; a single success resets the counter
- Optional keyword assertion: the response body must contain a specific string
- Optional SSL certificate expiry check: warns when ≤ 7 days remain, at most once per 24 hours per site
- Automatic incident lifecycle: an incident opens on the first confirmed failure and closes on recovery, recording exact downtime duration
- Probe timeout: 10 seconds; SSL handshake timeout: 5 seconds
- Up to 200 sites processed per cron tick, in parallel batches of 15
- Uptime history retained for 30 days; checks and resolved incidents older than 30 days are purged during the first 5 minutes of UTC midnight

### APM ingestion

- `POST /api/ingest` — Bearer-key authenticated, CORS-permissive by design (browser SDKs post cross-origin)
- Captures `type`, `message`, `stack_trace`, `url`, `method`, `environment`, `user_agent`
- Batch inserts via D1 `.batch()` in chunks of 50
- Telegram alert on the first error-type event in each batch; remaining events are recorded silently
- Domain verification required before a site can receive APM telemetry

### Domain verification

- Host `webwatch-verify.txt` containing your site's token and click **Verify** in the dashboard
- The verifier fetches `<site-url>/webwatch-verify.txt` with a 10-second timeout
- Uptime monitoring is not gated on verification status

### Telegram alerting

| Alert | Icon | Trigger |
|---|---|---|
| Site went down | 🔴 DOWN | N consecutive probe failures |
| Site recovered | 🟢 RECOVERED | First successful probe after `down` |
| SSL certificate | ⚠️ SSL CERTIFICATE | ≤ 7 days remaining |
| APM error | 🚨 APM ALERT | First `*error*` event in an ingest batch |
| Login code | 🔐 OTP | Sign-in request |

10-minute cooldown between repeated DOWN/RECOVERED notifications suppresses alert storms during flapping.

### Authentication

- Passwordless: first-time users follow a Telegram deep link to connect their chat; subsequent logins receive a 6-digit OTP on the bot
- Sessions last 30 days (cookie: `HttpOnly`, `Secure`, `SameSite=Lax`)
- OTP codes expire in 5 minutes, are single-use, and locked after 5 failed attempts
- No passwords are stored anywhere in the system

### Dashboard

Five authenticated routes, all behind a session cookie guard:

| Route | Purpose |
|---|---|
| `/dashboard` | Overview: stat cards, recent APM exceptions, active incidents |
| `/monitors` | Site CRUD grid: create, configure, pause, resume, delete, verify |
| `/sites/:id` | Detail view: 30-day uptime chart, response-time chart, settings, API keys, SDK install |
| `/apm` | APM event stream across all sites |
| `/incidents` | Incident history with ongoing/resolved state |

### Public pages

- `/status` — live platform status and aggregate metrics (polls `/api/system-status` every 60 s)
- `/docs` — in-app integration guide

---

## Tech stack

| Concern | Technology |
|---|---|
| Framework | TanStack Start (SSR) on Nitro/h3, `cloudflare-module` preset |
| UI | React 19, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui, Radix UI, Framer Motion, Recharts |
| Backend API | TanStack Start route handlers (h3) deployed as a Cloudflare Worker |
| Database | Cloudflare D1 (SQLite), 6 migrations, 9 tables |
| Scheduler | Separate Cloudflare Worker (`* * * * *` cron) — calls main worker via service binding |
| Auth | Session cookie + OTP over Telegram, no passwords |
| Notifications | Telegram Bot API, webhook mode |
| Tooling | Bun, TypeScript 5.8, Vite 8, Vitest, ESLint 9, Prettier |

---

## Architecture

```
                     ┌─────────────────────────────┐
                     │       Cloudflare Edge        │
  Browser  ─────────►│        DNS / TLS             │
  SDK      ─────────►└─────────────────────────────┘
                                   │
              ┌────────────────────┴──────────────────────┐
              │                                           │
              ▼                                           ▼
  ┌───────────────────────────┐          ┌───────────────────────────┐
  │  Main Worker "webwatch"   │          │  Scheduler Worker         │
  │  TanStack Start + Nitro   │◄─────────│  "webwatch-scheduler"     │
  │  cloudflare-module preset │ service  │  cron: * * * * *          │
  │                           │ binding  │  → MAIN.fetch(cron/run)   │
  │  SSR pages                │          └───────────────────────────┘
  │  /api/* route handlers    │
  │  Monitoring engine        │          ┌───────────────────────────┐
  │  Telegram webhook         ├─────────►│  Cloudflare D1 "webwatch" │
  │  APM ingest               │          │  SQLite, binding "DB"     │
  └───────────────────────────┘          └───────────────────────────┘
              │
              ▼
  ┌───────────────────────────┐
  │  Telegram Bot API         │
  │  sendMessage / setWebhook │
  └───────────────────────────┘
```

### Why the scheduler is a separate worker

The main worker is built with Nitro's `cloudflare-module` preset. That preset wraps the worker and **swallows the `scheduled` event** — attaching a cron trigger to the main worker will not fire application code.

`scheduler-worker/` is a deliberately minimal, framework-free Worker that:

1. Is triggered by a platform-native Cloudflare Cron (`* * * * *`).
2. Calls the main worker over a **service binding** (`MAIN` → service `webwatch`) — no public egress, no DNS.
3. Authenticates with the `x-webwatch-cron` shared secret.

The scheduler's `TARGET_URL` (`https://webwatch/api/public/cron/run`) uses the **service-binding hostname**, not a `workers.dev` domain. The secret check on the main worker still exists because the endpoint is also reachable on its public URL.

Full architecture, data model, request flows, and known gaps: **[DESIGN.md](./DESIGN.md)**.

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0 (recommended) or Node.js ≥ 20
- Wrangler CLI — already a dev dependency, run as `bunx wrangler`
- A Cloudflare account with Workers and D1 enabled
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Clone and install

```sh
git clone https://github.com/hsanmz/webwatch.git
cd webwatch
bun i
```

### UI-only development (no database)

```sh
bun run dev
# → http://localhost:3000
```

D1 bindings are **not available** in this mode. Any route that touches the database will throw `getAppEnv() called before setAppEnv()`. Use this mode for frontend-only iteration.

### Full-stack local development (D1 included)

```sh
# 1. Apply migrations to the local D1 instance
bunx wrangler d1 migrations apply webwatch --local

# 2. Build the worker bundle
bun run build

# 3. Create a .dev.vars file with local secrets (never commit this file)
cat > .dev.vars <<'EOF'
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=any_random_string
EOF

# 4. Run with wrangler dev — injects D1 and reads .dev.vars
bunx wrangler dev
```

`.dev.vars` is the Wrangler equivalent of `.env` for local Worker development. It is already covered by `.gitignore`.

---

## Configuration

WebWatch uses **Cloudflare Worker secrets** — not `vars`, not `.env`, not repository config. Secrets are set once per worker with:

```sh
bunx wrangler secret put <SECRET_NAME>
```

### Main worker (`webwatch`)

| Secret | Required | Purpose |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot API bearer token for `sendMessage` calls |
| `TELEGRAM_BOT_USERNAME` | Yes | Username without `@`, used to build `t.me/<bot>?start=<token>` login deep links |
| `TELEGRAM_WEBHOOK_SECRET` | Yes | Guards the Telegram webhook endpoint and the manual cron trigger |

### Scheduler worker (`webwatch-scheduler`)

| Secret | Required | Purpose |
|---|---|---|
| `CRON_SECRET` | Yes | Sent as `x-webwatch-cron` header — **must equal `TELEGRAM_WEBHOOK_SECRET`** |

Both secrets must match because the main worker compares the incoming `x-webwatch-cron` value against `TELEGRAM_WEBHOOK_SECRET`. They are configured on separate workers so they must be set independently.

Secrets are never stored in `wrangler.jsonc`, `vars`, or the repository. The `.env` file in this repository is intentionally empty.

---

## Scripts

```sh
bun run dev          # Vite dev server (no D1 bindings)
bun run build        # Production build → .output/
bun run build:dev    # Production build in development mode
bun run preview      # Preview the production build locally
bun run test         # Vitest unit tests
bun run lint         # ESLint
bun run format       # Prettier --write
bunx tsc --noEmit    # Type check (src/ only)
bun run assets       # Regenerate brand assets from scripts/generate-brand-assets.ts
```

`scheduler-worker/` is not included in `tsconfig.json`'s `include` array, so `bunx tsc --noEmit` does not type-check it. Review changes manually when you modify it.

---

## Database

Migrations live in `migrations/d1/` and are applied with Wrangler:

```sh
# Local development
bunx wrangler d1 migrations apply webwatch --local

# Production
bunx wrangler d1 migrations apply webwatch --remote
```

Nine tables across 6 migration files:

| Table | Purpose |
|---|---|
| `users` | Accounts identified by email; linked Telegram `chat_id` |
| `sessions` | 30-day HTTP sessions; `token_hash` is SHA-256 of the raw cookie token |
| `otp_codes` | 6-digit login codes, 5-minute TTL, single-use, up to 5 failed attempts |
| `telegram_links` | One-time deep-link tokens consumed by the bot's `/start <token>` flow |
| `sites` | Monitored URLs with all monitoring configuration |
| `checks` | Per-probe results: status code, response time, error message |
| `incidents` | Downtime windows; `resolved_at` is `NULL` while ongoing |
| `api_keys` | Per-site Bearer keys for APM ingestion (prefix `ww_`) |
| `apm_events` | Frontend and backend error records |

All timestamps are ISO-8601 UTC strings (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`).

Full schema with column notes: [DESIGN.md §6](./DESIGN.md#6-data-model-cloudflare-d1).

---

## SDK usage

The browser/Node SDK is served from your own deployment as a plain ES module. No npm install, no third-party CDN.

```js
import { WebWatch } from "https://your-domain.example/api/public/sdk";

// second argument is your ingest endpoint
WebWatch.init("ww_your_api_key", "https://your-domain.example/api/ingest");
```

`init()` automatically captures:
- `window.onerror` → `frontend_error`
- `window.onunhandledrejection` → `frontend_promise_error`

**Express error handler:**

```js
import { WebWatch } from "https://your-domain.example/api/public/sdk";

WebWatch.init("ww_your_api_key", "https://your-domain.example/api/ingest");

// Register after all other middleware so it catches errors from the whole stack
app.use(WebWatch.expressErrorHandler());
```

**Manual capture:**

```js
await WebWatch.capture(
  "api_error",              // event type
  "Payment gateway timeout", // message
  error.stack,              // stack trace (nullable)
  "/api/pay",               // url
  "POST"                    // method
);
```

> The `packages/webwatch-sdk/` directory in this repository is **not** the working SDK. It hardcodes a placeholder ingest URL and is not wired into the workspace build. Always use the SDK served from `/api/public/sdk` on your deployment. See [DESIGN.md §18](./DESIGN.md#18-known-gaps--technical-debt) for details.

### Manual ingestion (any language)

```http
POST https://your-domain.example/api/ingest
Authorization: Bearer ww_your_api_key
Content-Type: application/json
```

```json
{
  "events": [
    {
      "type": "backend_error",
      "message": "TypeError: cannot read property 'id' of undefined",
      "stack_trace": "TypeError: ...\n    at handler (/app/routes/orders.js:42:10)",
      "url": "/api/orders/42",
      "method": "GET",
      "environment": "production"
    }
  ]
}
```

All fields except `type` and `message` are optional. `environment` defaults to `"production"`.

**Response codes:**

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "ok": true, "ingested": N }` | Events accepted |
| `401` | `{ "error": "missing_token" }` | No `Authorization` header |
| `401` | `{ "error": "invalid_key" }` | Key not found |
| `403` | `{ "error": "site_not_verified" }` | Domain not yet verified |
| `400` | `{ "error": "invalid_payload" }` | `events` missing or not an array |
| `400` | `{ "error": "bad_request" }` | Malformed JSON or insert failure |

Create and rotate API keys from **Site detail → API Keys** in the dashboard.

---

## Domain verification

APM ingestion is rejected with `403 site_not_verified` until you prove you control the domain:

1. Open the site in the dashboard and copy its verification token.
2. Create `webwatch-verify.txt` in the web root of that site containing exactly that token.
3. Click **Verify** in the dashboard.

The verifier fetches `GET <site-url>/webwatch-verify.txt` (User-Agent: `WebWatch-Verifier/1.0`, 10-second timeout). If the response body contains the token, the site is marked `verified` and the ingestion endpoint opens for that API key.

Uptime monitoring is not gated on verification and starts immediately when a site is created.

---

## Telegram bot

After connecting your Telegram chat via the login flow, these commands are available:

| Command | Description |
|---|---|
| `/start` | Connect your chat to your account (consumes the login deep link token). |
| `/help` | Print the command list. |
| `/addsite <url> [interval_minutes]` | Add a site; `interval_minutes` defaults to 5. |
| `/listsite` / `/status` | List your sites with status icons, short IDs, and intervals. |
| `/removesite <id>` | Delete a site permanently. |
| `/pause <id>` | Pause monitoring; resets the consecutive failure counter. |
| `/resume <id>` | Resume monitoring. |
| `/history <id>` | 30-day uptime percentage and last 5 incidents with durations. |

Site IDs in commands are the first 8 characters of the UUID. The lookup is a prefix match and must resolve to exactly one site, otherwise the bot replies with an error.

The bot processes the same SSRF guard as the dashboard: private IP ranges, `localhost`, `.local`, and `.internal` hostnames are rejected.

---

## API reference

All error responses use `{ "error": "<snake_case_machine_code>" }`.

### Public endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ingest` | `Bearer <api_key>` | APM batch ingestion |
| `GET` | `/api/public/sdk` | — | Browser SDK (JS ESM module, 1 h cache) |
| `GET` | `/api/system-status` | — | Status page data and platform metrics |
| `POST` | `/api/public/cron/run` | `x-webwatch-cron` header | Trigger monitor run manually |
| `POST` | `/api/public/telegram/webhook` | `x-telegram-bot-api-secret-token` | Telegram update receiver |
| `POST` | `/api/auth/otp` | — | Request OTP or Telegram deep link |
| `GET` | `/api/auth/link-status` | — | `?email=` → `linked` / `pending` / `expired` |
| `POST` | `/api/auth/verify` | — | Exchange OTP for a session cookie |
| `GET` | `/api/auth/me` | session (optional) | Current authenticated user |
| `POST` | `/api/auth/logout` | session | Destroy the session cookie |

### Authenticated endpoints (session cookie required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sites` | List your sites |
| `POST` | `/api/sites` | Create a site |
| `PATCH` | `/api/sites` | Update settings or toggle `is_active` |
| `DELETE` | `/api/sites` | Delete a site |
| `GET` | `/api/sites/detail?id=` | Site detail, 30-day checks (up to 5 000 rows), recent incidents |
| `POST` | `/api/sites/verify` | Run domain verification |
| `GET` | `/api/sites/keys` | List API keys for a site |
| `POST` | `/api/sites/keys` | Issue a new API key |
| `GET` | `/api/sites/events?siteId=` | APM events for a site |
| `GET` | `/api/sites/dashboard` | Recent events and incidents across all sites |

**Create site request body:**

```json
{
  "url": "https://example.com",
  "intervalMinutes": 5,
  "failThreshold": 2,
  "keyword": null,
  "ssl": false
}
```

`intervalMinutes` is clamped to 1–1440. `failThreshold` is clamped to 1–100.

---

## Deployment

Deploy the main worker before the scheduler — the scheduler's service binding must resolve to an existing worker named `webwatch`.

```sh
# 1. Apply the schema to production D1
bunx wrangler d1 migrations apply webwatch --remote

# 2. Build the worker bundle
bun run build

# 3. Set secrets on the main worker (once; skip if already set)
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_BOT_USERNAME
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET

# 4. Deploy the main worker
bunx wrangler deploy

# 5. Set the scheduler secret and deploy it
bunx wrangler secret put CRON_SECRET --config scheduler-worker/wrangler.jsonc
bunx wrangler deploy --config scheduler-worker/wrangler.jsonc
```

### Register the Telegram webhook

Run once after the main worker is live:

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=https://your-domain.example/api/public/telegram/webhook" \
  --data-urlencode "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

---

## Project structure

```
webwatch/
├── src/
│   ├── server.ts                    # Worker entry: captures env, normalizes 500s from h3
│   ├── start.ts                     # TanStack Start middleware (error handler + CSRF)
│   ├── router.tsx                   # Router factory with TanStack Query
│   ├── styles.css                   # Tailwind v4 theme tokens (OKLCH palette)
│   ├── routes/
│   │   ├── index.tsx                # Landing page
│   │   ├── auth.tsx                 # 3-step OTP login
│   │   ├── docs.tsx                 # In-app documentation
│   │   ├── status.tsx               # Public status page
│   │   ├── api/                     # Route handlers (see API reference)
│   │   └── _authenticated/          # Session-guarded pages
│   ├── lib/
│   │   ├── monitor-core.ts          # Pure monitoring state machine (unit-tested)
│   │   ├── monitor.server.ts        # HTTP probe, SSL check, incident lifecycle
│   │   ├── auth.server.ts           # OTP, sessions, SHA-256 helpers
│   │   ├── auth-flows.server.ts     # HTTP-shaped auth operations
│   │   ├── sites-api.server.ts      # Site CRUD + domain verification + SSRF guard
│   │   ├── bot.server.ts            # Telegram command dispatcher
│   │   ├── telegram.server.ts       # sendTelegram + message formatters
│   │   └── wrangler-env.ts          # Sole accessor for D1 binding and secrets
│   ├── components/
│   │   ├── app/                     # Authenticated shell (sidebar, stat cards, etc.)
│   │   ├── marketing/               # Landing page blocks
│   │   └── ui/                      # shadcn/ui primitives (generated — do not hand-edit)
│   └── hooks/
├── packages/webwatch-sdk/           # npm package source (not wired into workspace)
├── scheduler-worker/                # Cron worker → main worker via service binding
├── migrations/d1/                   # D1 SQL migrations (0001–0006)
├── public/                          # Static assets: logo, OG image, favicon
├── scripts/                         # Brand asset generation
├── wrangler.jsonc                   # Main worker Wrangler config
└── scheduler-worker/wrangler.jsonc  # Scheduler Wrangler config
```

Key convention: modules containing server-only code (D1 access, secrets, outbound requests) are named `*.server.ts`. The ESLint config enforces this boundary.

---

## Testing

```sh
bun run test
```

Vitest runs in the Node environment and discovers `src/**/*.test.ts`. Two test files cover the core logic:

**`src/lib/monitor-core.test.ts`** — pure state machine:
- Status evaluation: threshold transitions, failure counter reset on success
- `unknown → up` does not emit RECOVERED (no incident to close)
- Notification cooldown: boundary conditions for `isInCooldown`
- SSL warning suppression: threshold and 24-hour repeat logic

**`src/lib/telegram-server.test.ts`** — message formatting:
- `escapeHtml`: `&`, `<`, `>` escaping
- `humanDuration`: Indonesian time rendering, minimum 1-minute rounding
- `formatDownMessage`, `formatRecoveryMessage`, `formatSslWarningMessage`: full message content and escaping

Tests in `scheduler-worker/` and `packages/` are not discovered by Vitest.

---

## Troubleshooting

**`Error: DB binding is not available` / `getAppEnv() called before setAppEnv()`**

You are running `bun run dev` (Vite dev server). D1 bindings are unavailable in this mode. Switch to:

```sh
bun run build && bunx wrangler dev
```

Ensure migrations have been applied first: `bunx wrangler d1 migrations apply webwatch --local`.

---

**`TELEGRAM_BOT_TOKEN is not configured`**

The secret is missing. For production: `bunx wrangler secret put TELEGRAM_BOT_TOKEN`. For local `wrangler dev`: create `.dev.vars` in the project root:

```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=any_random_string
```

This file is gitignored. Wrangler reads it automatically.

---

**`403 site_not_verified` from `/api/ingest`**

APM ingestion is blocked until you verify domain ownership. Host `webwatch-verify.txt` at the site's web root containing its verification token, then click **Verify** in the dashboard.

---

**Scheduler shows `outage` on the status page**

The status page infers scheduler health from the most recent `checks` row. If no site probe has run in the last 10 minutes (for example, no sites are due for a check), it reports `outage` — this is a false alarm. Confirm the scheduler worker is deployed and that `CRON_SECRET` is set correctly.

---

**`url_taken` when creating a site**

URLs are globally unique across all accounts. The same URL cannot be monitored by two different accounts simultaneously. Remove it from the other account first, or contact the administrator.

---

## Known limitations

These are real implementation gaps documented in [DESIGN.md §18](./DESIGN.md#18-known-gaps--technical-debt). They are listed here so you set correct expectations before deploying.

| Gap | Impact |
|---|---|
| `/api/ingest` has no rate limiting | A single API key can insert unbounded rows |
| `apm_events` are never purged | The table grows without bound |
| `packages/webwatch-sdk/` hardcodes a placeholder ingest URL | The npm package is unusable as-is; use the SDK served from `/api/public/sdk` |
| SSRF guard inspects hostname string only, no DNS resolution | Hostnames that resolve to private IPs are not blocked |
| `sessions` rows are never garbage-collected after expiry | Slow table growth over time |
| Status page infers scheduler liveness from `checks` rows | Can report false `outage` when no sites are currently due |
| `api_keys.key` is stored in plaintext (it is the PK) | A database leak yields directly usable ingest credentials |
| `TELEGRAM_WEBHOOK_SECRET` guards three surfaces (webhook, cron, scheduler) | One leaked secret disables all three |

---

## Documentation

| Document | Contents |
|---|---|
| [DESIGN.md](./DESIGN.md) | Architecture, data model, request flows, monitoring state machine, security model, known gaps |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Design tokens, OKLCH colour palette, component conventions |
| [AGENTS.md](./AGENTS.md) | Architecture invariants, coding conventions, contribution guidance |
| `/docs` | In-app user-facing integration guide |
| `/status` | Live platform status and metrics |
| `src/routes/README.md` | TanStack Router file-naming conventions |

---

## License

All rights reserved. No license is granted to use, copy, modify, or distribute this software without explicit written permission from the author.

A `LICENSE` file, `CONTRIBUTING.md`, and `SECURITY.md` do not yet exist in this repository. Recommended follow-up work:

- Add a `LICENSE` file that formally states the terms above.
- Add `SECURITY.md` with a responsible disclosure contact.
- Add `CONTRIBUTING.md` (or expand `AGENTS.md`) with a pull-request workflow and issue reporting process.
