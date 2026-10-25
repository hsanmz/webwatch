# WebWatch

**Modern, edge-first Application Performance Monitoring (APM) and error tracking — running entirely on Cloudflare Workers + D1.**

WebWatch captures runtime exceptions and crashes across your backend services and frontend applications via a lightweight SDK, persists them to Cloudflare D1, delivers instant notifications to Telegram, and visualizes issues in a clean developer dashboard. Zero server agents, zero VMs, zero background queues.

> **Note:** WebWatch previously included synthetic uptime monitoring (periodic ping probes, incidents, SSL expiry tracking). That feature set has been completely **removed**. WebWatch is now exclusively focused on APM and runtime error tracking.

---

## Features

- **APM Error Ingestion** — Send batched error events (`backend_error`, `frontend_error`, `api_error`, etc.) directly to `POST /api/ingest`, authenticated with a per-site API key (`Authorization: Bearer ww_...`).
- **Dual SDK Distribution Channels**:
  - **`@webwatch/sdk` (npm package)**: Zero-config setup via environment variables (`WEBWATCH_KEY` & `WEBWATCH_URL`), auto-captures `uncaughtException` and `unhandledRejection`, in-memory batching with exponential backoff retries, plus drop-in middleware for Express, Hono, Fastify, and Next.js.
  - **CDN Browser Build (`/api/public/sdk`)**: A self-hosted zero-install single ES module served directly from your deployment for frontend applications.
- **Domain Verification Gate** — Validates domain ownership via `webwatch-verify.txt` before APM telemetry is accepted, preventing cross-tenant domain squatting.
- **Instant Telegram Alerts** — Critical crashes and exceptions trigger immediate HTML-formatted alerts to your linked Telegram chat, including stack trace snippets, URL, method, and environment. Login OTP codes are also delivered via the same chat.
- **Web Dashboard & Site Management** — Browse exception streams, filter by environment, inspect formatted stack traces, manage per-site API keys, and toggle telemetry collection.
- **Public System Status** — Built-in public status endpoint and dashboard at `/status`.

---

## Architecture

```
┌────────────────────────────┐        ┌────────────────────────────┐
│   Client Application (Web) │        │  Backend Service (Server)  │
│   SDK via /api/public/sdk  │        │   @webwatch/sdk (npm)      │
└─────────────┬──────────────┘        └─────────────┬──────────────┘
              │       POST /api/ingest (Bearer ww_) │
              ▼                                     ▼
      ┌───────────────────────────────────────────────────┐
      │           Cloudflare Worker "webwatch"            │
      │     TanStack Start + Nitro (cloudflare-module)    │
      │  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
      │  │ Dashboard/UI │  │ Ingestion  │  │ Telegram  │  │
      │  │ (SSR/React)  │  │ Endpoint   │  │ Bot & OTP │  │
      │  └──────────────┘  └────────────┘  └───────────┘  │
      └───────────────────────────┬───────────────────────┘
                                  ▼
                            ┌──────────┐
                            │Cloudflare│
                            │    D1    │
                            └──────────┘
```

A single stateless Cloudflare Worker handles web rendering, error ingestion, API endpoints, and the Telegram bot webhook.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) package manager
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Local Development

```sh
# 1. Install dependencies
bun i

# 2. Apply local D1 database migrations
bunx wrangler d1 migrations apply webwatch --local

# 3. Build application and start local Wrangler dev server (with D1 bindings)
bun run build && bunx wrangler dev
```

> **Important:** `bun run dev` (Vite dev server) cannot inject Cloudflare D1 bindings directly. Any code path that interacts with the database should be run via `bun run build && bunx wrangler dev`.

### Deployment

```sh
# 1. Apply D1 migrations to remote database
bunx wrangler d1 migrations apply webwatch --remote

# 2. Build and deploy Worker
bun run build
bunx wrangler deploy
```

Configure required Cloudflare secrets (never commit these):

```sh
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Register your Telegram webhook:

```sh
curl -F "url=https://<your-deployment-domain>/api/public/telegram/webhook" \
     -F "secret_token=<YOUR_TELEGRAM_WEBHOOK_SECRET>" \
     https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

---

## Environment Variables & Bindings

| Name                      | Type           | Purpose                                                      |
| ------------------------- | -------------- | ------------------------------------------------------------ |
| `DB`                      | D1 binding     | Primary SQLite database (`d1_databases` in `wrangler.jsonc`) |
| `ASSETS`                  | Assets binding | Static build assets served by Cloudflare                     |
| `TELEGRAM_BOT_TOKEN`      | Secret         | Telegram Bot API authentication token                        |
| `TELEGRAM_WEBHOOK_SECRET` | Secret         | Verifies `x-telegram-bot-api-secret-token` header            |
| `TELEGRAM_BOT_USERNAME`   | Var (optional) | Fallback bot handle for UI connection links                  |

---

## Application Route Map

### Web Pages

| Route        | Access        | Description                                         |
| ------------ | ------------- | --------------------------------------------------- |
| `/`          | Public        | Marketing landing page and platform features        |
| `/docs`      | Public        | Complete SDK guides, API docs, and architecture     |
| `/status`    | Public        | Real-time service status dashboard                  |
| `/auth`      | Public        | Passwordless email login via Telegram OTP           |
| `/dashboard` | Authenticated | Overview of monitored sites and recent exceptions   |
| `/sites/$id` | Authenticated | Site detail: API keys, error log stream, settings   |
| `/apm`       | Authenticated | Centralized APM error log explorer across all sites |
| `/settings`  | Authenticated | Account preferences and linked Telegram account     |

### API Endpoints

| Endpoint                            | Auth           | Description                                             |
| ----------------------------------- | -------------- | ------------------------------------------------------- |
| `POST /api/ingest`                  | Bearer `ww_…`  | Ingest batches of error events from SDKs                |
| `GET /api/public/sdk`               | Public         | Self-hosted browser SDK script (ES module)              |
| `POST /api/public/telegram/webhook` | Secret header  | Inbound webhook from Telegram Bot API                   |
| `GET /api/system-status`            | Public         | System status metrics JSON                              |
| `GET /api/auth/me`                  | Session cookie | Returns current authenticated user                      |
| `POST /api/auth/otp`                | Public         | Sends 6-digit login OTP to linked Telegram chat         |
| `POST /api/auth/verify`             | Public         | Validates OTP and issues session cookie                 |
| `GET /api/auth/link-status`         | Public         | Polls Telegram account linking status                   |
| `POST /api/auth/logout`             | Session cookie | Clears active session                                   |
| `GET /api/sites`                    | Session        | Lists user's monitored sites                            |
| `POST /api/sites`                   | Session        | Registers a new site                                    |
| `PATCH /api/sites`                  | Session        | Updates site name or active/pause status                |
| `DELETE /api/sites`                 | Session        | Deletes a site and associated keys                      |
| `GET /api/sites/detail?id=`         | Session        | Retrieves site details with recent event logs           |
| `GET /api/sites/dashboard`          | Session        | Recent cross-site event feed for dashboard              |
| `GET /api/sites/events?siteId=`     | Session        | Retrieves event history for a specific site             |
| `GET /api/sites/keys?siteId=`       | Session        | Lists API keys for a site                               |
| `POST /api/sites/keys`              | Session        | Generates a new API key (`ww_` + 24-byte hex)           |
| `POST /api/sites/verify`            | Session        | Verifies domain ownership via webwatch-verify.txt probe |

All API error responses follow the standard format: `{ "error": "<machine_code>" }`.

---

## SDK Integration

### 1. The `@webwatch/sdk` npm Package (Node.js, Bun, Edge)

Install the zero-dependency package:

```sh
npm install @webwatch/sdk
# or
bun add @webwatch/sdk
```

Configure environment variables:

```sh
export WEBWATCH_KEY="ww_your_api_key_here"
export WEBWATCH_URL="https://your-webwatch-instance.com"
```

Initialize once at your application root:

```js
import "@webwatch/sdk";
```

#### Framework Middleware Helpers

**Express:**

```js
import express from "express";
import { expressErrorMiddleware, wrapAsync } from "@webwatch/sdk/express";

const app = express();
app.get(
  "/users",
  wrapAsync(async (req, res) => res.json({ ok: true })),
);

// Register error middleware after all application routes
app.use(expressErrorMiddleware());
```

**Hono:**

```js
import { Hono } from "hono";
import { honoOnError } from "@webwatch/sdk/hono";

const app = new Hono();
app.onError(honoOnError());
```

**Fastify:**

```js
import Fastify from "fastify";
import { fastifyErrorHandler } from "@webwatch/sdk/fastify";

const app = Fastify();
app.setErrorHandler(fastifyErrorHandler());
```

**Next.js (App Router / Pages):**

```ts
// instrumentation.ts (in root or src/ directory)
export async function register() {
  await import("@webwatch/sdk/next").then((m) => m.register());
}
```

### 2. Browser Zero-Install CDN Script

```html
<script type="module">
  import { WebWatch } from "https://your-webwatch-instance.com/api/public/sdk";
  WebWatch.init("ww_your_api_key_here", "https://your-webwatch-instance.com/api/ingest");
</script>
```

### 3. Manual Error Capture

```js
import { capture, captureError } from "@webwatch/sdk";

try {
  await processPayment();
} catch (err) {
  captureError(err, {
    url: "/api/checkout",
    method: "POST",
  });
}
```

### 4. Docker & Container Environments

No daemons, agents, or sidecars required. Provide your site credentials as runtime environment variables:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    environment:
      - NODE_ENV=production
      - WEBWATCH_KEY=ww_your_api_key_here
      - WEBWATCH_URL=https://your-webwatch-instance.com
    ports:
      - "3000:3000"
```

### 5. Monorepo Setups (Turborepo, Nx, pnpm workspaces)

- **Isolated Projects (Recommended):** Register distinct sites in the WebWatch dashboard for `apps/web` and `apps/api`. Assign each its own API key (`ww_...`) to isolate Telegram alert channels and error streams.
- **Shared Project:** Use a single API key across all workspace apps and distinguish services using the `environment` tag (e.g. `production-web`, `production-api`).
- **Headless API Domain Verification:** If a backend microservice in your monorepo doesn't serve static files, expose a lightweight route to return your verification token:
  ```js
  app.get("/webwatch-verify.txt", (req, res) => res.send("your_verification_token"));
  ```

---

## Ingestion HTTP API

User applications push telemetry batches via `POST /api/ingest`:

```http
POST /api/ingest
Authorization: Bearer ww_your_site_api_key
Content-Type: application/json

{
  "events": [
    {
      "type": "backend_error",
      "message": "Database connection pool exhausted",
      "environment": "production",
      "stack_trace": "Error: Connection timeout\n    at Pool.connect (/app/db.js:42:15)",
      "url": "/api/users",
      "method": "GET",
      "user_agent": "webwatch-sdk/0.1.0 (node/20.10.0)"
    }
  ]
}
```

**Expected Responses:**

- `200 OK` — `{ "ok": true, "ingested": 1 }`
- `401 Unauthorized` — `{ "error": "missing_token" }` or `{ "error": "invalid_key" }`
- `403 Forbidden` — `{ "error": "site_not_verified" }`
- `400 Bad Request` — `{ "error": "invalid_payload" }`

---

## Telegram Bot Commands

| Command            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `/start <token>`   | Links your Telegram account to your WebWatch login email |
| `/help`            | Displays available bot commands                          |
| `/addsite <url>`   | Quickly registers a new site                             |
| `/listsite`        | Lists all registered sites and statuses                  |
| `/removesite <id>` | Removes a site (supports 8-char short ID)                |
| `/pause <id>`      | Pauses APM ingestion for a site                          |
| `/resume <id>`     | Resumes APM ingestion for a site                         |

---

## Database Schema (Cloudflare D1)

| Table            | Key Columns                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `users`          | `id`, `email` (unique), `chat_id`, `tg_username`                                                                    |
| `sessions`       | `token_hash` (PK), `user_id`, `expires_at` (raw cookie never stored in DB)                                          |
| `otp_codes`      | `email`, `code_hash`, `expires_at`, `used`, `attempts`                                                              |
| `telegram_links` | `token` (PK), `email`, `chat_id`, `status` (`pending`/`linked`), `expires_at`                                       |
| `sites`          | `id`, `user_id`, `name`, `url` (globally unique), `is_active`, `verification_token`, `verification_status`          |
| `api_keys`       | `key` (`ww_…`, PK), `site_id`, `name`                                                                               |
| `apm_events`     | `id`, `site_id`, `environment`, `event_type`, `message`, `stack_trace`, `url`, `method`, `user_agent`, `created_at` |

---

## Repository Structure

```
src/
├── routes/                        # TanStack Start file-based routing
│   ├── _authenticated/            # Protected app screens (dashboard, apm, sites.$id, settings)
│   ├── api/                       # HTTP API routes (ingest, sites, auth, telegram webhook)
│   ├── docs.tsx                   # In-app interactive documentation page
│   ├── index.tsx                  # Landing page
│   └── status.tsx                 # Public system status page
├── lib/                           # Core business logic (*.server.ts modules)
│   ├── auth.server.ts             # Session management & OTP logic
│   ├── sites-api.server.ts        # Site lifecycle, API keys, validation
│   ├── bot.server.ts              # Telegram bot interaction & commands
│   ├── telegram.server.ts         # Telegram API client & alert formatting
│   └── wrangler-env.ts            # Single accessor for D1 bindings & secrets
├── components/
│   ├── app/                       # Application shell, sidebar, stat cards, code blocks
│   ├── marketing/                 # Landing page sections
│   └── ui/                        # Accessible UI primitives (shadcn / Radix)
packages/webwatch-sdk/             # Official @webwatch/sdk npm package
migrations/d1/                     # D1 schema migrations (0001–0007)
wrangler.jsonc                     # Cloudflare Worker configuration
```

---

## License

MIT © [HugoEdmoundo](https://github.com/hsanmz/webwatch)
