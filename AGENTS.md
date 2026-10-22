# AGENTS.md

Guidance for contributors and coding agents working in this repository.

---

## 1. What this project is

WebWatch is an **Application Performance Monitoring (APM) and Uptime Monitoring** platform running
entirely on Cloudflare Workers + D1.

Four systems make up the product:

1. **APM ingestion (`POST /api/ingest`)** — the browser SDK (served from `/api/public/sdk`) posts
   error batches using a per-site API key (`Authorization: Bearer ww_…`).
2. **Domain verification (`POST /api/sites/verify`)** — a user must host a `webwatch-verify.txt`
   file containing their verification token before APM telemetry is accepted for that site.
3. **Uptime monitoring** — a dedicated cron Worker probes user URLs, records checks, opens and
   closes incidents, and enforces failure thresholds.
4. **Notifications** — critical alerts are delivered over Telegram (DOWN, RECOVERED, SSL expiry,
   APM errors, OTP codes).

**Read [DESIGN.md](./DESIGN.md) before changing anything structural.** It documents the runtime
topology, the complete D1 schema, every request flow, the monitoring state machine, the security
model, and the known gaps.

---

## 2. Stack

| Concern | Choice |
| --- | --- |
| Framework | TanStack Start (SSR) on Nitro/h3, `cloudflare-module` preset |
| UI | React 19, TanStack Router + Query, Tailwind v4, shadcn/ui, Radix, Framer Motion, Recharts |
| Storage | Cloudflare D1 (SQLite) |
| Runtime | Cloudflare Workers (`webwatch` + `webwatch-scheduler`) |
| Package manager | Bun (`bunfig.toml`, `bun.lock`) |
| Tests | Vitest (`src/**/*.test.ts`, Node environment) |
| Lint / format | ESLint 9 flat config, Prettier |

---

## 3. Commands

```sh
bun i                  # install
bun run dev            # Vite dev server (NO D1 bindings available)
bun run build          # Nitro build → .output/
bun run preview        # preview the build
bun run test           # Vitest
bun run lint           # ESLint
bun run format         # Prettier --write
bunx tsc --noEmit      # type check (src/ only — see §7)
```

**Local development rule:** `bun run dev` cannot inject the D1 binding. Any code path that reads
or writes D1 must be exercised with `bun run build && bunx wrangler dev`, after
`bunx wrangler d1 migrations apply webwatch --local`.

---

## 4. Architecture invariants

These are not suggestions. Breaking them causes runtime failures that are hard to trace.

### 4.1 Server code lives in `*.server.ts`

Any module that touches D1, secrets, or the network must be named `*.server.ts`. The ESLint config
bans importing Next.js's `server-only` package and points you at this convention instead.

### 4.2 One accessor for the D1 binding

```ts
import { db } from "@/lib/wrangler-env";
const row = await db().prepare("SELECT ...").bind(x).first();
```

Never reach for `env.DB` directly. `src/lib/wrangler-env.ts` owns binding resolution
(`setAppEnv` → `getAppEnv` → `db()`), including the descriptive error thrown when bindings are
missing. Secrets are read with `getAppEnv()`.

### 4.3 All database access uses prepared statements

```ts
db().prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(id, user.id)
```

Never interpolate user input into SQL.

### 4.4 Every authenticated query is scoped by `user_id`

Take the owner from the session (`requireUser(request)`), never from the request body. Every
query touching a user-owned row must carry `AND user_id = ?`.

### 4.5 Route handlers stay thin

`src/routes/api/**` files should only wire the HTTP verb to a function in `src/lib/`. Business
logic belongs in `src/lib/*.server.ts` so it stays testable and reusable.

### 4.6 Use `cn()` for conditional classes

`import { cn } from "@/lib/utils"` — it composes `clsx` + `tailwind-merge`.

### 4.7 Use the design tokens

Never hard-code colors or radii. Use the semantic tokens from `src/styles.css`
(`--primary`, `--up`, `--down`, `--paused`, `--surface`, `--card`, `--border`, `--muted-foreground`,
`--shadow-glow`, `--shadow-panel`, `--radius`, `--font-display`, `--font-mono`). The palette is
OKLCH; add new colors as tokens rather than inline hex values.

---

## 5. Conventions

| Area | Rule |
| --- | --- |
| Language | Code, comments, identifiers, and commit messages in **English**. User-facing copy (UI strings, Telegram messages) is **Indonesian** — keep it that way. |
| Formatting | Prettier: 100 print width, double quotes, semicolons, trailing commas. |
| Timestamps | Store ISO-8601 UTC strings (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`). |
| IDs | `crypto.randomUUID()` via `newId()` from `@/lib/auth.server`. |
| API keys | `ww_` + 24 random bytes hex. |
| API errors | `{ "error": "<machine_code>" }` — snake_case codes, English. |
| Telegram messages | HTML parse mode. **Always escape interpolated values** with `escapeHtml()`. |
| Routes | File-based. See `src/routes/README.md`. Never create `src/pages/`, `app/layout.tsx`, or `_app/` — those are Next.js/Remix conventions. |
| Generated files | `src/routeTree.gen.ts` is generated. Never hand-edit it. |
| UI primitives | `src/components/ui/*` are shadcn/ui generated. Change them only deliberately. |

### Adding an API route

1. Create `src/routes/api/<area>/<name>.ts` with `createFileRoute(...)`.
2. Implement the handler in `src/lib/<area>-api.server.ts`.
3. Guard it with `requireUser(request)` unless it is intentionally public.
4. Use `Response.json({ ... })` and machine-readable error codes.
5. Add a `try/catch` that logs with `console.error` and returns `500 { "error": "server_error" }`.

---

## 6. The monitoring state machine

`src/lib/monitor-core.ts` is **pure** and is the part covered by unit tests. Keep it free of I/O.
All I/O lives in `src/lib/monitor.server.ts`.

Key constants — do not change them casually:

| Constant | Value | Effect |
| --- | --- | --- |
| `REQUEST_TIMEOUT_MS` | 10 000 | Probe timeout. |
| `NOTIFY_COOLDOWN_MS` | 10 min | Suppresses repeated DOWN/RECOVERED messages. |
| `SSL_WARN_THRESHOLD_DAYS` | 7 | Warn when the certificate expires within 7 days. |
| `SSL_WARN_REPEAT_MS` | 24 h | Minimum gap between SSL warnings. |
| `MAX_SITES_PER_RUN` | 200 | Sites processed per cron tick. |

Behavioural rules that must be preserved:

- A site flips to `down` only after `fail_threshold` **consecutive** failures; a single success
  resets the counter.
- `becameDown` opens an incident; `becameUp` closes the latest unresolved one and reports downtime.
- `unknown → up` must **not** emit a RECOVERED message (there is no incident to close).
- Notifications are suppressed while `last_notified_at` is within the 10-minute cooldown.
- `last_notified_at` and `ssl_last_warned_at` are only written when a message was actually sent
  (`COALESCE` in the `UPDATE`).
- A failed SSL lookup returns `null` and is **skipped**, never treated as a site failure.
- `purgeOldData()` deletes `checks` older than 30 days and **resolved** `incidents` older than 30
  days. It currently runs only during the first 5 minutes of UTC hour 0.

---

## 7. Testing expectations

- New pure logic goes into `*.server.ts` **or** a sibling pure module and gets a unit test in
  `src/lib/*.test.ts`.
- Test names are written in Indonesian to match the existing suite.
- Vitest only picks up `src/**/*.test.ts`. A test in `scheduler-worker/` or `packages/` will be
  silently ignored.
- `scheduler-worker/` is **not** in `tsconfig.json`'s `include`, so `bunx tsc --noEmit` does not
  check it. Type-check it manually when you touch it.
- Run `bun run test` and `bun run lint` before proposing a change.

---

## 8. Deployment

Two workers, deployed in order:

```sh
bunx wrangler d1 migrations apply webwatch --remote
bun run build
bunx wrangler deploy
bunx wrangler deploy --config scheduler-worker/wrangler.jsonc
```

Secrets are set with `bunx wrangler secret put` and are **never** committed.

`CRON_SECRET` (scheduler worker) must equal `TELEGRAM_WEBHOOK_SECRET` (main worker), because the
scheduler's `x-webwatch-cron` header is compared against the latter by
`POST /api/public/cron/run`.

**Do not** attach a cron trigger to the main worker: the Nitro `cloudflare-module` preset swallows
the `scheduled` event. The scheduler worker exists for exactly this reason.

---

## 9. Known gaps

`DESIGN.md §18` lists 14 concrete divergences between the product surface and the implementation.
Do not document unimplemented behaviour as if it exists, and do not "fix" a gap silently — mention
it in your summary.

The most common traps:

- The npm package `packages/webwatch-sdk/index.js` hardcodes a placeholder ingest URL and is **not**
  wired into the workspace. The working SDK is the one served from `/api/public/sdk`.
- `/api/ingest` has no rate limiting.
- `apm_events` are never purged.
- The SSRF guard exists in two places (`sites-api.server.ts`, `bot.server.ts`) and only inspects
  the hostname string.
- `src/server/plugins/env.ts` is dead code; `vite.config.ts` registers `server/plugins/env.ts`.

---

## 10. Git

- Commit messages in English, imperative mood, describing the change rather than the process.
- Keep the branch in a working state — `main` is the deployed branch.
- Do not force-push, rebase, or amend commits that are already pushed.
- Never commit secrets, `.env` contents, or `.wrangler/` state.
