# AGENTS.md

Guidance for contributors and coding agents working in this repository.

---

## 1. What this project is

WebWatch is an **Application Performance Monitoring (APM) — error monitoring** platform running
entirely on Cloudflare Workers + D1.

Three systems make up the product:

1. **APM ingestion (`POST /api/ingest`)** — user applications send error batches using a per-site
   API key (`Authorization: Bearer ww_…`). Two SDK channels are supported: the npm package
   `@webwatch/sdk` (source in `packages/webwatch-sdk/`) and the no-install browser SDK served
   from `/api/public/sdk`.
2. **Domain verification (`POST /api/sites/verify`)** — a user must host a `webwatch-verify.txt`
   file containing their verification token before APM telemetry is accepted for that site.
3. **Notifications** — login OTP codes and APM error alerts are delivered over Telegram.

**Read [DESIGN.md](./DESIGN.md) before changing anything structural.** It documents the runtime
topology, the complete D1 schema, every request flow, the security model, and the known gaps.

> Note: WebWatch previously shipped synthetic uptime monitoring (probes, incidents, an SSL
> expiry alarm, a cron scheduler worker). That surface has been **removed** — the product is
> now ingestion + error reporting only. Do not reintroduce monitor/incident concepts in code
> or copy.

---

## 2. Stack

| Concern         | Choice                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------- |
| Framework       | TanStack Start (SSR) on Nitro/h3, `cloudflare-module` preset                              |
| UI              | React 19, TanStack Router + Query, Tailwind v4, shadcn/ui, Radix, Framer Motion, Recharts |
| Storage         | Cloudflare D1 (SQLite)                                                                    |
| Runtime         | Cloudflare Workers (single worker: `webwatch`)                                            |
| SDK package     | `@webwatch/sdk` — TypeScript, zero runtime deps, source in `packages/webwatch-sdk/`       |
| Package manager | Bun (`bunfig.toml`, `bun.lock`)                                                           |
| Tests           | Vitest (`src/**/*.test.ts` + `packages/**/src/**/*.test.ts`, Node environment)            |
| Lint / format   | ESLint 9 flat config, Prettier                                                            |

---

## 3. Commands

```sh
bun i                              # install
bun run dev                        # Vite dev server (NO D1 bindings available)
bun run build                      # Nitro build → .output/
bun run build:sdk                  # tsc build of packages/webwatch-sdk → dist/
bun run preview                    # preview the build
bun run test                       # Vitest (app suite + SDK suite)
bun run lint                       # ESLint
bun run format                     # Prettier --write
bun node_modules/typescript/lib/tsc.js --noEmit   # type check (root tsconfig: src/ only)
```

**Type check the SDK package separately** (it has its own tsconfig and is not part of the root
`include`):

```sh
bun node_modules/typescript/lib/tsc.js -p packages/webwatch-sdk/tsconfig.json --noEmit
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
db().prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(id, user.id);
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

Never hard-code colors or radii. `src/styles.css` is the single source of truth; the full
reference is [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

- **Semantic roles** (what components are allowed to use): `--color-bg`, `--color-surface`,
  `--color-surface-muted`, `--color-text`, `--color-text-muted`, `--color-text-subtle`,
  `--color-border`, `--color-border-strong`, `--color-primary`, `--color-primary-hover`,
  `--color-primary-subtle`, `--color-focus`, `--color-success`, `--color-success-surface`,
  `--color-warning`, `--color-warning-surface`, `--color-danger`, `--color-danger-surface`,
  `--color-info`, `--color-info-surface`.
- **Monitoring status**: `--up`, `--down`, `--degraded`, `--paused`. `--paused` is neutral on
  purpose: a paused site is not a fault.
- **Charts**: `--chart-1` through `--chart-5`. **Code**: `--code-plain`, `--code-punctuation`,
  `--code-keyword`, `--code-attribute`, `--code-string`.
- **Shape and type**: `--radius-xs/sm/md/lg/xl`, `--shadow-sm/md/lg`, `--font-sans`,
  `--font-display`, `--font-mono`, `--container-reading/content/wide`.

The palette is OKLCH. Add new colors as semantic tokens rather than inline hex values, and
write down the reason in `DESIGN_SYSTEM.md`.

---

## 5. Conventions

| Area              | Rule                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language          | Code, comments, identifiers, and commit messages in **English**. User-facing copy (UI strings, Telegram messages) is **Indonesian** — keep it that way. |
| Formatting        | Prettier: 100 print width, double quotes, semicolons, trailing commas.                                                                                  |
| Timestamps        | Store ISO-8601 UTC strings (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`).                                                                                    |
| IDs               | `crypto.randomUUID()` via `newId()` from `@/lib/auth.server`.                                                                                           |
| API keys          | `ww_` + 24 random bytes hex, generated in `src/routes/api/sites/keys.ts`.                                                                               |
| API errors        | `{ "error": "<machine_code>" }` — snake_case codes, English.                                                                                            |
| Telegram messages | HTML parse mode. **Always escape interpolated values** with `escapeHtml()`.                                                                             |
| Routes            | File-based. See `src/routes/README.md`. Never create `src/pages/`, `app/layout.tsx`, or `_app/` — those are Next.js/Remix conventions.                  |
| Generated files   | `src/routeTree.gen.ts` is generated. Never hand-edit it.                                                                                                |
| UI primitives     | `src/components/ui/*` are shadcn/ui generated. Change them only deliberately.                                                                           |
| Design system     | `DESIGN_SYSTEM.md` documents the tokens, components, states, and the documented deviations. Update it whenever a token is added or a rule changes.      |

### Adding an API route

1. Create `src/routes/api/<area>/<name>.ts` with `createFileRoute(...)`.
2. Implement the handler in `src/lib/<area>-api.server.ts` (thin route files may inline trivial
   handlers, as `api/sites/keys.ts` does — prefer the lib for anything non-trivial).
3. Guard it with `requireUser(request)` unless it is intentionally public.
4. Use `Response.json({ ... })` and machine-readable error codes.
5. Add a `try/catch` that logs with `console.error` and returns `500 { "error": "server_error" }`.

---

## 6. The APM ingestion contract

There is no monitoring state machine and no scheduler. Ingestion is a stateless pipe:

- `POST /api/ingest` authenticates with `Authorization: Bearer ww_…`, looks the key up in
  `api_keys`, joins `sites`, and requires `verification_status = 'verified'` **and**
  `is_active = 1` (`is_active` doubles as the APM ingest toggle).
- Body: `{ events: [{ type, message, environment?, stack_trace?, url?, method?, user_agent? }] }`.
  Events are batch-inserted into `apm_events` with a single reused prepared statement.
- Error codes: `missing_token`, `invalid_key`, `site_not_verified`, `invalid_payload`,
  `server_error`. CORS is `*` because the browser SDK posts from customer origins.
- Momentary APM error alerts (`formatApmErrorMessage`) are sent to the linked Telegram chat of
  the site owner.
- The npm SDK (`packages/webwatch-sdk/`) batches events in memory (max 1000 queued, max 50 per
  request, 5 s flush interval, 5 s duplicate throttle, 3 exponential retries for 5xx/408/429 and
  network errors — 400/401/403/404 fail fast). Its pure logic is unit-tested in
  `packages/webwatch-sdk/src/*.test.ts`.

Do not add staleness probes, thresholds, or "check" loops here — that was uptime monitoring and
it has been deleted on purpose.

---

## 7. Testing expectations

- New pure logic goes into `*.server.ts` **or** a sibling pure module and gets a unit test.
- Vitest runs **both** glob sets: `src/**/*.test.ts` (app) and
  `packages/**/src/**/*.test.ts` (SDK). A test elsewhere (mis. `scripts/`) is silently ignored.
- Test names are written in Indonesian to match the existing suite.
- Vitest does not type-check. The root `tsconfig.json` covers `src/` only; `packages/` is
  type-checked with its own tsconfig (see §3). Type-check whichever you touch.
- Run `bun run test` and `bun run lint` before proposing a change.

---

## 8. Deployment

One worker:

```sh
bunx wrangler d1 migrations apply webwatch --remote
bun run build
bunx wrangler deploy
```

`scheduler-worker/` was deleted along with the uptime feature — do **not** add a cron trigger
to the main worker: the Nitro `cloudflare-module` preset swallows the `scheduled` event. If a
future feature needs a schedule, bring back a separate scheduler worker with the same pattern
documented in git history.

Secrets are set with `bunx wrangler secret put` and are **never** committed:

- `TELEGRAM_BOT_TOKEN` — bot API access (also resolved `botUsername` at runtime).
- `TELEGRAM_WEBHOOK_SECRET` — compared against the `x-telegram-bot-api-secret-token` header of
  `POST /api/public/telegram/webhook`.

Register the webhook with Telegram's `setWebhook` API using the same secret value.

---

## 9. Known gaps

`DESIGN.md` contains the full list of divergences between the product surface and the
implementation. Do not document unimplemented behaviour as if it exists, and do not "fix" a gap
silently — mention it in your summary.

The most common traps:

- `@webwatch/sdk@0.1.0` is published to the npm registry. The CDN build at `/api/public/sdk`
  remains the no-install path, and both are separate implementations of the same contract that
  drift independently (DESIGN.md gap G0).
- `/api/ingest` has no rate limiting.
- `apm_events` are never purged.
- API keys are stored **in plaintext** (`api_keys.key`); there is no hashing and no revocation
  UI beyond per-site key list display.
- The SSRF guard exists in two places (`sites-api.server.ts`, `bot.server.ts`) and only inspects
  the hostname string (no DNS resolution).
- `src/server/plugins/env.ts` is dead code; `vite.config.ts` registers `server/plugins/env.ts`.

---

## 10. Git

- Commit messages in English, imperative mood, describing the change rather than the process.
- Keep the branch in a working state — `main` is the deployed branch.
- Do not force-push, rebase, or amend commits that are already pushed.
- Never commit secrets, `.env` contents, or `.wrangler/` state.
