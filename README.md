# WebWatch APM & Uptime Monitoring

WebWatch adalah aplikasi pemantauan website generasi baru (seperti Sentry/Datadog) yang mendukung **Application Performance Monitoring (APM)** via SDK dan **Uptime Monitoring** dari luar. Dilengkapi dengan notifikasi Telegram *real-time*!

## Fitur Unggulan

- **Application Performance Monitoring (APM)** — Tangkap log dan error (Frontend & Backend) dari dalam aplikasi menggunakan WebWatch SDK via CDN (Tanpa `npm install`).
- **Validasi Kepemilikan Domain** — Sistem verifikasi keamanan via file `webwatch-verify.txt`.
- **API Keys & Ingestion Server** — Server *ingest* *batch-processing* yang aman (Bearer token) dan *scalable* untuk menangkap ribuan event.
- **Pemantauan Uptime Aktif** — Cek HTTP dari luar tiap menit menggunakan Cloudflare Cron Trigger.
- **Alert Telegram Instan** — Notifikasi saat SDK menangkap error kritis, atau saat server mati (DOWN/RECOVERED).
- **Login OTP Telegram** — Keamanan tanpa *password*, menggunakan verifikasi chat bot Telegram.
- **Multi-user** — Isolasi data penuh per pengguna di atas *database* Cloudflare D1.

## Tech stack

| Lapisan         | Teknologi                                                  |
| --------------- | ---------------------------------------------------------- |
| Frontend / SSR  | TanStack Start (React + TanStack Router + TanStack Query)  |
| Backend API     | Endpoint API TanStack Start + bot Telegram mode webhook    |
| Database & Auth | Cloudflare D1 (SQLite) — session cookie + OTP via Telegram |
| Scheduler       | Cloudflare Cron Trigger (`* * * * *`)                      |
| Hosting         | Cloudflare Workers via Nitro (preset `cloudflare-module`)  |
| Tooling         | Bun, TypeScript, Vite, Vitest, Tailwind CSS                |

## Arsitektur singkat

```
src/
├── routes/
│   ├── index.tsx                  # Landing page
│   ├── auth.tsx                   # Login OTP via Telegram (email → link bot → kode)
│   ├── _authenticated/
│   │   ├── route.tsx              # Guard: cek session cookie
│   │   ├── dashboard.tsx          # Kelola situs + status Telegram
│   │   └── sites.$id.tsx          # Detail situs: grafik, riwayat, edit
│   └── api/
│       ├── auth/{otp,link-status,verify,me,logout}.ts
│       ├── sites.ts / sites/detail.ts   # CRUD situs (auth cookie)
│       └── public/
│           ├── telegram/webhook.ts      # Webhook bot Telegram
│           └── cron/run.ts              # Trigger manual monitor (rahasia)
├── lib/
│   ├── monitor-core.ts            # Logika murni: evaluasi status, cooldown, SSL (dites)
│   ├── monitor.server.ts          # Engine monitoring + notifikasi (D1)
│   ├── bot.server.ts              # Handler command bot Telegram (D1)
│   ├── auth.server.ts             # OTP, session, cookie, hash
│   ├── auth-flows.server.ts       # Handler endpoint auth
│   ├── sites-api.server.ts        # CRUD situs
│   ├── wrangler-env.ts            # Akses binding (env.DB) dari route handler
│   ├── monitor-cron.ts            # Daftarkan monitor ke event `scheduled` CF
│   └── telegram.server.ts         # Formatter pesan + kirim via Bot API
├── types/d1.d.ts                  # Tipe ambien D1
└── components/                    # UI + blok marketing
```

Scheduler memakai worker mungil `scheduler-worker/` (Cloudflare Cron Trigger tiap menit) yang memanggil endpoint drainase main worker lewat Service Binding — karena preset `cloudflare-module` membungkus worker sehingga event `scheduled` milik kode kita sendiri tidak bisa dipakai langsung di worker utama.

## Database (D1)

Migrasi D1 ada di `migrations/d1/`:

```sh
bunx wrangler d1 migrations apply webwatch --remote
```

## Environment variables

Variabel di atas hanya dibutuhkan server-side (set sebagai **secret** di Cloudflare):

```
TELEGRAM_BOT_TOKEN=        # secret
TELEGRAM_BOT_USERNAME=     # secret/var (username bot tanpa @)
TELEGRAM_WEBHOOK_SECRET=   # secret (juga melindungi endpoint cron manual)
```

`.env` lokal cukup untuk development; jangan commit token asli.

## Development

Dibutuhkan [Bun](https://bun.sh) (atau Node.js).

```sh
git clone <repo-url>
cd <repo>
bun i
bun run dev
```

Untuk menjalankan worker + D1 secara lokal:

```sh
bun run build
bunx wrangler d1 migrations apply webwatch --local
bunx wrangler dev
```

## Script yang tersedia

```sh
bun run dev          # dev server
bun run build        # produksi build (Nitro, output cloudflare-module)
bun run preview      # pratinjau hasil build
bun run test         # vitest (unit test logika monitoring & formatter pesan)
bunx tsc --noEmit    # typecheck
bun run lint         # eslint
```

## Deployment

```sh
bunx wrangler d1 migrations apply webwatch --remote   # migrasi schema D1
bun run build                                         # build fullstack Worker
bunx wrangler secret put TELEGRAM_BOT_TOKEN            # secret dulu (sekali)
bunx wrangler deploy                                  # deploy main worker
bunx wrangler deploy --config scheduler-worker/wrangler.jsonc  # deploy scheduler
```

Setelah deploy, daftarkan webhook Telegram:

```sh
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_BOT_USERNAME
wrangler secret put TELEGRAM_WEBHOOK_SECRET
wrangler deploy

# lalu daftarkan webhook (token dari secret TELEGRAM_BOT_TOKEN).
# Gunakan --data-urlencode; tambah ip_address jika resolver Telegram gagal resolve host workers.dev:
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  --data-urlencode "url=https://webwatch.hugoedmoundo.workers.dev/api/public/telegram/webhook" \
  --data-urlencode "secret_token=<WEBHOOK_SECRET>"
```

## Testing

Unit test mencakup logika murni di `src/lib/`:

- Evaluasi status (up/down/threshold & keyword)
- Cooldown anti-flapping
- Peringatan SSL (kadaluarsa / < 7 hari / throttle ulang)
- Format pesan notifikasi Telegram (escaping label)

```sh
bun run test
```

## Alur login OTP

1. User memasukkan email → server mengecek apakah email sudah terhubung dengan chat Telegram.
2. Belum terhubung → halaman menampilkan link `/start <token>` ke bot; saat bot ditekan, chat terhubung ke email.
3. Server mengirim kode 6 digit ke chat Telegram (berlaku 5 menit, sekali pakai).
4. User memasukkan kode → server membuat session (cookie `HttpOnly`) → masuk ke dashboard.

## Roadmap

- Fase 1 (selesai): auth OTP, kelola situs, monitoring dasar, notifikasi down/recovered.
- Fase 2 (selesai): dashboard statistik, keyword check, SSL check, anti-flapping, grafik 24h/7d/30d, migrasi Supabase → D1.
- Fase 3 (opsional): channel notifikasi tambahan, status page publik, multi-region check.

---

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c3c51c42-0cd5-4d95-b8c3-f1d2bee95874).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
