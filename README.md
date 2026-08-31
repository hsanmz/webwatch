# WebWatch

gua punya rancangan, jadi kita bisa mantau website kita, kalo misal down atau selesai di perbaiki dari down bree.. orang lain juga bisa pake aplikasi gua.. 
Software Requirements Specification (SRS)

WebWatch — Website Uptime Monitor dengan Notifikasi Telegram

Versi dokumen

1.0

Tanggal

23 Agustus 2026

Status

Draft — menunggu persetujuan

Dokumen terkait

PRD-WebWatch.md





1. Pendahuluan

1.1 Tujuan

Dokumen ini menjabarkan kebutuhan teknis, arsitektur, dan spesifikasi implementasi sistem WebWatch — aplikasi monitoring uptime website multi-user dengan notifikasi Telegram, dibangun di atas infrastruktur serverless gratis (Cloudflare).

1.2 Ruang Lingkup

Sistem mencakup: backend API, engine monitoring terjadwal, bot Telegram (mode webhook), dashboard web, dan database. Tidak mencakup channel notifikasi selain Telegram pada versi ini.

1.3 Definisi & Istilah

Istilah

Arti

Site

Website/endpoint yang dipantau

Check

Satu kali eksekusi pengecekan HTTP terhadap sebuah site

Incident

Periode downtime, dari status berubah down sampai recovered

Flapping

Situs naik-turun status berulang dalam waktu singkat

Worker

Cloudflare Workers, unit compute serverless

D1

Cloudflare D1, database SQLite serverless





2. Gambaran Arsitektur Sistem

2.1 Komponen






2.2 Alasan Pemilihan Arsitektur

Cloudflare Workers: serverless, tidak pernah "tidur" (bukan server idle, murni on-demand per-request), free tier 100.000 request/hari.

Cloudflare D1: SQLite serverless, tidak butuh koneksi standby sehingga tidak mengenal konsep pause/sleep, free tier ±5GB storage.

Cron Trigger: menggantikan scheduler tradisional (APScheduler/cron server), berjalan tiap 1 menit (minimum interval yang diizinkan Cloudflare), free plan mendukung hingga 3 cron trigger per Worker — sistem ini hanya butuh 1.

Hono: web framework ringan yang native untuk Workers runtime, sintaks mirip Express/FastAPI sehingga mudah dipetakan dari rancangan awal.

Auth custom: dibangun sendiri (bukan pakai provider auth pihak ketiga) agar seluruh sistem 100% berjalan di dalam ekosistem Cloudflare tanpa risiko limit/downtime dari layanan eksternal.





3. Kebutuhan Fungsional

FR-1 — Autentikasi

FR-1.1: Sistem harus mengizinkan registrasi user baru dengan email & password.

FR-1.2: Password disimpan dalam bentuk hash (bukan plaintext), menggunakan algoritma hashing aman (PBKDF2 via Web Crypto API).

FR-1.3: Sistem harus mengizinkan login dan menerbitkan session token (JWT), disimpan sebagai HTTP-only cookie.

FR-1.4: Setiap endpoint API (selain register/login) harus memvalidasi token sebelum memproses request.

FR-2 — Menghubungkan Akun Telegram

FR-2.1: User yang login dapat meminta link koneksi Telegram; sistem membuat token unik sekali-pakai dengan masa berlaku 10 menit, disimpan di tabel telegram_links dengan status pending.

FR-2.2: Sistem menghasilkan deep-link https://t.me/<bot_username>?start=<token>.

FR-2.3: Saat bot menerima perintah /start <token> via webhook, sistem mencocokkan token, menyimpan chat_id pengirim, dan mengubah status jadi linked.

FR-2.4: Token yang sudah dipakai atau kedaluwarsa tidak dapat dipakai ulang.

FR-3 — Manajemen Situs (Site)

FR-3.1: User dapat menambah situs baru lewat dashboard (POST /api/sites) atau command bot /addsite <url> [interval_menit].

FR-3.2: Setiap situs memiliki: URL, interval cek (default 5 menit, minimum 1 menit), threshold gagal berturut-turut (default 2), status aktif/nonaktif, opsional keyword pencarian, opsional flag cek SSL.

FR-3.3: User dapat melihat daftar situsnya (GET /api/sites, atau /listsite).

FR-3.4: User dapat menghapus situs (DELETE /api/sites/:id, atau /removesite).

FR-3.5: User dapat pause/resume pemantauan situs tanpa menghapus data (/pause, /resume).

FR-3.6: Sistem harus memvalidasi bahwa user hanya bisa mengakses/mengubah situs miliknya sendiri.

FR-4 — Engine Pemantauan

FR-4.1: Cron trigger berjalan setiap 1 menit, mengambil semua situs aktif yang jadwal pengecekan berikutnya sudah jatuh tempo.

FR-4.2: Untuk tiap situs, sistem mengirim HTTP request (method GET/HEAD sesuai konfigurasi) dengan timeout maksimum 10 detik.

FR-4.3: Sistem mengevaluasi hasil: status code, waktu respons, keberadaan keyword (jika diset), dan tanggal expiry SSL (jika diset).

FR-4.4: Hasil tiap pengecekan disimpan ke tabel checks.

FR-4.5: Jika pengecekan gagal, counter kegagalan berturut-turut bertambah. Jika mencapai fail_threshold, status situs berubah menjadi down, insiden baru dibuat di tabel incidents, dan notifikasi dikirim.

FR-4.6: Jika situs berstatus down kemudian berhasil dicek kembali, status berubah up, insiden ditutup (resolved_at diisi), dan notifikasi pemulihan dikirim.

FR-5 — Notifikasi Telegram

FR-5.1: Notifikasi dikirim ke chat_id milik user pemilik situs (bukan broadcast).

FR-5.2: Format notifikasi down mencakup: nama/URL situs, jenis error, waktu kejadian, jumlah kegagalan berturut-turut.

FR-5.3: Format notifikasi recovery mencakup: nama/URL situs, durasi downtime, waktu pemulihan.

FR-5.4: Sistem menerapkan cooldown anti-flapping: jika situs berubah status lebih dari N kali dalam periode tertentu (misal 15 menit), notifikasi berikutnya ditahan/dirangkum, bukan dikirim satu-satu.

FR-6 — Riwayat & Statistik

FR-6.1: User dapat melihat statistik uptime (persentase up dalam 24 jam/7 hari/30 hari terakhir) lewat dashboard atau command /status.

FR-6.2: User dapat melihat daftar insiden (downtime) lewat dashboard atau command /history.

FR-7 — Retensi Data Otomatis (Rolling 30 Hari)

FR-7.1: Sistem menjalankan job pembersihan harian (bagian dari cron trigger yang sama, dibedakan berdasarkan waktu eksekusi) yang menghapus baris di tabel checks dengan checked_at lebih lama dari 30 hari.

FR-7.2: Contoh query pembersihan:
 DELETE FROM checks WHERE checked_at < datetime('now', '-30 days');

FR-7.3: Tabel incidents mengikuti kebijakan retensi yang sama untuk menjaga ukuran database tetap minimal.





4. Kebutuhan Non-Fungsional

Kategori

Kebutuhan

Ketersediaan

Sistem monitoring itu sendiri harus tersedia >99%, mengandalkan sifat serverless Workers yang tidak memiliki instance idle yang bisa mati

Performa

Notifikasi harus terkirim maksimal 2 menit sejak status situs berubah

Skalabilitas

Arsitektur harus mendukung penambahan user tanpa perubahan struktur, dibatasi hanya oleh kuota free tier Cloudflare (100rb request/hari)

Keamanan

Password di-hash, token JWT bertanda tangan, endpoint API tervalidasi kepemilikan data per-user (tidak ada kebocoran data antar user)

Biaya

Seluruh operasional harus tetap Rp0 selama berada dalam batas free tier Cloudflare Workers, D1, dan Pages

Portabilitas

Skema database dan logic bisnis dipisah dari platform-specific code sejauh mungkin, untuk memudahkan migrasi bila suatu saat perlu keluar dari free tier





5. Skema Database (Cloudflare D1 / SQLite)

CREATE TABLE users (

  id TEXT PRIMARY KEY,              -- UUID

  email TEXT UNIQUE NOT NULL,

  password_hash TEXT NOT NULL,

  created_at TEXT DEFAULT (datetime('now'))

);




CREATE TABLE telegram_links (

  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL REFERENCES users(id),

  token TEXT UNIQUE,

  chat_id TEXT,

  status TEXT CHECK(status IN ('pending','linked')) DEFAULT 'pending',

  expires_at TEXT,

  created_at TEXT DEFAULT (datetime('now'))

);




CREATE TABLE sites (

  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL REFERENCES users(id),

  name TEXT,

  url TEXT NOT NULL,

  interval_seconds INTEGER DEFAULT 300,

  fail_threshold INTEGER DEFAULT 2,

  check_keyword TEXT,                -- opsional

  check_ssl INTEGER DEFAULT 0,       -- boolean 0/1

  is_active INTEGER DEFAULT 1,

  current_status TEXT DEFAULT 'unknown', -- up, down, unknown

  consecutive_failures INTEGER DEFAULT 0,

  last_checked_at TEXT,

  created_at TEXT DEFAULT (datetime('now'))

);




CREATE TABLE checks (

  id TEXT PRIMARY KEY,

  site_id TEXT NOT NULL REFERENCES sites(id),

  status_code INTEGER,

  response_time_ms INTEGER,

  is_up INTEGER,                     -- boolean 0/1

  error_message TEXT,

  checked_at TEXT DEFAULT (datetime('now'))

);




CREATE TABLE incidents (

  id TEXT PRIMARY KEY,

  site_id TEXT NOT NULL REFERENCES sites(id),

  started_at TEXT DEFAULT (datetime('now')),

  resolved_at TEXT,

  error_message TEXT

);




CREATE INDEX idx_checks_site_time ON checks(site_id, checked_at);

CREATE INDEX idx_sites_user ON sites(user_id);








6. Spesifikasi API (REST, via Hono)

Method

Endpoint

Deskripsi

Auth

POST

/api/auth/register

Registrasi user baru

Tidak

POST

/api/auth/login

Login, terbitkan JWT

Tidak

POST

/api/telegram/link

Generate token linking Telegram

Ya

POST

/api/telegram/webhook

Endpoint webhook Telegram

Verifikasi secret token Telegram

GET

/api/sites

List situs milik user

Ya

POST

/api/sites

Tambah situs baru

Ya

PATCH

/api/sites/:id

Update konfigurasi situs (interval, threshold, dll)

Ya

DELETE

/api/sites/:id

Hapus situs

Ya

POST

/api/sites/:id/pause

Pause pemantauan

Ya

POST

/api/sites/:id/resume

Resume pemantauan

Ya

GET

/api/sites/:id/history

Riwayat check & insiden (30 hari)

Ya

GET

/api/sites/:id/stats

Statistik uptime %

Ya





7. Spesifikasi Command Bot Telegram

Command

Fungsi

/start <token>

Menghubungkan akun Telegram dengan akun WebWatch (via token linking)

/addsite <url> [interval]

Menambahkan situs baru untuk dipantau

/listsite

Menampilkan daftar situs beserta status terkini

/removesite <id>

Menghapus situs

/pause <id>

Menonaktifkan sementara pemantauan situs

/resume <id>

Mengaktifkan kembali pemantauan situs

/status

Ringkasan status semua situs saat ini

/history <id>

Statistik uptime & daftar insiden 30 hari terakhir untuk 1 situs





8. Alur Cron Trigger (Detail Teknis)

Cron trigger berjalan tiap 1 menit dengan logic bercabang berdasarkan waktu, untuk menghemat kuota trigger (maks 3 pada free plan) sekaligus menjalankan 2 tugas berbeda dalam 1 trigger:

scheduled(event):

  1. Jalankan pengecekan situs yang jatuh tempo (setiap eksekusi, tiap 1 menit)

  2. Jika jam == 00:00 UTC (baru sekali sehari):

     - Jalankan query pembersihan data > 30 hari (FR-7)








9. Keamanan

Password: hashing PBKDF2 (Web Crypto API), tidak pernah disimpan/di-log dalam bentuk plaintext.

Sesi: JWT dengan masa berlaku terbatas (misal 7 hari), disimpan sebagai HTTP-only, Secure cookie.

Webhook Telegram: diverifikasi menggunakan secret token yang didaftarkan ke Telegram (X-Telegram-Bot-Api-Secret-Token header) agar endpoint tidak bisa dipanggil sembarang pihak.

Isolasi data: setiap query situs/riwayat wajib difilter berdasarkan user_id dari token yang sedang login — dijalankan di level query, bukan hanya di level UI.

Token linking Telegram: sekali pakai, kedaluwarsa 10 menit, dihapus/ditandai setelah dipakai.





10. Batasan Teknis & Risiko

Risiko

Mitigasi

Kuota 100rb request/hari Workers terlampaui jika user bertambah banyak

Monitoring pemakaian; upgrade ke Workers Paid ($5/bulan) jika diperlukan

Cron trigger tidak retry otomatis jika gagal

Job bersifat idempotent, tereksekusi ulang di menit berikutnya tanpa efek samping ganda

CPU time terbatas (10ms) di free tier untuk operasi berat

Batasi jumlah situs yang dicek per-invocation, atau proses secara bertahap antar invocation

Interval cek minimum 1 menit (bukan real-time)

Sesuai kebutuhan produk — bukan use case yang butuh deteksi sub-menit





11. Rencana Pengujian (ringkas)

Unit test: logic evaluasi status (up/down/threshold), format pesan notifikasi.

Integration test: alur linking Telegram end-to-end, alur tambah situs → trigger cron (simulasi) → notifikasi terkirim.

Manual test: registrasi, login, tambah/hapus/pause situs lewat dashboard dan lewat bot, verifikasi isolasi data antar user.





Dokumen ini adalah spesifikasi teknis. Untuk kebutuhan produk dan alur bisnis level tinggi, rujuk PRD-WebWatch.md.


Product Requirements Document (PRD)

WebWatch — Website Uptime Monitor dengan Notifikasi Telegram

Versi dokumen

1.0

Tanggal

23 Agustus 2026

Status

Draft — menunggu persetujuan

Pemilik produk

Katyaa





1. Ringkasan Produk

WebWatch adalah aplikasi SaaS kecil yang memantau status website (up/down) secara berkala dan mengirim notifikasi instan ke Telegram saat website mengalami gangguan atau pulih kembali. Ditujukan untuk developer, pemilik website kecil-menengah, atau tim kecil yang butuh cara sederhana dan cepat untuk tahu kapan situs mereka down — tanpa harus terus-menerus cek manual atau bayar layanan monitoring mahal.

Aplikasi ini bersifat multi-user — siapa pun bisa mendaftar, menambahkan website mereka sendiri, dan menghubungkan akun Telegram pribadi mereka untuk menerima notifikasi khusus milik mereka.





2. Latar Belakang & Masalah

Pemilik website kecil sering kali baru sadar situsnya down setelah ada komplain dari pengguna atau pelanggan — bukan dari sistem monitoring proaktif. Layanan monitoring komersial (UptimeRobot, Pingdom, dll) sering:

Punya batasan ketat di tier gratis (jumlah situs, interval cek, channel notifikasi)

Notifikasi utama lewat email, yang seringkali telat dibaca dibanding chat instan seperti Telegram

Tidak fleksibel untuk kebutuhan spesifik (misal cek keyword tertentu di halaman)

WebWatch mengisi celah ini dengan solusi ringan, fokus pada notifikasi Telegram yang cepat, dan bisa dijalankan dengan biaya operasional Rp0 menggunakan infrastruktur serverless gratis.





3. Tujuan Produk

Memberi notifikasi downtime website ke Telegram dalam hitungan menit sejak gangguan terjadi.

Meminimalkan false alarm (notifikasi salah karena gangguan jaringan sesaat).

Memungkinkan siapa pun mendaftar dan memakai secara mandiri (self-service), tanpa campur tangan admin.

Beroperasi dengan biaya infrastruktur nol, tanpa mengorbankan keandalan (tidak ada downtime akibat server "tidur").

Metrik Sukses (indikatif)

Notifikasi terkirim ke Telegram dalam < 2 menit sejak status berubah.

Tingkat false-positive alert < 5% dari total insiden yang dilaporkan.

Uptime sistem monitoring itu sendiri > 99% (karena berjalan di infrastruktur serverless yang tidak pernah tidur).





4. Target Pengguna

Developer individu / freelancer yang mengelola beberapa website klien.

Pemilik bisnis kecil dengan website/toko online sendiri.

Tim kecil (startup, agency) yang ingin memantau beberapa layanan tanpa biaya tools monitoring mahal.





5. Alur Bisnis / User Journey

5.1 Alur pendaftaran & onboarding

User membuka dashboard web WebWatch, mendaftar dengan email & password.

Setelah login, user diarahkan ke halaman "Connect Telegram" — user klik tombol, diarahkan ke bot Telegram (t.me/WebWatchBot?start=<token>).

User menekan tombol Start di Telegram → akun Telegram otomatis terhubung ke akun WebWatch mereka.

User kembali ke dashboard, mulai menambahkan website yang mau dipantau.

5.2 Alur menambahkan situs untuk dipantau

User menambahkan situs lewat dashboard atau command Telegram /addsite <url> <interval>.

User bisa atur: interval cek (default 5 menit), threshold gagal sebelum dianggap down (default 2x berturut-turut), opsional keyword yang harus ada di halaman, opsional cek SSL expiry.

Situs langsung masuk antrian pemantauan otomatis.

5.3 Alur pemantauan & notifikasi (inti sistem)

Setiap 1 menit, sistem mengecek semua situs yang jadwal pengecekannya sudah jatuh tempo.

Untuk tiap situs: kirim HTTP request, evaluasi status code / timeout / keyword / SSL expiry.

Jika gagal, tambah counter gagal. Jika counter mencapai threshold → status berubah jadi "down" → kirim notifikasi ke chat Telegram pemilik situs.

Jika situs yang sebelumnya down kini berhasil dicek lagi → status "recovered" → kirim notifikasi pemulihan beserta durasi downtime.

Untuk mencegah notifikasi spam akibat situs naik-turun berulang dalam waktu singkat (flapping), ada mekanisme cooldown notifikasi.

5.4 Alur user memantau riwayat

User bisa cek status semua situsnya lewat dashboard (grafik uptime, response time) atau command /status dan /history di Telegram.

Data riwayat pengecekan disimpan rolling 30 hari terakhir — data yang lebih lama otomatis terhapus setiap hari untuk menjaga ukuran database tetap kecil.

5.5 Alur menonaktifkan/menghapus situs

User bisa pause sementara (/pause), resume (/resume), atau hapus permanen (/removesite) — baik dari dashboard maupun Telegram.





6. Fitur

6.1 Fitur inti (MVP)

Fitur

Deskripsi

Registrasi & login

Email + password, sesi via JWT

Hubungkan akun Telegram

Linking lewat deep-link + token sekali pakai

Tambah/kelola situs

Lewat dashboard maupun command bot (/addsite, /listsite, /removesite, /pause, /resume)

Pemantauan otomatis

Cek HTTP status & response time tiap interval yang ditentukan

Notifikasi down/recovered

Dikirim otomatis ke Telegram user terkait

Riwayat & statistik

Uptime %, response time, daftar insiden — 30 hari terakhir

Command /status & /history

Cek ringkasan langsung dari chat Telegram

6.2 Fitur tambahan

Fitur

Deskripsi

Keyword check

Deteksi "soft down" (status 200 tapi halaman error/maintenance)

SSL expiry check

Peringatan sertifikat SSL mau kedaluwarsa (< 7 hari)

Anti-flapping cooldown

Menahan notifikasi berulang saat situs naik-turun cepat

6.3 Di luar cakupan (out of scope) untuk versi awal

Notifikasi via channel selain Telegram (email, WhatsApp, Slack, dll)

Multi-region check (cek dari berbagai lokasi server)

Status page publik untuk ditunjukkan ke pelanggan

Role/tim (banyak orang mengelola situs yang sama)

Billing/monetisasi berbayar





7. Model Bisnis

Versi awal: 100% gratis, memanfaatkan free tier infrastruktur (Cloudflare Workers, D1, Pages) yang cukup untuk skala ratusan pengguna pertama. Belum ada rencana monetisasi di fase ini — jika ke depan traffic melebihi batas free tier, opsi upgrade paid tier Cloudflare (~$5/bulan) dipertimbangkan, bukan membebankan biaya ke pengguna.





8. Asumsi & Batasan

Pengguna punya akun Telegram aktif untuk menerima notifikasi (channel notifikasi lain tidak didukung di versi ini).

Interval pengecekan minimum dibatasi 1 menit mengikuti batas minimum cron trigger Cloudflare Workers.

Retensi data historis dibatasi 30 hari untuk menjaga penggunaan database tetap dalam batas free tier.

Jumlah situs per user tidak dibatasi secara hard-limit di awal, tapi dipantau agar tidak melebihi kuota request harian free tier.





9. Roadmap Ringkas

Fase

Cakupan

Fase 1 (MVP)

Auth, tambah situs, monitoring dasar, notifikasi Telegram down/recovered, linking Telegram

Fase 2

Dashboard statistik, keyword check, SSL check, anti-flapping, command /history

Fase 3 (opsional, masa depan)

Channel notifikasi tambahan, status page publik, multi-region check





Dokumen ini adalah acuan kebutuhan produk. Detail teknis implementasi ada di dokumen SRS terpisah (SRS-WebWatch.md).


paham ga? buat juga landing page nya bree..  untuk sementara pake arsitektur lu aja dulu, nnti kalo udh jadi baru gua ganti sendiri yaa.. kalo butuh apa apa ngomong aja ke gua

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c3c51c42-0cd5-4d95-b8c3-f1d2bee95874).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
