# WebWatch

**APM error monitoring untuk aplikasi web — berjalan penuh di Cloudflare Workers + D1.**
Satu Worker menangkap error dari aplikasi user lewat SDK ringan, menyimpannya ke D1, mengirim
alert ke Telegram, dan menampilkan semuanya di dashboard — tanpa agent, tanpa server, tanpa VM.

> Catatan: WebWatch sebelumnya punya fitur uptime monitoring (probe berkala, incident, alarm SSL).
> Seluruh fitur itu **telah dihapus** — produk kini fokus pada pengumpulan log error (APM saja).
> Fitur uptime tidak diiklankan maupun didukung oleh implementasi saat ini.

---

## Fitur

- **Pengumpulan log error (APM)** — SDK kirim batch event error (`frontend_error`,
  `backend_error`, `api_error`, …) ke endpoint ingest yang diautentikasi API key per situs
  (`ww_…`). Tanpa agent, tanpa VM.
- **Dua kanal SDK**:
  - Paket npm **`@webwatch/sdk`** — zero-config: set dua env (`WEBWATCH_KEY` + `WEBWATCH_URL`),
    import sekali, auto-capture `unhandledRejection` / `uncaughtException`, batching + retry,
    plus helper Express / Hono / Fastify / Next.js.
  - CDN build **`/api/public/sdk`** — satu berkas ES module dari deployment kamu sendiri,
    tanpa npm install, untuk browser.
- **Verifikasi domain** — sebelum telemetri diterima, situs harus meng-host
  `webwatch-verify.txt` berisi token verifikasi. Ini mencegah orang lain memarkir telemetri
  dengan nama domain yang bukan miliknya.
- **Alert Telegram** — log error APM memicu pesan alert ke chat Telegram yang terhubung; kode
  masuk (OTP) login juga dikirim via chat yang sama.
- **Dashboard & halaman detail situs** — daftar event terbaru, environment, stack trace, URL,
  method, user agent.
- **Halaman status publik** — `/status` menampilkan komponen layanan.

### Yang tidak ada (dengan sengaja)

`checks`, `incidents`, penjadwalan probe, dan alarm SSL tidak lagi bagian dari proyek. Dua tabel
uptime dihapus dan kolom-kolom `sites` yang bersifat monitor dihapus dari schema (migrasi 0007).
Jika kamu mencari kode itu, cari di riwayat git.

---

## Arsitektur

```
┌────────────────────────────┐        ┌────────────────────────────┐
│  Aplikasi user (browser)   │        │  Aplikasi user (server)    │
│  SDK via /api/public/sdk   │        │  @webwatch/sdk (npm)       │
└─────────────┬──────────────┘        └─────────────┬──────────────┘
              │        POST /api/ingest (Bearer ww_)│
              ▼                                     ▼
      ┌───────────────────────────────────────────────────┐
      │        Cloudflare Worker "webwatch"               │
      │   TanStack Start + Nitro, cloudflare-module       │
      │  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
      │  │ Dashboard/API│  │ Ingest     │  │ Telegram  │  │
      │  │ (SSR/React)  │  │ webhook    │  │ bot       │  │
      │  └──────────────┘  └────────────┘  └───────────┘  │
      └───────────────────────────┬───────────────────────┘
                                  ▼
                            ┌──────────┐
                            │ Cloudflare│
                            │    D1     │
                            └──────────┘
```

Satu Worker. Tanpa cron scheduler.

---

## Menjalankan & deploy

```sh
bun i                                            # install
bun run build && bunx wrangler dev               # lokal dengan D1 binding
bunx wrangler d1 migrations apply webwatch --local
```

Deploy:

```sh
bunx wrangler d1 migrations apply webwatch --remote
bun run build
bunx wrangler deploy
```

Set sekret (jangan pernah di-commit):

```sh
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Daftarkan webhook Telegram ke `https://<deployment>/api/public/telegram/webhook` dengan
`secret_token` yang sama dengan `TELEGRAM_WEBHOOK_SECRET`.

### Pengembangan lokal

`bun run dev` tidak bisa menginjeksi binding D1 — semua jalur kode yang menyentuh D1 hanya
bisa diuji setelah `bun run build && bunx wrangler dev`. Detail workflow ada di
[AGENTS.md](AGENTS.md).

---

## Variabel & sekret

| Nama                      | Jenis          | Fungsi                                                |
| ------------------------- | -------------- | ----------------------------------------------------- |
| `DB`                      | binding D1     | Database utama (`d1_databases` di `wrangler.jsonc`)   |
| `ASSETS`                  | binding assets | Bersifat internal (Nitro static output)               |
| `TELEGRAM_BOT_TOKEN`      | secret         | Kirim pesan + resolve nama bot di UI                  |
| `TELEGRAM_WEBHOOK_SECRET` | secret         | Header `x-telegram-bot-api-secret-token` pada webhook |
| `TELEGRAM_BOT_USERNAME`   | var (opsional) | Fallback nama bot untuk link penghubung di UI         |

---

## Route map

### Halaman

| Route        | Pengguna    | Isi                                             |
| ------------ | ----------- | ----------------------------------------------- |
| `/`          | Publik      | Landing + fitur                                 |
| `/docs`      | Publik      | Panduan instalasi SDK & ingest                  |
| `/status`    | Publik      | Status komponen layanan                         |
| `/auth`      | Publik      | Login OTP via email → Telegram                  |
| `/dashboard` | Autentikasi | Ringkasan event APM terbaru                     |
| `/sites/$id` | Autentikasi | Detail situs: verifikasi, API key, daftar event |
| `/apm`       | Autentikasi | Log Error (APM) lintas situs                    |
| `/settings`  | Autentikasi | Pengaturan akun                                 |

### API

| Endpoint                            | Auth           | Fungsi                                        |
| ----------------------------------- | -------------- | --------------------------------------------- |
| `POST /api/ingest`                  | Bearer `ww_`   | Ingest batch event APM                        |
| `GET /api/public/sdk`               | —              | CDN build SDK browser (ES module)             |
| `POST /api/public/telegram/webhook` | secret header  | Update dari Telegram Bot API                  |
| `GET /api/system-status`            | —              | JSON status komponen untuk halaman `/status`  |
| `GET /api/auth/me`                  | session cookie | User aktif                                    |
| `POST /api/auth/otp`                | —              | Kirim kode masuk ke chat terhubung            |
| `POST /api/auth/verify`             | —              | Verifikasi OTP → set session cookie           |
| `GET /api/auth/link-status`         | —              | Status penghubungan Telegram                  |
| `POST /api/auth/logout`             | session cookie | Buang session                                 |
| `GET /api/sites`                    | session        | Daftar situs milik user                       |
| `POST /api/sites`                   | session        | Tambah situs (`url`)                          |
| `PATCH /api/sites`                  | session        | Update `name` / `is_active`                   |
| `DELETE /api/sites`                 | session        | Hapus situs                                   |
| `GET /api/sites/detail?id=`         | session        | Detail situs + 100 event terbaru              |
| `GET /api/sites/dashboard`          | session        | 15 event terbaru lintas situs untuk dashboard |
| `GET /api/sites/events?siteId=`     | session        | 100 event terbaru satu situs                  |
| `GET /api/sites/keys?siteId=`       | session        | Daftar API key situs                          |
| `POST /api/sites/keys`              | session        | Buat API key baru (`ww_` + 24 byte hex)       |
| `POST /api/sites/verify`            | session        | Verifikasi domain via `webwatch-verify.txt`   |

Semua error API berbentuk `{ "error": "<machine_code>" }` — snake_case, bahasa Inggris.

---

## Sistem auth

Passwordless. Email → OTP. OTP hanya berguna bila chat Telegram sudah terhubung:

1. Di `/auth`, user masukkan email → dashboard minta link `t.me/<bot>?start=<token>`
   (membuat baris `telegram_links` berstatus `pending`, TTL 10 menit).
2. User mengetuk `/start <token>` di Telegram → bot menandai baris `linked`, membuat user.
3. Kembali di `/auth`, minta OTP → kode 6 digit di-hash (SHA-256), dikirim ke chat.
   TTL 5 menit, maks 5 percobaan, maks 3 kode aktif, resend minimum 30 detik.
4. Verifikasi `api/auth/verify` → cookie `ww_session` (HttpOnly, 30 hari).

---

## Siklus hidup situs

1. **Tambah** — dari bot (`/addsite <url>`) atau `POST /api/sites`. URL unik global; URL
   internal/private IP ditolak. Status verifikasi awal `pending`.
2. **Verifikasi** — host `webwatch-verify.txt` di origin berisi token verifikasi, lalu klik
   verifikasi di dashboard (`POST /api/sites/verify`). Worker mengambil berkas
   `https://<url>/webwatch-verify.txt` (timeout 10 detik) dan mencocokkan token.
3. **API key** — buat `ww_…` di dashboard untuk situs terverifikasi.
4. **Terima telemetri** — ingest hanya diterima saat `verification_status = 'verified'` **dan**
   `is_active = 1`.
5. **Hapus/jeda** — `DELETE /api/sites`, `PATCH /api/sites`, atau bot (`/removesite`,
   `/pause`, `/resume`).

---

## Kontrak ingest

```http
POST /api/ingest
Authorization: Bearer ww_your_api_key
Content-Type: application/json

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

Kode error: `missing_token`, `invalid_key`, `site_not_verified`, `invalid_payload`.
CORS diperbolehkan dari origin mana pun karena SDK browser berjalan di situs pelanggan.

---

## SDK

### Opsi A — paket npm (server + runtime ter-bundle)

```sh
npm install @webwatch/sdk
```

```sh
export WEBWATCH_KEY="ww_..."
export WEBWATCH_URL="https://<deployment-webwatch-kamu>"
```

```js
import "@webwatch/sdk"; // auto-capture + batching, selebihnya otomatis
```

Helper framework:

```js
// Express
import { expressErrorMiddleware, wrapAsync } from "@webwatch/sdk/express";
app.use(expressErrorMiddleware()); // setelah semua route

// Hono
import { honoOnError } from "@webwatch/sdk/hono";
app.onError(honoOnError());

// Fastify
import { fastifyErrorHandler } from "@webwatch/sdk/fastify";
fastify.setErrorHandler(fastifyErrorHandler());
```

```ts
// Next.js — instrumentation.ts
export async function register() {
  await import("@webwatch/sdk/next").then((m) => m.register());
}
```

Perilaku: queue memori (maks 1000 event, paling tua dibuang), flush per 50 event atau 5 detik,
retry eksponensial 3x untuk 5xx/408/429 & error jaringan (400/401/403/404 gagal cepat),
throttle duplikat 5 detik. Dokumentasi lengkap: [`packages/webwatch-sdk/README.md`](packages/webwatch-sdk/README.md).

### Opsi B — CDN build (tanpa npm install)

```js
import { WebWatch } from "https://your-domain.example/api/public/sdk";

WebWatch.init("ww_your_api_key", "https://your-domain.example/api/ingest");
```

`init()` otomatis menangkap `window.error` → `frontend_error` dan
`window.unhandledrejection` → `frontend_promise_error`.

### Capture manual (semua kanal)

```js
await WebWatch.capture(
  "api_error", // tipe event
  "Payment gateway timeout", // pesan
  error.stack, // stack trace (nullable)
  "/api/pay", // url
  "POST", // method
);
```

> Paket `@webwatch/sdk@0.1.0` sudah tersedia di registry npm. Source-nya ada di
> `packages/webwatch-sdk/` (build `bun run build:sdk`, diuji vitest). Kanal tanpa-install tetap
> tersedia lewat `/api/public/sdk`. Kedua kanal merupakan implementasi terpisah atas kontrak
> yang sama, lihat [DESIGN.md](DESIGN.md) untuk daftar gap terkini.

---

## Perintah bot Telegram

| Perintah           | Fungsi                                        |
| ------------------ | --------------------------------------------- |
| `/start <token>`   | Hubungkan chat ke akun (dari halaman `/auth`) |
| `/help`            | Bantuan                                       |
| `/addsite <url>`   | Tambah situs                                  |
| `/listsite`        | Daftar situs                                  |
| `/removesite <id>` | Hapus situs                                   |
| `/pause <id>`      | Jeda ingest APM                               |
| `/resume <id>`     | Lanjutkan ingest APM                          |

`<id>` boleh diisi 8 karakter pertama dari ID situs.

---

## Data model (Cloudflare D1)

Skema final (setelah migrasi 0007) — timestamp ISO-8601 UTC:

| Tabel            | Kolom penting                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `users`          | `id`, `email` (unik), `chat_id`, `tg_username`                                                         |
| `sessions`       | `token_hash` (PK), `user_id`, `expires_at` — token mentah hanya hidup di cookie                        |
| `otp_codes`      | `email`, `code_hash`, `expires_at`, `used`, `attempts`                                                 |
| `telegram_links` | `token` (PK), `email`, `chat_id`, `status` (`pending`/`linked`), `expires_at`                          |
| `sites`          | `id`, `user_id`, `name`, `url` (unik global), `is_active`, `verification_token`, `verification_status` |
| `api_keys`       | `key` (`ww_…`, PK), `site_id`, `name`                                                                  |
| `apm_events`     | `site_id`, `environment`, `event_type`, `message`, `stack_trace`, `url`, `method`, `user_agent`        |

Migrasi ada di `migrations/d1/0001`–`0007`. Selengkapnya: [DESIGN.md](DESIGN.md).

---

## Struktur repo

```
src/
├── routes/                        # TanStack file-based routes (halaman + API, handler tipis)
├── lib/                           # Logika bisnis (*.server.ts punya akses D1/sekret/jaringan)
│   ├── auth.server.ts             # Session/OTP/link API
│   ├── auth-flows.server.ts       # HTTP-shaped auth operations
│   ├── sites-api.server.ts        # Site CRUD + verifikasi + SSRF guard
│   ├── bot.server.ts              # Telegram command dispatcher
│   ├── telegram.server.ts         # sendTelegram + formatter pesan
│   └── wrangler-env.ts            # Akses tunggal binding D1 & sekret
├── components/
│   ├── app/                       # Shell autentikasi (sidebar, stat card, dsb.)
│   ├── marketing/                 # Blok landing
│   └── ui/                        # shadcn/ui primitives (generated)
└── hooks/
packages/webwatch-sdk/              # Paket npm @webwatch/sdk (build: bun run build:sdk)
migrations/d1/                       # Migrasi D1 (0001–0007)
public/                              # Aset statis
scripts/                             # Generator aset brand
wrangler.jsonc                       # Konfigurasi Worker utama
```

---

## Keterbatasan yang diketahui

Ini gap implementasi nyata yang terdokumentasi di [DESIGN.md](DESIGN.md), dicantumkan agar
ekspektasi benar sebelum deploy:

| Gap                                                 | Dampak                                             |
| --------------------------------------------------- | -------------------------------------------------- |
| `/api/ingest` tanpa rate limiting                   | Satu API key bisa memasukkan baris tanpa batas     |
| `apm_events` tidak pernah di-purge                  | Tabel tumbuh tanpa batas                           |
| API key disimpan plaintext di `api_keys.key`        | Rotasi/revocation terbatas pada pembuatan & daftar |
| SSRF guard hanya memeriksa hostname string          | Hostname yang resolve ke IP privat bisa lolos      |
| SSRF guard hanya memeriksa hostname string          | Hostname yang resolve ke IP privat bisa lolos      |
| `is_active` situs dipakai dobel (toggle ingest APM) | Tidak ada konsep jeda "pantau tapi simpan"         |
| Kanal CDN vs paket npm: dua implementasi terpisah   | Bisa beda perilaku; lihat gap G0 di DESIGN.md      |

Punya beberapa menit ekstra? Baca
[DESIGN.md](DESIGN.md) untuk model data, alur keamanan, dan daftar gap lengkap sebelum
mengubah struktur.

---

## Kontribusi

Issues dan pull requests terbuka:
[github.com/hsanmz/webwatch](https://github.com/hsanmz/webwatch). Lihat
[AGENTS.md](AGENTS.md) untuk konvensi yang dipakai kontributor dan coding agent.
