# WebWatch — Technical Design

> Architecture, data model, and runtime flows of the WebWatch APM & Uptime Monitoring platform.
>
> This document describes **what is actually implemented**. Where the product plan and the
> implementation diverge, the divergence is recorded in [Known Gaps](#18-known-gaps--technical-debt)
> rather than papered over.

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
10. [Monitoring Engine](#10-monitoring-engine)
11. [Notification Model](#11-notification-model)
12. [Telegram Bot Interface](#12-telegram-bot-interface)
13. [Public Status Page](#13-public-status-page)
14. [HTTP API Reference](#14-http-api-reference)
15. [Frontend Route Map](#15-frontend-route-map)
16. [Design System](#16-design-system)
17. [Security Model](#17-security-model)
18. [Known Gaps & Technical Debt](#18-known-gaps--technical-debt)
19. [Deployment Topology](#19-deployment-topology)
20. [Test Strategy](#20-test-strategy)

---

## 1. Product Goals

WebWatch is a self-hosted monitoring platform with two pillars that run side by side:

| Pillar | Direction | Mechanism |
| --- | --- | --- |
| **Synthetic uptime monitoring** | Outbound | The platform probes the user's URL on a schedule, records latency and availability, and raises incidents. |
| **Application performance monitoring (APM)** | Inbound | A tiny SDK embedded in the user's app reports errors to the ingestion endpoint. |

Three constraints shape every design decision:

1. **Edge-native.** Everything runs on Cloudflare Workers + D1. There is no long-lived server, no
   connection pool, and no external queue.
2. **Zero-password authentication.** Users authenticate through Telegram, which removes password
   storage, password reset flows, and credential phishing as an entire class of problem.
3. **Minimal footprint.** The SDK is a single ES module. It never blocks the host application: every
   network call it makes is fire-and-forget and all failures are swallowed.

---

## 2. System Topology

```
                        ┌──────────────────────────────┐
                        │        Cloudflare Edge       │
   Browser ─────────────►            DNS / TLS          │
   SDK    ─────────────►└──────────────────────────────┘
        │  POST /api/ingest (Bearer ww_…)            │
        │  GET  /api/public/sdk                      │
        ▼                                             ▼
┌────────────────────────────────────┐      ┌───────────────────────────────┐
│   Main Worker  "webwatch"          │      │ Scheduler Worker              │
│   (TanStack Start + Nitro,         │      │ "webwatch-scheduler"          │
│    cloudflare-module preset)       │◄─────┤ cron: * * * * *                │
│                                    │      │                               │
│  ┌──────────────────────────────┐  │      │ service binding MAIN ───────►│
│  │ SSR pages                    │  │      └───────────────────────────────┘
│  │ /api/* route handlers         │  │
│  │ Nitro plugin: env capture     │  │
│  └──────────────────────────────┘  │
│                                    │      ┌───────────────────────────────┐
│                                    │      │  Cloudflare D1  "webwatch"     │
│                                    ├─────►│  SQLite · binding "DB"        │
│                                    │      │  migrations/d1/*.sql          │
│                                    │      └───────────────────────────────┘
│                                    │
│  ┌──────────────────────────────┐  │      ┌───────────────────────────────┐
│  │ POST /api/public/cron/run    │──┼─────►│  Telegram Bot API             │
│  │ POST /api/public/telegram/…  │──┼─────►│  sendMessage / setWebhook     │
│  └──────────────────────────────┘  │      └───────────────────────────────┘
└────────────────────────────────────┘
```

### Why the scheduler is a separate Worker

The main worker is built with Nitro's `cloudflare-module` preset. That preset wraps the user's
worker in a generated module and **swallows the `scheduled` event** — the framework's own handler
receives the event and the application's `export default { scheduled }` never fires. Trying to
register a cron trigger on the main worker is therefore not possible.

`scheduler-worker/` is a deliberately tiny, framework-free Worker that:

1. is triggered by a **platform-native** Cloudflare Cron Trigger (`* * * * *`),
2. calls the main worker over a **Service Binding** (`MAIN` → service `webwatch`), which means no
   public URL and no public egress path is involved,
3. authenticates with a shared secret header `x-webwatch-cron`.

This keeps the monitor driver independent of framework internals and of isolate warm-up.

### Service bindings vs. public URLs

`scheduler-worker/wrangler.jsonc` sets `TARGET_URL` to `https://webwatch/api/public/cron/run`.
The hostname `webwatch` here is the **service-binding hostname**, not a `workers.dev` domain.
Service bindings bypass public DNS, so the guarded endpoint is never exposed to the open internet
via the scheduler path (it remains reachable on its public URL, which is why the secret check
still exists).

---

## 3. Component Breakdown

### 3.1 `src/routes/` — HTTP surface

TanStack Start file-based routing. Every `.tsx` file is a route; `src/routeTree.gen.ts` is
generated and must never be hand-edited.

| Path | File | Purpose |
| --- | --- | --- |
| `/` | `index.tsx` | Marketing landing page (parallax hero, bento features, pricing, FAQ). |
| `/auth` | `auth.tsx` | 3-step OTP login: email → Telegram deep link → 6-digit code. |
| `/docs` | `docs.tsx` | In-app documentation site (7 sections, scroll-spy sidebar). |
| `/status` | `status.tsx` | Public status page, polls `/api/system-status` every 60 s. |
| `/dashboard` | `_authenticated/dashboard.tsx` | Overview: stat cards, top exceptions, active incidents. |
| `/monitors` | `_authenticated/monitors.tsx` | Site CRUD grid, create/verify/pause/delete. |
| `/apm` | `_authenticated/apm.tsx` | APM event stream across all sites. |
| `/incidents` | `_authenticated/incidents.tsx` | Incident history with resolved/ongoing state. |
| `/sites/$id` | `_authenticated/sites.$id.tsx` | Detail view: uptime charts, settings, API keys, SDK install, logs. |

### 3.2 `src/lib/` — server logic

| Module | Responsibility |
| --- | --- |
| `wrangler-env.ts` | Sole accessor for the D1 binding and Telegram secrets. Exports `db()`, `getAppEnv()`, `setAppEnv()`, and the `AppEnv` type. |
| `auth.server.ts` | Primitive auth primitives: OTP issue/verify, session issue/destroy, cookie helpers, SHA-256 hashing, `ensureUser`. |
| `auth-flows.server.ts` | HTTP-shaped auth flows (`requestOtp`, `linkStatus`, `verifyOtpLogin`, `currentUser`, `logout`). |
| `sites-api.server.ts` | Site CRUD + domain verification. Contains the SSRF guard in `normalizeUrl()`. |
| `monitor-core.ts` | **Pure** monitoring state machine: `evaluateStatus`, `isInCooldown`, `shouldWarnSsl`. No I/O — this is what unit tests cover. |
| `monitor.server.ts` | Monitoring engine: HTTP probe, SSL inspection, incident lifecycle, Telegram dispatch, retention purge. |
| `telegram.server.ts` | Telegram transport (`sendTelegram`) and all message formatters. |
| `bot.server.ts` | Telegram command dispatcher (`handleTelegramUpdate`). |
| `error-capture.ts` | Monkey-patches `console.error` to record and expand the last thrown error out-of-band. |
| `error-page.ts` | Renders the standalone HTML fallback page for catastrophic SSR failures. |
| `api.ts` | Typed client-side fetch helper (`api<T>`) used by React Query hooks. |
| `utils.ts` | `cn()` — `clsx` + `tailwind-merge` class combiner. |

**Naming convention:** modules containing server-only code are suffixed `.server.ts`. The ESLint
config bans importing Next.js's `server-only` package and tells you to use this convention instead.

### 3.3 `src/components/`

- `app/` — authenticated shell: `app-shell`, `app-sidebar`, `page-header`, `profile-dropdown`,
  `site-card`, `stat-card`, `status-badge`.
- `marketing/` — landing-page blocks: `bento-features`, `status-board`, `telegram-alerts`.
- `ui/` — 53 shadcn/ui primitives (Radix + CVA + Tailwind). Generated by the shadcn CLI; do not
  hand-edit unless you intend to diverge from upstream.

### 3.4 `scheduler-worker/`

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Cron `* * * * *`, var `TARGET_URL`, service binding `MAIN`. |
| `src/index.ts` | `scheduled()` handler → `env.MAIN.fetch(TARGET_URL)` inside `ctx.waitUntil`. |

### 3.5 `packages/webwatch-sdk/`

A hand-written, un-bundled ES module published under the name `@webwatch/sdk`. It is **not** a
workspace member and is not referenced by the root `package.json`; it is the source of truth for
the npm distribution, while the CDN build served from `/api/public/sdk` is a separate hand-written
copy (see [Known Gaps](#18-known-gaps--technical-debt)).

---

## 4. Build & Runtime Pipeline

### 4.1 Toolchain

| Concern | Choice |
| --- | --- |
| Package manager | Bun (`bunfig.toml`, text lockfile `bun.lock`) |
| Bundler | Vite 8 + `@tanstack/react-start` plugin + Nitro 3 (`cloudflare-module` preset) |
| UI | React 19, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, Radix, Framer Motion, Recharts |
| Server | TanStack Start SSR route handlers on h3/Nitro |
| Storage | Cloudflare D1 (SQLite) via `nodejs_compat` |
| Test | Vitest (`src/**/*.test.ts`, node environment) |
| Lint | ESLint 9 flat config + typescript-eslint + react-hooks + Prettier |

`vite.config.ts` delegates to the shared `@lovable.dev/vite-tanstack-config` preset, which already
registers the TanStack devtools plugin, `tanstackStart`, React, Tailwind, tsconfig paths, the
Nitro build (cloudflare target), `VITE_*` env injection, the `@` path alias, React/TanStack
deduplication, error-logger plugins, and dev-server sandbox detection. **Do not re-add those
plugins manually** — duplicate registrations break the app.

### 4.2 Server entry chain

```
Cloudflare fetch(request, env, ctx)
  └─ src/server.ts            → setAppEnv(env); globalThis.__env__ = env
       └─ @tanstack/react-start/server-entry
            └─ h3 app
                 ├─ Nitro plugin server/plugins/env.ts  → globalThis.__env__ = event.context.cloudflare.env
                 └─ src/start.ts requestMiddleware
                      ├─ errorMiddleware  → unhandled throw ⇒ HTML error page
                      └─ csrfMiddleware   → guards `serverFn` handlers
            └─ response → normalizeCatastrophicSsrResponse()
```

### 4.3 `normalizeCatastrophicSsrResponse`

h3 does not propagate exceptions thrown inside a handler. It converts them into a plain `500`
response whose body is `{"unhandled":true,"message":"HTTPError"}` — a JSON payload with no stack
and no `cause`. A `try/catch` around the handler never sees it.

`src/server.ts` therefore inspects any `5xx` JSON response for that exact shape and replaces it with
the HTML fallback page from `error-page.ts`. To recover the original stack for the log pipeline,
`error-capture.ts` monkey-patches `console.error`, records the last `Error` instance it saw, and
stores it for **5 seconds** (`consumeLastCapturedError()`). The captured error's message, stack, and
full `cause` chain (max depth 5, truncated at 8 000 characters) are written to the log before the
HTML page is returned.

### 4.4 Build output and Worker packaging

`bun run build` produces:

```
.output/server/index.mjs    # Worker entry (Nitro)
.output/public/             # static assets → ASSETS binding
```

`wrangler.jsonc` uses `"no_bundle": true` (the Nitro output is already bundled) plus an ESModule
rule for `**/*.mjs` and `**/*.js`.

---

## 5. Environment & Binding Resolution

TanStack Start route handlers do not receive the Worker `env` object as an argument, but the
bindings are stable for the lifetime of a Worker isolate. WebWatch captures them once and
re-exposes them through a single module.

**`src/lib/wrangler-env.ts` resolution order** (`getAppEnv()`):

1. `currentEnv` — the value cached by `setAppEnv()` (set on every request by `src/server.ts`).
2. `getRequest().runtime.cloudflare.env`, then `getRequest().cf.env`.
3. `globalThis.__env__` — set by the Nitro plugin `server/plugins/env.ts`.
4. Otherwise it throws a descriptive error telling the developer to run
   `bun run build && bunx wrangler dev` (a bare `vite dev` cannot inject D1 bindings).

**Rule:** never touch `env` directly. Import `db()` from `@/lib/wrangler-env` and read secrets via
`getAppEnv()`. This keeps the binding access in exactly one place and makes the local-dev failure
mode explicit.

### Secrets

| Secret | Worker | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | `webwatch` | Bot API bearer token for `sendMessage`. |
| `TELEGRAM_BOT_USERNAME` | `webwatch` | Username without `@`, used to build `t.me/<bot>?start=<token>` deep links. |
| `TELEGRAM_WEBHOOK_SECRET` | `webwatch` | Shared secret guarding the Telegram webhook **and** the manual cron endpoint. |
| `CRON_SECRET` | `webwatch-scheduler` | Value sent as `x-webwatch-cron`. **Must equal `TELEGRAM_WEBHOOK_SECRET`.** |

The reuse of one secret for three purposes is a simplification, not a best practice. See
[Known Gaps](#18-known-gaps--technical-debt).

---

## 6. Data Model (Cloudflare D1)

All timestamps are stored as **ISO-8601 UTC strings** produced by
`strftime('%Y-%m-%dT%H:%M:%fZ','now')`. Comparisons are therefore lexicographic and index-friendly.

### 6.1 Entity relationships

```
users ─┬─< sessions          (token_hash PK)
       ├─< sites ─┬─< checks          (ON DELETE CASCADE)
       │          ├─< incidents       (ON DELETE CASCADE)
       │          └─< api_keys        (ON DELETE CASCADE)
       │             └─< apm_events    (ON DELETE CASCADE)
       └─< telegram_links            (email-keyed, not FK-linked)

otp_codes   (standalone, email-keyed)
```

### 6.2 `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT | PK, `crypto.randomUUID()` |
| `email` | TEXT | NOT NULL, UNIQUE, lower-cased at write time |
| `chat_id` | TEXT | Telegram chat id, nullable until linked |
| `tg_username` | TEXT | Telegram @username, nullable |
| `created_at` | TEXT | NOT NULL, defaults to now |

### 6.3 `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| `token_hash` | TEXT | PK — SHA-256 hex of the cookie token. The raw token is never stored. |
| `user_id` | TEXT | NOT NULL → `users(id)` ON DELETE CASCADE |
| `expires_at` | TEXT | NOT NULL — issue time + 30 days |
| `created_at` | TEXT | NOT NULL |

Index: `idx_sessions_user(user_id)`.

### 6.4 `otp_codes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER | PK AUTOINCREMENT |
| `email` | TEXT | NOT NULL |
| `code_hash` | TEXT | NOT NULL — SHA-256 of `"<email>:<code>"`; the plaintext code is never stored |
| `expires_at` | TEXT | NOT NULL — issue time + 5 minutes |
| `used` | INTEGER | NOT NULL DEFAULT 0 |
| `attempts` | INTEGER | NOT NULL DEFAULT 0 — added in `0002` |
| `created_at` | TEXT | NOT NULL |

Index: `idx_otp_email(email)`.

### 6.5 `telegram_links`

| Column | Type | Notes |
| --- | --- | --- |
| `token` | TEXT | PK — 16 random bytes hex, consumed by `/start <token>` |
| `email` | TEXT | NOT NULL |
| `chat_id` | TEXT | nullable, filled when the user presses the deep link |
| `tg_username` | TEXT | nullable |
| `status` | TEXT | NOT NULL DEFAULT `'pending'` → `'linked'` |
| `expires_at` | TEXT | NOT NULL — issue time + 10 minutes |
| `created_at` | TEXT | NOT NULL |

Index: `idx_tg_links_email(email)`.

### 6.6 `sites`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT | PK, UUID |
| `user_id` | TEXT | NOT NULL → `users(id)` ON DELETE CASCADE |
| `name` | TEXT | nullable — defaults to the URL hostname |
| `url` | TEXT | NOT NULL — **globally unique** |
| `interval_seconds` | INTEGER | NOT NULL DEFAULT 300 — 1…1440 min, stored in seconds |
| `fail_threshold` | INTEGER | NOT NULL DEFAULT 2 — consecutive failures before `down` (1…100) |
| `check_keyword` | TEXT | nullable — body must contain this substring |
| `check_ssl` | INTEGER | NOT NULL DEFAULT 0 — 0/1 flag |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 — 0 = paused |
| `current_status` | TEXT | NOT NULL DEFAULT `'unknown'` — `unknown` / `up` / `down` |
| `consecutive_failures` | INTEGER | NOT NULL DEFAULT 0 |
| `last_checked_at` | TEXT | nullable — drives the due-time scheduler |
| `last_notified_at` | TEXT | nullable — drives the notification cooldown |
| `ssl_last_warned_at` | TEXT | nullable — drives the SSL warning repeat interval |
| `verification_token` | TEXT | nullable — added in `0003` |
| `verification_status` | TEXT | NOT NULL DEFAULT `'verified'` — added in `0003`; new rows are inserted as `'pending'` |
| `created_at` | TEXT | NOT NULL |

Indexes: `idx_sites_user(user_id)`, `idx_sites_active(is_active, last_checked_at)`,
**`idx_sites_url` UNIQUE(url)**.

> **URL uniqueness history.** `0002` created a global unique index on `url`; `0005` replaced it with
> a per-user index to allow the same URL on multiple accounts; `0006` restored global uniqueness.
> The current constraint is platform-wide: **a URL can be monitored by exactly one account.** Both
> `createSite()` and the bot's `/addsite` pre-check and surface `url_taken`.

### 6.7 `checks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT | PK, UUID |
| `site_id` | TEXT | NOT NULL → `sites(id)` ON DELETE CASCADE |
| `status_code` | INTEGER | nullable — HTTP status, `NULL` on network failure |
| `response_time_ms` | INTEGER | nullable |
| `is_up` | INTEGER | NOT NULL — 0/1 |
| `error_message` | TEXT | nullable — `HTTP 502`, `Timeout (>10s)`, `Keyword "x" tidak ditemukan`, … |
| `checked_at` | TEXT | NOT NULL |

Indexes: `idx_checks_site_checked(site_id, checked_at)`, `idx_checks_checked_at(checked_at)`.

### 6.8 `incidents`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT | PK, UUID |
| `site_id` | TEXT | NOT NULL → `sites(id)` ON DELETE CASCADE |
| `started_at` | TEXT | NOT NULL |
| `resolved_at` | TEXT | nullable — `NULL` means the incident is still open |
| `error_message` | TEXT | nullable |

Indexes: `idx_incidents_site(site_id, started_at)`, `idx_incidents_started_at(started_at)`.

### 6.9 `api_keys`

| Column | Type | Notes |
| --- | --- | --- |
| `key` | TEXT | PK — `ww_` + 24 random bytes hex (48 hex chars) |
| `site_id` | TEXT | NOT NULL → `sites(id)` ON DELETE CASCADE |
| `name` | TEXT | nullable |
| `created_at` | TEXT | NOT NULL |

Index: `idx_api_keys_site(site_id)`.

### 6.10 `apm_events`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | TEXT | PK, UUID |
| `site_id` | TEXT | NOT NULL → `sites(id)` ON DELETE CASCADE |
| `environment` | TEXT | NOT NULL DEFAULT `'production'` |
| `event_type` | TEXT | NOT NULL — `frontend_error`, `frontend_promise_error`, `backend_error`, `api_error`, `log`, … |
| `message` | TEXT | NOT NULL |
| `stack_trace` | TEXT | nullable |
| `url` | TEXT | nullable |
| `method` | TEXT | nullable |
| `user_agent` | TEXT | nullable |
| `created_at` | TEXT | NOT NULL |

Indexes: `idx_apm_events_site_time(site_id, created_at)`, `idx_apm_events_type(site_id, event_type)`.

### 6.11 Retention

`purgeOldData()` (called from `runScheduledMonitor()` during the first five minutes of UTC hour 0,
i.e. roughly once a day):

| Table | Policy |
| --- | --- |
| `checks` | hard-deleted after **30 days** |
| `incidents` | hard-deleted after **30 days**, **only if resolved** (`resolved_at IS NOT NULL`) |
| `apm_events` | **never purged** by any code path |
| `sessions` | rows are removed on logout; expired rows are not garbage-collected |
| `otp_codes` | expired/used codes are pruned when a new code is issued |

---

## 7. Authentication & Session Model

### 7.1 The problem

WebWatch has no password store. A user proves ownership of an email address by proving control of
a Telegram chat, because the OTP code is delivered over Telegram and never leaves the chat.

### 7.2 Flow

```
  Browser                         WebWatch                     Telegram
     │                               │                             │
     │ POST /api/auth/otp {email}   │                             │
     ├──────────────────────────────►│                             │
     │                               │ look up users.chat_id      │
     │                               │                             │
     │        ┌──────────────────────┴─────────────────────┐      │
     │        │ no chat_id yet                            │      │
     │◄───────┤ { status:"need_link", deepLink:           │      │
     │        │   "https://t.me/<bot>?start=<token>" }    │      │
     │                                               user presses /start
     │                                                  ├────►│
     │                               ◄──────────────────────────┤
     │                               │ telegram_links.status='linked'
     │                               │ users row created (ensureUser)
     │ POST /api/auth/otp {email}   │                             │
     ├──────────────────────────────►│ 30 s resend guard passed   │
     │                               │ generate 6-digit code      │
     │                               │ sendMessage(code) ─────────►│
     │◄───────┤ { status:"sent" }     │                             │
     │                               │                             │
     │ user reads code from chat     │                             │
     │ POST /api/auth/verify {email, code}                        │
     ├──────────────────────────────►│ verifyOtp → issueSession  │
     │◄───────┤ 200 + Set-Cookie: ww_session=…; HttpOnly; Secure; SameSite=Lax
```

### 7.3 OTP rules

| Rule | Value | Enforced in |
| --- | --- | --- |
| Code length | 6 digits | `createOtpForEmail` |
| TTL | 5 minutes | `OTP_TTL_MS` |
| Storage | `sha256("<email>:<code>")` — plaintext never persisted | `auth.server.ts` |
| Max simultaneously active codes per email | 3 (oldest evicted) | `OTP_MAX_ACTIVE` |
| Max failed attempts per code | 5 → **all** codes for that email are deleted | `OTP_MAX_ATTEMPTS` |
| Resend cooldown | 30 s → `429 rate_limited` with `retryAfter` | `OTP_RESEND_MIN_MS` |
| Single use | successful verification marks the code used and deletes all codes for the email | `verifyOtp` |

### 7.4 Session rules

| Rule | Value |
| --- | --- |
| Cookie name | `ww_session` |
| Token | 32 random bytes, hex-encoded (64 chars) |
| Storage | SHA-256 hex of the token as `sessions.token_hash` (PK) |
| TTL | 30 days |
| Cookie flags | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Lookup | `sha256(cookie) → sessions JOIN users WHERE expires_at > now` |
| Revocation | `POST /api/auth/logout` deletes the row and clears the cookie |

`SameSite=Lax` plus `Secure` means the session cookie is not sent on cross-site POSTs. Server
functions additionally get TanStack Start's CSRF middleware (`createCsrfMiddleware` with
`filter: ctx => ctx.handlerType === "serverFn"`), re-declared explicitly in `src/start.ts`
because defining that file opts out of the automatic installation.

---

## 8. Site Lifecycle & Domain Verification

```
   createSite()
       │
       ├─ normalizeUrl(raw) ───► null  ⇒ 400 url_invalid
       │     • prepends https:// when the scheme is missing
       │     • SSRF guard (see §17.3)
       │     • requires a dot in the hostname
       │
       ├─ SELECT id FROM sites WHERE url = ? ──► found ⇒ 409 url_taken
       │
       └─ INSERT sites (…, verification_token = uuid, verification_status = 'pending')
              │
              ▼
        ┌──────────────────────────┐
        │  pending: APM ingest is  │  POST /api/ingest ⇒ 403 site_not_verified
        │  rejected for this site  │
        └──────────────────────────┘
              │  user hosts /webwatch-verify.txt containing the token
              ▼
        POST /api/sites/verify
              │
              ├─ GET <site.url>/webwatch-verify.txt
              │    UA: WebWatch-Verifier/1.0 · timeout 10 s
              │
              ├─ body contains verification_token ⇒ UPDATE verification_status='verified'
              └─ else ⇒ 400 token_mismatch
```

**Verification error codes:** `no_token`, `file_not_found`, `token_mismatch`, `network_error`.

**Why verification exists:** it proves the user controls the domain before the platform will accept
telemetry attributed to it. Without it, anyone could attach a victim's domain to their account and
use the victim's traffic to exhaust the ingestion quota.

Note that uptime monitoring itself is **not** gated on verification — only APM ingestion is.

---

## 9. APM Ingestion Protocol

### 9.1 Request

```http
POST /api/ingest HTTP/1.1
Authorization: Bearer ww_<48 hex chars>
Content-Type: application/json
Origin: https://customer.example   # any origin; CORS is permissive by design
```

```jsonc
{
  "events": [
    {
      "type": "frontend_error",        // required-ish; defaults to "log"
      "message": "TypeError: x is not a function",
      "stack_trace": "TypeError: x is not a function\n    at ...",
      "url": "https://customer.example/checkout",
      "method": "GET",
      "environment": "production",     // defaults to "production"
      "user_agent": "Mozilla/5.0 ..."  // accepted but not populated by the current SDK
    }
  ]
}
```

### 9.2 Processing

1. **Auth.** `Authorization` must start with `Bearer ` → otherwise `401 missing_token`.
2. **Key lookup.** One joined query resolves `api_keys → sites → users` and simultaneously
   retrieves `sites.verification_status` and `users.chat_id` → otherwise `401 invalid_key`.
3. **Verification gate.** `sites.verification_status !== 'verified'` → `403 site_not_verified`.
4. **Payload check.** `body.events` must be an array → otherwise `400 invalid_payload`.
5. **Batch insert.** Events are bound into prepared statements and flushed through
   `db().batch()` in chunks of **50** (D1's practical batch limit).
6. **Alert.** If the site owner has a linked Telegram chat, the **first** event whose `type`
   contains `"error"` (case-insensitive) produces one `🚨 APM ALERT` message. It is awaited so the
   serverless runtime cannot cancel the in-flight request. Only one alert per batch — the rest of
   the batch is recorded silently.
7. **Response.** `200 { "ok": true, "ingested": <n> }`.

Malformed JSON or an insert failure produces `400 bad_request`.

### 9.3 CORS

`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`,
`Access-Control-Allow-Headers: Content-Type, Authorization`, and a preflight
(`OPTIONS` → `204`) with `Access-Control-Max-Age: 86400`. The endpoint is intentionally reachable
from any origin because browser SDKs post from the customer's own domain.

### 9.4 SDK contract

The browser SDK is served from `GET /api/public/sdk` with
`Content-Type: application/javascript; charset=utf-8`, `Cache-Control: public, max-age=3600`, and
`Access-Control-Allow-Origin: *`.

```js
import { WebWatch } from "https://webwatch.example/api/public/sdk";

WebWatch.init("<API_KEY>", "https://webwatch.example/api/ingest");
```

| Method | Behaviour |
| --- | --- |
| `init(key, endpoint = "/api/ingest")` | Stores the key and the endpoint. Registers a `window.onerror` listener → captures `frontend_error`, and an `unhandledrejection` listener → captures `frontend_promise_error`. |
| `capture(type, message, stackTrace, url, method)` | `POST`s a single-event batch to the endpoint. No-ops when no key is set. Swallows every failure into `console.error`. |
| `expressErrorHandler()` | Returns an Express `(err, req, res, next)` middleware that captures `backend_error` (with `req.originalUrl` / `req.method`) and then calls `next(err)`. |

Endpoint resolution: if the endpoint starts with `http` it is used verbatim; otherwise it is
resolved against `window.location.origin` (falling back to `http://localhost:3000` on the server),
which makes same-origin and self-hosted deployments work without configuration.

Environment detection is `process.env.NODE_ENV` when `process` is defined, otherwise
`"production"`.

---

## 10. Monitoring Engine

### 10.1 Cycle

```
cron (every minute) → POST /api/public/cron/run → runScheduledMonitor()
   ├─ runDueChecks()
   │    ├─ SELECT … FROM sites WHERE is_active = 1 ORDER BY last_checked_at ASC LIMIT 200
   │    ├─ filter: due when last_checked_at is NULL or now - last_checked_at ≥ interval_seconds
   │    └─ for each chunk of 15 (Promise.all): checkSite(site)
   └─ if UTC hour == 0 and minute < 5 → purgeOldData()
```

Sites are ordered by `last_checked_at ASC` so that the least-recently-checked sites are served
first, and the 200-site cap guarantees that no site is starved indefinitely.

### 10.2 Probe

`probe(url, keyword)` issues a `GET` with:

| Setting | Value |
| --- | --- |
| Method | `GET` |
| Redirects | `follow` |
| User-Agent | `WebWatch/1.0 (+uptime monitor)` |
| Timeout | 10 s (`AbortController`) |

Outcome rules:

| Condition | `is_up` | `error_message` |
| --- | --- | --- |
| 2xx and (no keyword or keyword present) | 1 | `NULL` |
| Non-2xx | 0 | `HTTP <status>` |
| 2xx but keyword absent | 0 | `Keyword "<kw>" tidak ditemukan` |
| Abort after 10 s | 0 | `Timeout (>10s)` |
| Other network error | 0 | the underlying error message |

### 10.3 SSL inspection

When `check_ssl = 1`, `checkSslExpiry()` opens a `node:tls` connection
(`rejectUnauthorized: false`, `servername` = host, port 443 by default) with a 5 s timeout and
reads `getPeerCertificate().valid_to`.

- Returns the number of days remaining, or `null` if the runtime cannot do TLS or the handshake
  failed. **`null` is a skip, never a failure.**
- If the site is otherwise up but the certificate has expired (`daysLeft <= 0`), the site is
  recorded as **down** with `error_message = "Sertifikat SSL sudah kedaluwarsa"`.

### 10.4 State machine

`evaluateStatus()` in `monitor-core.ts` is pure and fully unit-tested:

```
input:  currentStatus, isUp, consecutiveFailures, failThreshold
output: { status, consecutiveFailures, becameDown, becameUp }

failures = isUp ? 0 : consecutiveFailures + 1

if (!isUp && failures >= failThreshold && currentStatus !== "down")
        status = "down", becameDown = true
else if (isUp)
        status = "up", becameUp = (currentStatus === "down")
```

Transition table:

| From | Probe | Threshold | To | Flags |
| --- | --- | --- | --- | --- |
| `unknown` | up | — | `up` | — (no incident is opened) |
| `unknown` | down | not reached | `unknown` | — |
| `unknown` | down | reached | `down` | `becameDown` → incident opened |
| `up` | down | not reached | `up` | — |
| `up` | down | reached | `down` | `becameDown` → incident opened |
| `down` | down | — | `down` | — (no duplicate incident) |
| `down` | up | — | `up` | `becameUp` → incident closed |

Consecutive failures reset to 0 on any successful probe. Pausing a site (`is_active = 0`) also
resets the counter.

### 10.5 Per-check sequence (`checkSite`)

```
 1. probe → isUp, statusCode, responseTimeMs, errorMessage
 2. if check_ssl → checkSslExpiry → possibly downgrade to down
 3. INSERT INTO checks (...)
 4. evaluation = evaluateStatus(...)
 5. cooldownActive = isInCooldown(site.last_notified_at, now, 10 min)
 6. if becameDown:
       INSERT INTO incidents (site_id, error_message)
       if !cooldownActive && chatId → sendTelegram(DOWN)
 7. else if becameUp:
       SELECT latest unresolved incident
       downtime = humanDuration(now - started_at)
       UPDATE incidents SET resolved_at = now
       if !cooldownActive && chatId → sendTelegram(RECOVERED)
 8. if isUp && shouldWarnSsl(...) && chatId → sendTelegram(SSL WARNING)
 9. UPDATE sites SET current_status, consecutive_failures, last_checked_at,
                     last_notified_at = COALESCE(?, last_notified_at),
                     ssl_last_warned_at = COALESCE(?, ssl_last_warned_at)
```

`last_notified_at` and `ssl_last_warned_at` are only overwritten when a message was actually sent,
so the cooldown window measures real notifications rather than check attempts.

---

## 11. Notification Model

All notifications are Telegram messages sent through `https://api.telegram.org/bot<token>/sendMessage`
with `parse_mode: HTML` and `disable_web_page_preview: true`. All dynamic values are escaped with
`escapeHtml()` (`&`, `<`, `>`).

| Trigger | Template | Icon |
| --- | --- | --- |
| Site transitioned to `down` | `formatDownMessage` | 🔴 `DOWN` — label, URL, error, failure count, UTC time |
| Site recovered | `formatRecoveryMessage` | 🟢 `RECOVERED` — label, URL, downtime duration, UTC time |
| Certificate expiring in ≤ 7 days | `formatSslWarningMessage` | ⚠️ `SSL CERTIFICATE` — label, URL, days left, UTC time |
| OTP code delivery | `formatOtpMessage` | 🔐 `Kode masuk WebWatch` — 6-digit code, 5-minute warning |
| First error in an ingest batch | `formatApmErrorMessage` | 🚨 `APM ALERT` — label, URL, type + environment, message, endpoint |

### 11.1 Anti-spam rules

| Rule | Window | Mechanism |
| --- | --- | --- |
| DOWN / RECOVERED cooldown | **10 minutes** | `isInCooldown(site.last_notified_at, …)` suppresses any notification sent less than 10 minutes after the previous one. |
| SSL warning threshold | ≤ **7 days** remaining | `shouldWarnSsl` |
| SSL warning repeat | **24 hours** | `ssl_last_warned_at` |
| APM alert | one per **batch** | only the first `*error*` event in the payload is announced |
| Notified only to the owner's chat | — | `users.chat_id`; no notification is sent if Telegram is not linked |

`humanDuration()` renders downtime in Indonesian: `"X jam Y menit"`, minimum `"1 menit"`.

---

## 12. Telegram Bot Interface

Webhook endpoint: `POST /api/public/telegram/webhook`, guarded by the
`x-telegram-bot-api-secret-token` header, compared with `timingSafeEqual` over SHA-256 digests.

Commands are parsed as `/command@botname`, so the bot works in group chats.

| Command | Behaviour |
| --- | --- |
| `/start` | Without an argument: reports whether the chat is linked and prints the help text. With `<token>`: consumes the pending `telegram_links` token, marks it `linked`, and calls `ensureUser(email)`. |
| `/help` | Prints the command list. |
| `/addsite <url> [interval_minutes]` | Adds a site. Applies the same SSRF guard as the dashboard. Rejects URLs already monitored platform-wide. |
| `/listsite` / `/status` | Lists the caller's sites with status icon, short id, interval, and URL. |
| `/removesite <id>` | Deletes the site. |
| `/pause <id>` / `/resume <id>` | Toggles `is_active`; pausing also resets the failure counter. |
| `/history <id>` | 30-day uptime percentage plus the five most recent incidents with durations. |

Site references are the **first 8 characters** of the site id; the lookup is a prefix match and
must resolve to exactly one site, otherwise the bot replies "Situs tidak ditemukan."

---

## 13. Public Status Page

`GET /api/system-status` is public and unauthenticated.

```jsonc
{
  "status": "operational",           // or "degraded"
  "components": [
    { "name": "Web Dashboard & API",       "status": "operational", "description": "…" },
    { "name": "Uptime Monitoring Engine",  "status": "operational", "description": "…" },
    { "name": "APM Ingestion Nodes",       "status": "operational", "description": "…" },
    { "name": "Database & Storage",        "status": "operational", "description": "…" }
  ],
  "metrics": { "totalSites": 0, "apmEvents24h": 0, "checks24h": 0 }
}
```

**Engine liveness heuristic:** the newest row in `checks` is compared against "now". If it is more
than **10 minutes** old, the `Uptime Monitoring Engine` component is reported as `outage` and the
platform as `degraded`. The check is a proxy for scheduler liveness — the platform cannot observe
the scheduler directly.

**Database failure:** on a D1 error the endpoint still answers `200` but with
`status: "outage"` and every component marked `outage`/`unknown`, so the status page degrades
gracefully instead of showing an error.

The `/status` page and the floating status pill in `__root.tsx` both poll this endpoint every
60 seconds.

---

## 14. HTTP API Reference

### 14.1 Public endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/public/sdk` | none | Serves the browser SDK source (`application/javascript`). |
| `GET` | `/api/system-status` | none | Status page payload and platform metrics. |
| `POST` | `/api/ingest` | `Authorization: Bearer <api_key>` | APM batch ingestion. |
| `POST` | `/api/public/cron/run` | `x-webwatch-cron: <secret>` | Manual monitor trigger. |
| `POST` | `/api/public/telegram/webhook` | `x-telegram-bot-api-secret-token: <secret>` | Telegram webhook receiver. |
| `POST` | `/api/auth/otp` | none | Request an OTP or a Telegram deep link. |
| `GET` | `/api/auth/link-status` | none | `?email=` → `linked` / `pending` / `expired`. |
| `POST` | `/api/auth/verify` | none | Exchange the OTP for a session cookie. |
| `GET` | `/api/auth/me` | session (optional) | Current user, or `{ "user": null }`. |
| `POST` | `/api/auth/logout` | session | Destroy the session. |

### 14.2 Authenticated endpoints

| Method | Path | Query / body | Description |
| --- | --- | --- | --- |
| `GET` | `/api/sites` | — | All sites owned by the caller. |
| `POST` | `/api/sites` | `{ url, intervalMinutes?, failThreshold?, keyword?, ssl? }` | Create a site (status `pending`). |
| `PATCH` | `/api/sites` | `{ id, patch? \| intervalMinutes?, failThreshold?, keyword?, ssl?, is_active? }` | Update settings or pause/resume. |
| `DELETE` | `/api/sites` | `{ id }` | Delete a site (cascades). |
| `GET` | `/api/sites/detail` | `?id=` | Site + up to 5 000 checks over 30 days + last 20 incidents. |
| `POST` | `/api/sites/verify` | `{ id }` | Run domain verification. |
| `GET` | `/api/sites/keys` | `?siteId=` | List API keys (never hashed). |
| `POST` | `/api/sites/keys` | `{ siteId, name? }` | Issue a new API key; returns the plaintext once. |
| `GET` | `/api/sites/events` | `?siteId=` | Last 100 APM events for a site. |
| `GET` | `/api/sites/dashboard` | — | Last 15 APM events + last 15 incidents across all sites. |

### 14.3 Error envelope

All JSON API responses use `{ "error": "<machine_code>" }`. Codes in use:
`unauthorized`, `invalid_request`, `email_invalid`, `code_invalid`, `rate_limited`,
`url_invalid`, `url_taken`, `id_required`, `site_id_required`, `not_found`, `no_token`,
`file_not_found`, `token_mismatch`, `network_error`, `missing_token`, `invalid_key`,
`site_not_verified`, `invalid_payload`, `bad_request`, `server_error`, `delete_failed`.

---

## 15. Frontend Route Map

| Route | Guard | Data sources |
| --- | --- | --- |
| `/` | public | static marketing content |
| `/auth` | public | `/api/auth/otp`, `/api/auth/link-status` (poll 2.5 s), `/api/auth/verify` |
| `/docs` | public | static content |
| `/status` | public | `/api/system-status` (poll 60 s) |
| `/dashboard` | session | `/api/sites/dashboard` |
| `/monitors` | session | `/api/sites` + mutations |
| `/apm` | session | `/api/sites/dashboard` |
| `/incidents` | session | `/api/sites/dashboard` |
| `/sites/$id` | session | `/api/sites/detail`, `/api/sites/events`, `/api/sites/keys` |

**Auth guard:** `src/routes/_authenticated/route.tsx` runs `ssr: false` and a `beforeLoad` that
calls `/api/auth/me`, redirecting to `/auth` when no user is present. It also renders `AppShell`
(sidebar + header + profile dropdown).

**Server-side data fetching** is intentionally minimal: most screens fetch from the client through
TanStack Query so that the shell renders instantly and mutations invalidate the cache.

**Client helpers:** `src/lib/api.ts` (`api<T>`, `credentials: "same-origin"`, throws
`data.error` on a non-2xx response), `src/hooks/use-current-user.ts`, `src/hooks/use-mobile.tsx`.

---

## 16. Design System

Tokens live in `src/styles.css` as Tailwind v4 `@theme inline` variables.

| Group | Tokens |
| --- | --- |
| Typography | `--font-display` / `--font-sans` → Space Grotesk; `--font-mono` → IBM Plex Mono. Both loaded from Google Fonts in `__root.tsx`. |
| Surfaces | `--background`, `--surface`, `--card`, `--popover`, `--muted` |
| Status | `--up` (teal), `--down` (red), `--paused` (amber) — the three semantic status colours |
| Brand | `--primary` (teal `oklch(0.58 0.12 178)`), `--secondary`, `--accent`, `--ring` |
| Danger | `--destructive` |
| Shape | `--radius: 0.5rem` with `--radius-sm/md/lg/xl` derived from it |
| Elevation | `--shadow-glow` (status glow), `--shadow-panel` (card depth) |

Colour space is **OKLCH** throughout. Component styling uses `cn()` (`clsx` + `tailwind-merge`) so
that conditional Tailwind classes resolve deterministically.

---

## 17. Security Model

### 17.1 Authentication & secrets

- No passwords are stored, transmitted, or recoverable.
- Session tokens and OTP codes are hashed with SHA-256 before storage.
- The raw session token exists only in the `HttpOnly` cookie.
- Secrets live as Cloudflare Worker secrets, never in `vars` or in the repository.

### 17.2 Tenant isolation

Every authenticated query is scoped by `user_id` — both in SQL (`WHERE id = ? AND user_id = ?`)
and by taking the owner from the session, never from the request body. A user cannot read,
modify, or delete another account's sites, incidents, events, or API keys.

There is no database-level Row-Level Security; isolation is enforced in the application layer
only. That is adequate for a single-tenant-per-row schema on D1, but it means every new query
must remember the `user_id` predicate.

### 17.3 SSRF protection

Because the platform fetches user-supplied URLs, `normalizeUrl()` (and its duplicate in
`bot.server.ts`) rejects:

- `localhost`
- `*.local`, `*.internal`
- `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`, `172.16.0.0/12`
- `::1`, `fc00::`, `fe80::`
- hostnames without a dot

The guard inspects the hostname string only — it does not resolve DNS, so a hostname that resolves
to a private address is not caught (see [Known Gaps](#18-known-gaps--technical-debt)).

### 17.4 Request authentication

| Surface | Mechanism |
| --- | --- |
| APM ingest | `Bearer` API key, looked up in `api_keys`; scoped to a single site. |
| Cron trigger | `x-webwatch-cron` header, SHA-256 digest comparison against `TELEGRAM_WEBHOOK_SECRET`. |
| Telegram webhook | `x-telegram-bot-api-secret-token` header, `timingSafeEqual` over SHA-256 digests. |
| Dashboard API | `ww_session` cookie, `SameSite=Lax` + `Secure`. |
| Server functions | TanStack Start CSRF middleware. |

### 17.5 Injection

All database access uses **prepared statements with bound parameters**. No SQL string
interpolation is used anywhere.

### 17.6 XSS

Telegram messages are HTML-formatted, so every interpolated value passes through `escapeHtml()`.
The SSR error page is a static string with no interpolation. The frontend renders API data through
React, which escapes by default; no `dangerouslySetInnerHTML` is used.

### 17.7 Resource limits

| Limit | Value | Where |
| --- | --- | --- |
| Sites processed per run | 200 | `MAX_SITES_PER_RUN` |
| Parallel probes | 15 | chunk size in `runDueChecks` |
| Probe timeout | 10 s | `REQUEST_TIMEOUT_MS` |
| SSL handshake timeout | 5 s | `checkSslExpiry` |
| Verification fetch timeout | 10 s | `verifySite` |
| Interval range | 1–1440 minutes | `clampInt` |
| Failure threshold range | 1–100 | `clampInt` |
| Checks returned to the client | 5 000 (30-day window) | `siteDetail` |
| Ingest batch chunk | 50 statements | `/api/ingest` |
| OTP active codes per email | 3 | `OTP_MAX_ACTIVE` |
| OTP failed attempts | 5 | `OTP_MAX_ATTEMPTS` |

---

## 18. Known Gaps & Technical Debt

These are real divergences between the product surface and the implementation. They are listed so
that nobody documents them as if they were shipped.

| # | Gap | Impact | Suggested fix |
| --- | --- | --- | --- |
| 1 | The npm package `packages/webwatch-sdk/index.js` hardcodes `https://your-webwatch-domain.com/api/ingest` and cannot be pointed at another endpoint. It also lacks the `unhandledrejection` listener. | The npm package is unusable as shipped. | Give `init(key, endpoint)` the same signature as the CDN build, or generate the npm package from the CDN source. |
| 2 | The npm package and the CDN build (`src/routes/api/public/sdk.ts`) are two independent copies of the same code. | They drift; the CDN build is already ahead (endpoint override, promise rejection handling, safe `process` access). | Extract one source file and serve/bundle it for both channels. |
| 3 | `packages/webwatch-sdk` is not a workspace member and is not referenced by the root `package.json`. | It is never built, type-checked, or tested. | Either wire it into the workspace or remove it until it is publishable. |
| 4 | `/api/ingest` has **no rate limiting**. | A single API key can insert unbounded rows. | Add a per-key token bucket persisted in D1. |
| 5 | `apm_events` are **never purged**. | Unbounded growth in the largest table. | Extend `purgeOldData()` with a retention window for APM events. |
| 6 | The SSRF guard is duplicated in `sites-api.server.ts` and `bot.server.ts`, and only inspects the hostname string. | Divergence risk; DNS names pointing at private IPs are not blocked. | Extract a single `assertPublicUrl()` helper and resolve the hostname before fetching. |
| 7 | `TELEGRAM_WEBHOOK_SECRET` guards three unrelated surfaces (Telegram webhook, manual cron, scheduler). | One leaked secret disables all three. | Introduce separate `CRON_SECRET` and `TELEGRAM_WEBHOOK_SECRET` values on the main worker. |
| 8 | `scheduler-worker/` is not listed in `tsconfig.json`'s `include`. | `bunx tsc --noEmit` does not type-check it. | Add a `tsconfig` in `scheduler-worker/` or extend the root `include`. |
| 9 | `src/server/plugins/env.ts` is dead code — `vite.config.ts` registers `server/plugins/env.ts` (root) instead. | Confusing duplication; the root plugin does not call `setAppEnv()`. | Delete `src/server/plugins/env.ts`, or point the Nitro plugin list at it and delete the root copy. |
| 10 | `sites.url` is globally unique across all accounts. | Two customers cannot monitor the same URL. | Make it `UNIQUE(user_id, url)` if per-account duplication is wanted (migration `0005` did this before `0006` reverted it). |
| 11 | `sessions` rows are never garbage-collected after expiry. | Slow table growth. | Purge expired sessions in `purgeOldData()`. |
| 12 | The platform-wide URL uniqueness plus the `url_taken` pre-check is implemented twice. | One path could miss the constraint and surface a raw DB error. | Rely on the unique index and map the constraint violation to `409 url_taken` (already partially done in `createSite`). |
| 13 | The status page infers scheduler liveness from the newest `checks` row. | If no site is due for a check, the engine can be reported as `outage` while it is healthy. | Have the scheduler write a heartbeat row. |
| 14 | `api_keys.key` is stored in plaintext (it is the table's primary key). | A database leak yields directly usable ingest credentials. | Store `sha256(key)` and index that. |

---

## 19. Deployment Topology

### 19.1 Resources

| Resource | Name | Notes |
| --- | --- | --- |
| Worker | `webwatch` | `wrangler.jsonc`; entry `.output/server/index.mjs`; assets binding `ASSETS`. |
| Worker | `webwatch-scheduler` | `scheduler-worker/wrangler.jsonc`; cron `* * * * *`; service binding `MAIN`. |
| D1 database | `webwatch` | binding `DB`; `migrations_dir: migrations/d1`; id `1e799485-7ea5-444e-9858-a54e1d476011`. |
| Secret | `TELEGRAM_BOT_TOKEN` | main worker |
| Secret | `TELEGRAM_BOT_USERNAME` | main worker |
| Secret | `TELEGRAM_WEBHOOK_SECRET` | main worker |
| Secret | `CRON_SECRET` | scheduler worker (must equal `TELEGRAM_WEBHOOK_SECRET`) |

### 19.2 Release procedure

```sh
bunx wrangler d1 migrations apply webwatch --remote          # 1. schema
bun run build                                                # 2. build the worker
bunx wrangler secret put TELEGRAM_BOT_TOKEN                  # 3. secrets (once)
bunx wrangler secret put TELEGRAM_BOT_USERNAME
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
bunx wrangler deploy                                         # 4. main worker
bunx wrangler secret put CRON_SECRET --config scheduler-worker/wrangler.jsonc
bunx wrangler deploy --config scheduler-worker/wrangler.jsonc  # 5. scheduler
```

The scheduler must be deployed **after** the main worker so that the `MAIN` service binding
resolves.

### 19.3 Telegram webhook registration

```sh
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  --data-urlencode "url=https://webwatch.example/api/public/telegram/webhook" \
  --data-urlencode "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

If Telegram cannot resolve the `workers.dev` hostname from its own infrastructure, add
`--data-urlencode "ip_address=<your worker ip>"`.

### 19.4 Local development

```sh
bun i
bun run dev                          # Vite dev server — no D1 bindings available
bun run build && bunx wrangler dev  # full worker with D1 + secrets
bunx wrangler d1 migrations apply webwatch --local
```

`vite dev` alone cannot inject the `DB` binding. Any code path that touches D1 will throw the
descriptive error from `getAppEnv()`. Use `wrangler dev` for anything that reads or writes data.

---

## 20. Test Strategy

Vitest runs in a Node environment over `src/**/*.test.ts` (see `vitest.config.ts`). Tests are
pure unit tests — no database, no network, no component rendering.

| File | Subject | Coverage |
| --- | --- | --- |
| `src/lib/monitor-core.test.ts` | `evaluateStatus` | 7 cases: first success from `unknown`, staying `up` below threshold, flipping to `down` at threshold, staying `down`, `unknown` below threshold, `down → up` with `becameUp`, counter reset. |
| | `isInCooldown` | 3 cases: never notified, inside the 10-minute window, past the window. |
| | `shouldWarnSsl` | 5 cases: far from expiry, inside 7 days, warned < 24 h ago, warned > 24 h ago, already expired. |
| `src/lib/telegram-server.test.ts` | `escapeHtml` | Escapes `<`, `>`, `&`. |
| | `humanDuration` | 90 s → `"2 menit"`, 5.4 M ms → `"1 jam 30 menit"`, 10 s → `"1 menit"`. |
| | `describeSslDaysLeft` | 0 / negative → `"hari ini"`, 6.9 → `"7 hari"`, 5 → `"5 hari"`, 1.2 → `"2 hari"`. |
| | `formatDownMessage` | Icon, escaped label, `<code>` URL, escaped error, failure count, UTC timestamp. |
| | `formatRecoveryMessage` | Icon, downtime, recovery time. |
| | `formatSslWarningMessage` | Icon, "kedaluwarsa dalam 3 hari". |

The pure/core split exists specifically to make this possible: `monitor-core.ts` holds the
decision logic with no I/O, and `monitor.server.ts` holds the I/O around it.

**Not covered:** D1 queries, HTTP handlers, the SDK, the bot dispatcher, and all UI. Adding
integration tests would require a local D1 (available via `wrangler dev` + `--local` migrations)
or a mocking layer for the D1 binding.
