# WebWatch

WebWatch adalah aplikasi monitoring uptime website multi-user dengan notifikasi Telegram. WebWatch memantau situs kamu tiap menit dan mengirim alert instan saat website down **dan** saat pulih kembali — lengkap dengan cek keyword, cek SSL, serta riwayat & grafik uptime 30 hari.

## Fitur

- **Pemantauan otomatis** — interval mulai 1 menit, timeout 10 detik, HTTP request dilakukan jarak jauh.
- **Alert Telegram real-time** — notifikasi DOWN dan RECOVERED ke chat Telegram pemilik situs, lengkap dengan penyebab dan durasi downtime.
- **Anti false alarm** — threshold kegagalan berturut-turut + cooldown 10 menit.
- **Keyword check** — deteksi "soft down" (status 200 tapi halaman error/maintenance).
- **Cek SSL & masa berlaku** — peringatan sertifikat mendekati kedaluwarsa (< 7 hari) atau sudah kadaluarsa.
- **Riwayat & statistik** — uptime % 24 jam / 7 hari / 30 hari, grafik response time, daftar insiden.
- **Retensi otomatis** — data riwayat diputar (rolling) 30 hari terakhir.
- **Multi-user** — isolasi data per user (RLS), siapa pun bisa daftar dan memantau situsnya sendiri.

## Tech stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend / SSR | TanStack Start (React + TanStack Router + TanStack Query) |
| Backend API | Endpoint API TanStack Start + bot Telegram mode webhook |
| Database & Auth | Supabase (Postgres + Auth + RLS + pg_cron) |
| Hosting | Cloudflare Workers/Pages via Nitro (preset `cloudflare-module`) |
| Tooling | Bun, TypeScript, Vite, Vitest, Tailwind CSS |

Catatan: desain awal di SRS memakai Cloudflare Workers + D1 + Hono. Implementasi saat ini menjalankan logika monitoring di sisi server TanStack Start dengan Supabase sebagai datastore — logika murni dipisahkan dari platform (`src/lib/monitor-core.ts`) sehingga mudah dimigrasi.

## Arsitektur singkat

```
src/
├── routes/
│   ├── index.tsx                  # Landing page
│   ├── auth.tsx                   # Login / daftar
│   ├── _authenticated/
│   │   ├── dashboard.tsx          # Kelola situs + link Telegram
│   │   └── sites.$id.tsx          # Detail situs: grafik, riwayat, edit
│   └── api/
│       └── public/telegram/webhook.ts  # Webhook bot Telegram
├── lib/
│   ├── monitor-core.ts            # Logika murni: evaluasi status, cooldown, SSL (gampang dites)
│   ├── monitor.server.ts          # Engine monitoring + notifikasi
│   ├── telegram.server.ts         # Formatter pesan + kirim via Bot API
│   └── bots.ts / bot.server.ts    # Handler command bot Telegram
├── integrations/supabase/         # Client, RLS helper, cron auth
└── components/                    # UI + blok marketing
```

Scheduler update situs diimplementasikan sebagai job pg_cron di Supabase yang memanggil endpoint pemantauan (lihat `supabase/`).

## Environment variables

```
# Supabase — client
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Supabase — server (SSR & engine)
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Telegram bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=

# Cron / Lovable
LOVABLE_CRON_SECRET=
LOVABLE_CRON_SECRET_PREVIOUS=
```

## Development

Dibutuhkan [Bun](https://bun.sh) (atau Node.js).

```sh
git clone <repo-url>
cd <repo>
bun i
bun run dev
```

## Script yang tersedia

```sh
bun run dev          # dev server (sering pakai --host untuk akses dari HP)
bun run build        # produksi build (Nitro, output cloudflare-module)
bun run preview      # pratinjau hasil build
bun run test         # vitest (unit test logika monitoring & formatter pesan)
bunx tsc --noEmit    # typecheck
bun run lint         # eslint
```

## Database

Migrasi ada di `supabase/migrations/` (format `YYYYMMDDHHMMSS_nama.sql`). Migrasi yang sudah ada, termasuk SSL check, dijalankan otomatis oleh Lovable/Supabase saat terhubung — pastikan migrasi terbaru sudah ter-apply sebelum mengaktifkan fitur SSL dari dashboard.

## Testing

Unit test mencakup logika murni di `src/lib/`:

- Evaluasi status (up/down/threshold & keyword)
- Cooldown anti-flapping
- Peringatan SSL (kadaluarsa / < 7 hari / throttle ulang)
- Format pesan notifikasi Telegram (escaping label)

```sh
bun run test
```

## Roadmap

- Fase 1 (selesai): auth, kelola situs, monitoring dasar, notifikasi down/recovered, linking Telegram.
- Fase 2 (selesai): dashboard statistik, keyword check, SSL check, anti-flapping, grafik 24h/7d/30d.
- Fase 3 (opsional): channel notifikasi tambahan, status page publik, multi-region check.

---

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c3c51c42-0cd5-4d95-b8c3-f1d2bee95874).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.