# WebWatch — APM & Uptime Monitoring

WebWatch is an edge-native monitoring platform that combines **synthetic uptime monitoring** with
**Application Performance Monitoring (APM)**. It probes your URLs on a schedule, reports crashes
from inside your application, and pushes every critical alert to Telegram the moment it happens.

No passwords. No agents to install. No infrastructure to operate.

---

## Features

- **Uptime monitoring** — HTTP(S) probes on a per-site interval (1–1440 minutes) with failure
  thresholds, keyword assertions, and response-time tracking.
- **APM ingestion** — a tiny browser SDK reports frontend errors, unhandled promise rejections, and
  backend exceptions to a batch ingestion endpoint.
- **Domain verification** — prove you own a domain by hosting a `webwatch-verify.txt` file before
  APM telemetry is accepted for it.
- **Telegram alerting** — instant DOWN / RECOVERED / SSL-expiry / APM-error notifications, plus a
  full bot command interface for managing monitors on the go.
- **Passwordless authentication** — sign in with a 6-digit code delivered to your Telegram chat.
- **Public status page** — live platform health and metrics at `/status`.
- **In-app documentation** — a complete guide at `/docs`.
- **Multi-tenant by design** — every query is scoped to the authenticated account.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend / SSR | TanStack Start (React 19 + TanStack Router + TanStack Query) |
| UI | Tailwind CSS v4, shadcn/ui, Radix, Framer Motion, Recharts |
| Backend API | TanStack Start route handlers on Nitro/h3, deployed as a Cloudflare Worker |
| Database | Cloudflare D1 (SQLite) |
| Scheduler | A dedicated Cloudflare Worker with a `* * * * *` cron trigger |
| Auth | Session cookie + OTP over Telegram (no passwords) |
| Notifications | Telegram Bot API (webhook mode) |
| Tooling | Bun, TypeScript, Vite, Vitest, ESLint, Prettier |

---

## Quick start

Requires [Bun](https://bun.sh) (Node.js works too) and a Cloudflare account.

```sh
git clone https://github.com/hsanmz/webwatch.git
cd webwatch
bun i
bun run dev
```

`bun run dev` starts the Vite dev server, but **Cloudflare bindings (D1) are not injected in this
mode**. For anything that touches the database, use the full worker runtime:

```sh
bun run build
bunx wrangler d1 migrations apply webwatch --local
bunx wrangler dev
```

### Configuration

Secrets are set as Cloudflare Worker secrets — never commit them.

```sh
bunx wrangler secret put TELEGRAM_BOT_TOKEN      # Bot API token from @BotFather
bunx wrangler secret put TELEGRAM_BOT_USERNAME   # Bot username without "@"
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET # Shared secret for webhook + cron
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | main worker | Authenticates outgoing `sendMessage` calls. |
| `TELEGRAM_BOT_USERNAME` | main worker | Used to build `https://t.me/<bot>?start=<token>` login deep links. |
| `TELEGRAM_WEBHOOK_SECRET` | main worker | Guards the Telegram webhook **and** the manual cron endpoint. |
| `CRON_SECRET` | scheduler worker | Sent as `x-webwatch-cron`. Must equal `TELEGRAM_WEBHOOK_SECRET`. |

---

## Project structure

```
webwatch/
├── src/
│   ├── server.ts                    # Worker entry: captures env, normalizes h3-swallowed 500s
│   ├── start.ts                     # TanStack Start middleware (error handler + CSRF)
│   ├── router.tsx                   # Router factory with TanStack Query
│   ├── styles.css                   # Tailwind v4 theme tokens (OKLCH)
│   ├── routes/
│   │   ├── index.tsx                # Landing page
│   │   ├── auth.tsx                 # OTP login (email → Telegram link → code)
│   │   ├── docs.tsx                 # In-app documentation
│   │   ├── status.tsx               # Public status page
│   │   ├── _authenticated/          # Guarded area: dashboard, monitors, apm, incidents, sites.$id
│   │   └── api/                     # Route handlers (see the API reference below)
│   ├── lib/                         # Server logic (see DESIGN.md)
│   ├── components/{app,marketing,ui}/
│   ├── hooks/
│   └── types/d1.d.ts                # Ambient D1 types
├── packages/webwatch-sdk/           # @webwatch/sdk — npm package source
├── scheduler-worker/                # Cron worker → main worker over a service binding
├── server/plugins/env.ts            # Nitro plugin: captures the Worker env per request
├── migrations/d1/                   # D1 migrations (0001 … 0006)
└── wrangler.jsonc                   # Main worker config
```

Full architecture, data model, and runtime flows: **[DESIGN.md](./DESIGN.md)**.

---

## Database

D1 migrations live in `migrations/d1/`.

```sh
bunx wrangler d1 migrations apply webwatch --remote   # production
bunx wrangler d1 migrations apply webwatch --local    # local dev
```

Nine tables: `users`, `sessions`, `otp_codes`, `telegram_links`, `sites`, `checks`, `incidents`,
`api_keys`, `apm_events`. See [DESIGN.md §6](./DESIGN.md#6-data-model-cloudflare-d1) for the full
schema.

---

## Scripts

```sh
bun run dev          # Vite dev server
bun run build        # Production build (Nitro → .output/, cloudflare-module)
bun run build:dev    # Production build in development mode
bun run preview      # Preview the build output
bun run test         # Vitest unit tests
bun run lint         # ESLint
bun run format       # Prettier write
bunx tsc --noEmit    # Type check
```

---

## SDK usage

The browser SDK is served straight from your own deployment, so there is no third-party CDN to
trust.

```js
// main.js
import { WebWatch } from "https://webwatch.example/api/public/sdk";

WebWatch.init("ww_your_api_key", "https://webwatch.example/api/ingest");
```

`init()` automatically captures `window.onerror` (`frontend_error`) and `unhandledrejection`
(`frontend_promise_error`). For an Express backend:

```js
import { WebWatch } from "https://webwatch.example/api/public/sdk";

WebWatch.init("ww_your_api_key", "https://webwatch.example/api/ingest");
app.use(WebWatch.expressErrorHandler()); // register last
```

Manual capture is also available:

```js
await WebWatch.capture("api_error", "Payment gateway timeout", stack, "/api/pay", "POST");
```

### Manual ingestion (any language)

```http
POST https://webwatch.example/api/ingest
Authorization: Bearer ww_your_api_key
Content-Type: application/json
```

```json
{
  "events": [
    {
      "type": "backend_error",
      "message": "TypeError: cannot read property 'id' of undefined",
      "stack_trace": "TypeError: ...",
      "url": "/api/orders/42",
      "method": "GET",
      "environment": "production"
    }
  ]
}
```

Responses: `200 { "ok": true, "ingested": 1 }`, `401 missing_token` / `invalid_key`,
`403 site_not_verified`, `400 invalid_payload` / `bad_request`.

Create and rotate API keys from **Site detail → API Keys** in the dashboard.

---

## Domain verification

Before a site can send APM telemetry, prove you control the domain:

1. Open the site in the dashboard and copy its verification token.
2. Create `webwatch-verify.txt` in the site's web root containing that token.
3. Click **Verify** in the dashboard.

The verifier issues `GET <site-url>/webwatch-verify.txt` with a 10-second timeout and marks the
site `verified` when the token matches. Until then, `/api/ingest` returns
`403 site_not_verified` for that site. Uptime monitoring is not affected by verification.

---

## Telegram bot

| Command | Description |
| --- | --- |
| `/start` | Connect your Telegram chat to your account (consumes the login deep link). |
| `/help` | List available commands. |
| `/addsite <url> [interval_minutes]` | Add a monitored site. |
| `/listsite`, `/status` | List your sites and their status. |
| `/removesite <id>` | Delete a site. |
| `/pause <id>` / `/resume <id>` | Pause or resume monitoring. |
| `/history <id>` | 30-day uptime percentage and recent incidents. |

Site ids are the first 8 characters of the site's uuid.

---

## API reference

### Public

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/ingest` | `Bearer <api_key>` | APM batch ingestion. |
| `GET` | `/api/public/sdk` | — | Browser SDK source. |
| `GET` | `/api/system-status` | — | Status page payload and metrics. |
| `POST` | `/api/public/cron/run` | `x-webwatch-cron` header | Manual monitor trigger. |
| `POST` | `/api/public/telegram/webhook` | `x-telegram-bot-api-secret-token` header | Telegram webhook. |
| `POST` | `/api/auth/otp` | — | Request an OTP or a Telegram deep link. |
| `GET` | `/api/auth/link-status` | — | `?email=` → `linked` / `pending` / `expired`. |
| `POST` | `/api/auth/verify` | — | Exchange the OTP for a session cookie. |
| `GET` | `/api/auth/me` | session (optional) | Current user. |
| `POST` | `/api/auth/logout` | session | Destroy the session. |

### Authenticated (session cookie)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/sites` | List your sites. |
| `POST` | `/api/sites` | Create a site (`url`, `intervalMinutes`, `failThreshold`, `keyword`, `ssl`). |
| `PATCH` | `/api/sites` | Update settings or pause/resume. |
| `DELETE` | `/api/sites` | Delete a site. |
| `GET` | `/api/sites/detail?id=` | Site, 30-day checks, recent incidents. |
| `POST` | `/api/sites/verify` | Run domain verification. |
| `GET` `POST` | `/api/sites/keys` | List / issue API keys. |
| `GET` | `/api/sites/events?siteId=` | APM events for a site. |
| `GET` | `/api/sites/dashboard` | Recent events and incidents across all sites. |

Errors use `{ "error": "<code>" }` — e.g. `unauthorized`, `url_taken`, `not_found`,
`site_not_verified`, `rate_limited`.

---

## Deployment

```sh
bunx wrangler d1 migrations apply webwatch --remote          # 1. schema
bun run build                                                # 2. build
bunx wrangler secret put TELEGRAM_BOT_TOKEN                  # 3. secrets (once)
bunx wrangler secret put TELEGRAM_BOT_USERNAME
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
bunx wrangler deploy                                         # 4. main worker
bunx wrangler secret put CRON_SECRET --config scheduler-worker/wrangler.jsonc
bunx wrangler deploy --config scheduler-worker/wrangler.jsonc  # 5. scheduler
```

Deploy the scheduler **after** the main worker so its service binding resolves.

Register the Telegram webhook once the worker is live:

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=https://webwatch.example/api/public/telegram/webhook" \
  --data-urlencode "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### Why two workers

The main worker is built with Nitro's `cloudflare-module` preset, which swallows the `scheduled`
event — a cron trigger cannot be attached to it. `scheduler-worker/` is a tiny, framework-free
worker with a native `* * * * *` cron that calls the main worker over a **service binding**, so
no public egress path is involved.

---

## Testing

```sh
bun run test
```

Vitest covers the pure logic that is easiest to get subtly wrong:

- status evaluation (thresholds, transitions, failure-counter reset)
- notification cooldown
- SSL expiry warning thresholds
- Telegram message formatting and HTML escaping

---

## Documentation

| Document | Contents |
| --- | --- |
| [DESIGN.md](./DESIGN.md) | Architecture, data model, request flows, monitoring algorithm, security model, known gaps. |
| [AGENTS.md](./AGENTS.md) | Conventions and invariants for contributors and coding agents. |
| `/docs` (in-app) | User-facing integration guide. |
| `/status` (public) | Live platform status and metrics. |
| `src/routes/README.md` | TanStack Router file-naming conventions. |

---

## License

All rights reserved. See the repository for details.
