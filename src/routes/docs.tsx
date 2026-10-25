import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bug,
  Code,
  Database,
  Globe,
  Layers,
  ListChecks,
  Lock,
  Menu,
  MessageSquare,
  Server,
  Shield,
  Terminal,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";

import { CodeBlock } from "@/components/app/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Dokumentasi WebWatch APM" },
      {
        name: "description",
        content:
          "Dokumentasi WebWatch APM: verifikasi domain, SDK frontend, middleware Express, REST API ingestion, dan perintah bot Telegram.",
      },
    ],
  }),
  component: DocsPage,
});

/* -------------------------------------------------------------------------- */
/*  Prose primitives                                                          */
/*                                                                            */
/*  The docs page writes its own body copy, so the shared text styles live in  */
/*  one place instead of being repeated on every paragraph. Inline code always */
/*  uses the same chip and every table uses the shared Table primitives.       */
/* -------------------------------------------------------------------------- */

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 mt-10 text-xl font-bold text-foreground">{children}</h3>;
}

function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mb-4 max-w-reading leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mb-6 ml-5 max-w-reading list-disc space-y-2 leading-relaxed text-muted-foreground">
      {children}
    </ul>
  );
}

function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="mb-6 ml-5 max-w-reading list-decimal space-y-2 leading-relaxed text-muted-foreground">
      {children}
    </ol>
  );
}

function IC({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

type CalloutTone = "brand" | "warning" | "info" | "neutral";

const CALLOUT_TONES: Record<CalloutTone, { box: string; title: string; body: string }> = {
  brand: {
    box: "border-primary/25 bg-primary-subtle",
    title: "text-primary",
    body: "text-foreground/85",
  },
  warning: {
    box: "border-warning/30 bg-warning-surface",
    title: "text-warning",
    body: "text-foreground/85",
  },
  info: {
    box: "border-info/30 bg-info-surface",
    title: "text-info",
    body: "text-foreground/85",
  },
  neutral: {
    box: "border-border bg-surface",
    title: "text-foreground",
    body: "text-muted-foreground",
  },
};

function Callout({
  tone = "neutral",
  title,
  icon: Icon,
  children,
}: {
  tone?: CalloutTone;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const styles = CALLOUT_TONES[tone];

  return (
    <div className={cn("mb-8 rounded-lg border px-4 py-4", styles.box)}>
      <h4 className={cn("mb-1.5 flex items-center gap-2 text-sm font-semibold", styles.title)}>
        {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        {title}
      </h4>
      <div className={cn("text-sm leading-relaxed", styles.body)}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Documentation content                                                      */
/* -------------------------------------------------------------------------- */

const DOCS_SECTIONS = [
  {
    id: "prolog",
    title: "Prolog: Filosofi WebWatch",
    icon: BookOpen,
    content: (
      <>
        <P>
          WebWatch lahir dari rasa frustrasi menghadapi <em>monitoring tools</em> tingkat enterprise
          yang mahal, rumit diatur, dan penuh dengan metrik yang tidak relevan. Filosofi kami
          sederhana:{" "}
          <strong className="text-foreground">
            Pantau error yang penting, laporkan secepat mungkin, dan jangan ganggu performa
            aplikasi.
          </strong>
        </P>
        <P>
          Sistem ini fokus pada satu pilar utama: Application Performance Monitoring (APM) / Error
          Monitoring. SDK ultra-ringan menangkap <em>stack trace</em>, konteks HTTP (URL dan
          method), serta nama environment tepat di milidetik terjadinya <em>crash</em> atau{" "}
          <em>unhandled exception</em>.
        </P>

        <Callout tone="brand" title="Arsitektur edge-first">
          Seluruh <em>ingestion layer</em> dibangun di atas Cloudflare Workers. Payload error dari
          aplikasi Anda diterima di edge terdekat dan langsung ditulis ke D1, tanpa antrean, tanpa
          worker tambahan, dan tanpa satu pun komponen yang harus selalu berjalan di server pusat.
        </Callout>
      </>
    ),
  },
  {
    id: "memulai",
    title: "Langkah Awal (Setup)",
    icon: ListChecks,
    content: (
      <>
        <P>
          Mengintegrasikan WebWatch dapat diselesaikan dalam hitungan menit. Alurnya sepenuhnya{" "}
          <em>self-service</em>.
        </P>

        <H3>1. Verifikasi Kepemilikan Domain</H3>
        <P>
          Sebelum sistem menerima log APM untuk sebuah situs, Anda harus membuktikan bahwa domain
          tersebut benar-benar milik Anda. Tujuannya: mencegah pihak lain mengaitkan domain orang
          lain ke akun mereka.
        </P>
        <OL>
          <li>
            Buka <strong className="text-foreground">Sites</strong> lalu pilih situs Anda di
            dashboard, lalu salin token verifikasi yang ditampilkan pada dialog{" "}
            <em>Verifikasi Domain</em>.
          </li>
          <li>
            Buat file bernama <IC>webwatch-verify.txt</IC> di web root / document root situs Anda,
            lalu isi dengan token tersebut tanpa teks tambahan.
          </li>
          <li>
            Kembali ke dashboard dan tekan <strong className="text-foreground">Verifikasi</strong>.
          </li>
        </OL>
        <P>
          Verifikasi dilakukan dengan melakukan request{" "}
          <IC>GET &lt;url-situs-anda&gt;/webwatch-verify.txt</IC> menggunakan user-agent{" "}
          <IC>WebWatch-Verifier/1.0</IC> dan timeout 10 detik. Status situs berubah menjadi{" "}
          <IC>verified</IC> bila isi file mengandung token yang cocok.
        </P>

        <Callout tone="warning" title="Dampak verifikasi">
          Selama status masih <IC>pending</IC>, endpoint ingestion akan menjawab{" "}
          <IC>403 site_not_verified</IC> untuk situs tersebut. Tidak ada log error yang diterima
          sebelum verifikasi selesai.
        </Callout>

        <H3>2. Manajemen Lingkungan (Environments)</H3>
        <P>
          Setiap environment sebaiknya memakai{" "}
          <strong className="text-foreground">situs terpisah</strong> di dashboard, karena API key
          selalu terikat pada satu situs. Field <IC>environment</IC> pada tiap event APM menutup
          kebutuhan penandaan environment.
        </P>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Environment</TableHead>
              <TableHead>Saran penggunaan</TableHead>
              <TableHead>Alerting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>production</IC>
              </TableCell>
              <TableCell>Situs dan API key khusus produksi. Wajib diamankan.</TableCell>
              <TableCell>
                Kirim ke grup Telegram tim <em>on-call</em>.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>staging</IC>
              </TableCell>
              <TableCell>Situs terpisah dengan key sendiri. Bebas di-rotasi.</TableCell>
              <TableCell>Grup internal, atau tanpa notifikasi sama sekali.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>local</IC>
              </TableCell>
              <TableCell>
                Jangan panggil <IC>init()</IC> di pengembangan lokal.
              </TableCell>
              <TableCell>Tidak dikirim.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <P className="mt-4 text-sm">
          Nilai environment dikirim otomatis oleh SDK dari <IC>process.env.NODE_ENV</IC> saat
          tersedia, dan bernilai <IC>production</IC> di browser. Anda juga dapat mengirimnya manual
          saat memanggil <IC>capture()</IC>.
        </P>
      </>
    ),
  },
  {
    id: "sdk-frontend",
    title: "SDK Frontend Terperinci",
    icon: Code,
    content: (
      <>
        <P>
          SDK WebWatch adalah satu file ES module yang disajikan langsung dari deployment Anda
          sendiri melalui <IC>GET /api/public/sdk</IC>, jadi tidak ada CDN pihak ketiga yang perlu
          dipercaya. Responsnya memakai header <IC>application/javascript</IC>, CORS terbuka untuk
          semua origin, dan di-cache selama satu jam.
        </P>

        <H3>Instalasi</H3>
        <CodeBlock
          file="main.js"
          className="mb-6"
          code={`import { WebWatch } from "https://webwatch.example/api/public/sdk";

WebWatch.init("ww_your_api_key", "https://webwatch.example/api/ingest");`}
        />

        <H3>Apa saja yang otomatis ditangkap?</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sumber</TableHead>
              <TableHead>event_type</TableHead>
              <TableHead>Informasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>window</IC> <em>error</em>
              </TableCell>
              <TableCell>
                <IC>frontend_error</IC>
              </TableCell>
              <TableCell>Pesan error, stack trace, URL halaman saat ini.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>window</IC> <em>unhandledrejection</em>
              </TableCell>
              <TableCell>
                <IC>frontend_promise_error</IC>
              </TableCell>
              <TableCell>Alasan promise ditolak tanpa ditangani.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Manual</TableCell>
              <TableCell>
                <IC>api_error</IC>, <IC>log</IC>
              </TableCell>
              <TableCell>Anda menentukan tipe, pesan, dan konteksnya.</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <H3>Pengiriman manual</H3>
        <CodeBlock
          file="checkout.js"
          className="mb-6"
          code={`await WebWatch.capture(
  "api_error",
  "Payment gateway timeout",
  error?.stack ?? null,
  "/api/checkout",
  "POST"
);`}
        />

        <H3>API SDK</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Deskripsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>init(key, endpoint?)</IC>
              </TableCell>
              <TableCell>
                Menyimpan API key dan endpoint ingestion (default <IC>/api/ingest</IC>), lalu
                memasang listener error. Panggil sekali saat aplikasi start.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>capture(type, message, stackTrace, url, method)</IC>
              </TableCell>
              <TableCell>
                Mengirim satu event. Tidak melakukan apa-apa bila <IC>init()</IC> belum dipanggil.
                Kegagalan pengiriman selalu ditelan agar aplikasi Anda tidak pernah terganggu.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>expressErrorHandler()</IC>
              </TableCell>
              <TableCell>
                Middleware Express untuk menangkap error backend. Lihat bagian berikut.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Callout tone="neutral" title="Self-hosted dan same-origin">
          <p>
            Bila endpoint yang Anda berikan diawali <IC>http</IC>, SDK memakainya apa adanya. Bila
            tidak, endpoint dipetakan ke <IC>window.location.origin</IC>, sehingga deployment
            same-origin tanpa konfigurasi tambahan ikut berfungsi.
          </p>
        </Callout>
      </>
    ),
  },
  {
    id: "backend-nodejs",
    title: "Backend: Node.js & Express",
    icon: Server,
    content: (
      <>
        <P>
          Untuk menangkap error backend, SDK menyediakan satu middleware Express. Middleware ini
          mengambil konteks request (URL dan method) sebelum error diteruskan ke handler bawaan
          Express.
        </P>

        <H3>Express.js Middleware</H3>
        <P>
          Middleware error WebWatch harus ditempatkan{" "}
          <strong className="text-foreground">setelah</strong> semua route dan middleware Anda,
          tepat sebelum handler fallback bawaan Express.
        </P>
        <CodeBlock
          file="server.js"
          className="mb-6"
          code={`import express from "express";
import { WebWatch } from "https://webwatch.example/api/public/sdk";

const app = express();
app.use(express.json());

WebWatch.init("ww_your_api_key", "https://webwatch.example/api/ingest");

// ... route dan controller Anda di sini ...

// Terakhir: tangkap error backend
app.use(WebWatch.expressErrorHandler());

app.listen(3000);`}
        />

        <Callout tone="warning" title="Perhatian terhadap asynchronous error">
          Di Express 4.x, <em>promise</em> yang gagal secara <em>asynchronous</em>, seperti query
          database di dalam route <IC>async</IC>, tidak otomatis tertangkap oleh error middleware.
          Bungkus controller Anda dengan utilitas seperti <IC>express-async-handler</IC>, atau
          tangkap manual dengan <IC>next(err)</IC>.
        </Callout>

        <H3>Framework lain</H3>
        <P>
          Middleware Express hanyalah salah satu pintasan. Untuk framework apa pun, panggil{" "}
          <IC>capture()</IC> dari blok <IC>catch</IC> Anda:
        </P>
        <CodeBlock
          file="handler.js"
          className="mb-6"
          code={`try {
  await doWork();
} catch (error) {
  await WebWatch.capture(
    "backend_error",
    error.message,
    error.stack,
    request.url,
    request.method
  );
  throw error;
}`}
        />

        <Callout tone="neutral" title="Tentang paket npm">
          <p>
            Source paket <IC>@webwatch/sdk</IC> sudah tersedia di registry npm. Set env{" "}
            <IC>WEBWATCH_KEY</IC> dan <IC>WEBWATCH_URL</IC>, lalu{" "}
            <IC>{'import "@webwatch/sdk"'}</IC> sekali di entrypoint: unhandled error dan unhandled
            rejection langsung terkirim dengan batching dan retry. Helper siap pakai tersedia untuk
            Express, Hono, Fastify, dan Next.js. Untuk browser tanpa npm, gunakan modul yang
            disajikan dari <IC>/api/public/sdk</IC>.
          </p>
        </Callout>
      </>
    ),
  },
  {
    id: "rest-api",
    title: "Referensi REST API (Manual Ingestion)",
    icon: Database,
    content: (
      <>
        <P>
          Selain memakai SDK, Anda bebas membangun integrasi custom dengan bahasa pemrograman apa
          pun yang bisa melakukan HTTP request ke endpoint ingestion kami.
        </P>

        <div className="panel mb-8 overflow-hidden">
          <div className="border-b border-border bg-muted/60 px-4 py-3">
            <h4 className="font-mono text-sm font-semibold text-foreground">
              POST{" "}
              <span className="ml-2 font-normal text-muted-foreground">
                https://webwatch.example/api/ingest
              </span>
            </h4>
          </div>
          <div className="space-y-6 px-4 py-4">
            <div>
              <h5 className="mb-2 text-sm font-semibold text-foreground">Autentikasi header</h5>
              <CodeBlock className="mb-2" code={`Authorization: Bearer [API_KEY]`} />
              <p className="text-sm text-muted-foreground">
                API key dibuat per situs di halaman detail situs, pada bagian{" "}
                <strong className="text-foreground">API Keys</strong>, dengan format <IC>ww_</IC>{" "}
                diikuti 48 karakter heksadesimal.
              </p>
            </div>

            <div>
              <h5 className="mb-2 text-sm font-semibold text-foreground">
                Spesifikasi payload (JSON)
              </h5>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Properti</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Wajib</TableHead>
                    <TableHead>Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">events</TableCell>
                    <TableCell>Array</TableCell>
                    <TableCell className="text-primary">Ya</TableCell>
                    <TableCell>Daftar event yang dikirim dalam satu batch.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">type</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell className="text-primary">Ya</TableCell>
                    <TableCell>
                      Tipe event, misalnya <IC>frontend_error</IC>, <IC>frontend_promise_error</IC>,{" "}
                      <IC>backend_error</IC>, <IC>api_error</IC>, atau <IC>log</IC>. Default{" "}
                      <IC>log</IC>.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">message</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell className="text-primary">Ya</TableCell>
                    <TableCell>Pesan utama error atau ringkasan log.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">stack_trace</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Tidak</TableCell>
                    <TableCell>Jejak stack error.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">url</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Tidak</TableCell>
                    <TableCell>URL halaman atau endpoint yang bermasalah.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">method</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Tidak</TableCell>
                    <TableCell>
                      HTTP method, misalnya <IC>GET</IC> atau <IC>POST</IC>.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">environment</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Tidak</TableCell>
                    <TableCell>
                      Nama environment. Default <IC>production</IC>.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-foreground">user_agent</TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Tidak</TableCell>
                    <TableCell>User agent klien bila Anda ingin mengirimnya.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <H3>Contoh request dan response</H3>
        <CodeBlock
          file="curl"
          className="mb-6"
          code={`curl -X POST "https://webwatch.example/api/ingest" \\
  -H "Authorization: Bearer ww_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "events": [
      {
        "type": "backend_error",
        "message": "TypeError: cannot read property id of undefined",
        "stack_trace": "TypeError: ...",
        "url": "/api/orders/42",
        "method": "GET",
        "environment": "production"
      }
    ]
  }'`}
        />

        <H3>Kode respons</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Arti</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>200</IC>
              </TableCell>
              <TableCell>
                <IC>{'{ "ok": true, "ingested": 1 }'}</IC>
              </TableCell>
              <TableCell>Event berhasil disimpan.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>400</IC>
              </TableCell>
              <TableCell>
                <IC>invalid_payload</IC> atau <IC>bad_request</IC>
              </TableCell>
              <TableCell>
                Body JSON tidak valid atau <IC>events</IC> bukan array.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>401</IC>
              </TableCell>
              <TableCell>
                <IC>missing_token</IC> atau <IC>invalid_key</IC>
              </TableCell>
              <TableCell>Header Authorization hilang atau API key tidak dikenal.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>403</IC>
              </TableCell>
              <TableCell>
                <IC>site_not_verified</IC>
              </TableCell>
              <TableCell>Domain situs belum diverifikasi.</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <P className="text-sm">
          <strong className="text-foreground">Catatan:</strong> endpoint ingestion mengizinkan semua
          origin (CORS <IC>*</IC>) agar SDK browser dapat mengirim dari domain pelanggan, dan saat
          ini belum membatasi laju request secara otomatis. Bila Anda membutuhkan pembatasan,
          tambahkan sendiri di sisi aplikasi Anda.
        </P>
      </>
    ),
  },
  {
    id: "alerting",
    title: "Sistem Alerting & Perintah Bot",
    icon: MessageSquare,
    content: (
      <>
        <P>
          Tujuan utama <em>monitoring</em> adalah memberi tahu Anda di saat yang tepat. WebWatch
          mengirim seluruh notifikasi melalui Telegram, dengan aturan anti-spam yang mencegah banjir
          pesan (<em>alert fatigue</em>).
        </P>

        <H3>Kapan notifikasi dikirim?</H3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemicu</TableHead>
              <TableHead>Pesan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Batch APM memuat event bertipe error</TableCell>
              <TableCell>
                <Badge variant="info">APM ALERT</Badge>{" "}
                <span className="text-muted-foreground">
                  tipe, environment, pesan, endpoint yang terkena.
                </span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Proses login dengan kode OTP</TableCell>
              <TableCell>
                <Badge variant="neutral">KODE MASUK</Badge>{" "}
                <span className="text-muted-foreground">
                  kode 6 digit, berlaku 5 menit dan dipakai sekali.
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <H3>Aturan anti-spam</H3>
        <UL>
          <li>
            Dari satu batch APM, hanya{" "}
            <strong className="text-foreground">event error pertama</strong> yang diumumkan lewat
            Telegram. Sisanya tetap tercatat dan dapat dilihat di halaman{" "}
            <strong className="text-foreground">Log Error (APM)</strong>.
          </li>
          <li>Notifikasi hanya dikirim ke chat Telegram yang sudah terhubung dengan akun Anda.</li>
        </UL>

        <H3>Perintah bot Telegram</H3>
        <P>
          Bot WebWatch juga menjadi antarmuka manajemen. Kirim perintah berikut ke chat bot Anda.
        </P>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perintah</TableHead>
              <TableHead>Fungsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <IC>/start</IC>
              </TableCell>
              <TableCell>Menghubungkan chat Telegram dengan akun Anda.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/help</IC>
              </TableCell>
              <TableCell>Menampilkan daftar perintah.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/addsite &lt;url&gt;</IC>
              </TableCell>
              <TableCell>Menambahkan situs untuk menerima log error.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/listsite</IC>
              </TableCell>
              <TableCell>Menampilkan daftar situs beserta status verifikasinya.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/removesite &lt;id&gt;</IC>
              </TableCell>
              <TableCell>Menghapus situs.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <IC>/pause &lt;id&gt;</IC> atau <IC>/resume &lt;id&gt;</IC>
              </TableCell>
              <TableCell>Menjeda atau melanjutkan penerimaan log error.</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Callout tone="neutral" title="Cara identifier situs dibaca" icon={Terminal}>
          <p>
            <IC>id</IC> yang dimaksud adalah 8 karakter pertama dari id situs. Pencocokan dilakukan
            dengan prefix, dan harus menghasilkan tepat satu situs.
          </p>
        </Callout>
      </>
    ),
  },
  {
    id: "keamanan-kepatuhan",
    title: "Keamanan & Kepatuhan Data",
    icon: Shield,
    content: (
      <>
        <P>
          Karena kami mengumpulkan <em>stack trace</em> dan konteks request dari aplikasi Anda, kami
          menjaga agar data sensitif pelanggan Anda tidak bocor.
        </P>

        <div className="my-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="panel p-5">
            <Lock className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="mb-2 text-base font-semibold text-foreground">Tanpa password</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tidak ada password yang disimpan maupun dipulihkan. Login memakai kode 6 digit sekali
              pakai yang dikirim ke chat Telegram, berlaku 5 menit, dan dibatasi 5 kali percobaan.
            </p>
          </div>
          <div className="panel p-5">
            <Layers className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="mb-2 text-base font-semibold text-foreground">Isolasi tenant</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Setiap data situs, event, dan API key terikat pada akun pemiliknya. Seluruh query
              terautentikasi dijalankan dengan filter <IC>user_id</IC>, sehingga satu akun tidak
              dapat membaca atau mengubah data akun lain.
            </p>
          </div>
          <div className="panel p-5">
            <Bug className="mb-3 h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="mb-2 text-base font-semibold text-foreground">Retensi data</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Event APM disimpan sebagai arsip dan dapat dihapus manual dari dashboard. Pembersihan
              otomatis bisa dikonfigurasi.
            </p>
          </div>
        </div>

        <H3>Kredensial</H3>
        <UL>
          <li>Token sesi dan kode OTP disimpan dalam bentuk hash SHA-256, bukan nilai aslinya.</li>
          <li>
            Cookie sesi memakai flag <IC>HttpOnly</IC>, <IC>Secure</IC>, dan <IC>SameSite=Lax</IC>{" "}
            dengan masa berlaku 30 hari.
          </li>
          <li>API key dibuat per situs dan dapat dicabut dengan menghapus key tersebut.</li>
          <li>
            Endpoint webhook Telegram dilindungi shared secret yang dibandingkan secara timing-safe.
          </li>
        </UL>

        <H3>CORS pada endpoint ingestion</H3>
        <P>
          Endpoint <IC>/api/ingest</IC> sengaja mengizinkan semua origin, karena SDK browser
          mengirim dari domain pelanggan sendiri. Endpoint tersebut hanya menerima API key yang
          valid, dan seluruh isinya dipisahkan per situs.
        </P>

        <H3>Komitmen GDPR & CCPA</H3>
        <P>
          Sistem kami dirancang agar beroperasi penuh sebagai <em>Data Processor</em>. Kami
          menyarankan Anda, sebagai <em>Data Controller</em>, untuk tidak mengirim nama, email, atau
          data pribadi pengguna secara terang (<em>plain-text</em>) ke server kami. Gunakan ID
          samaran (<em>anonymized user ID</em>), dan hapus atau sensor setiap data sensitif sebelum
          dikirim.
        </P>
      </>
    ),
  },
];

const NAV_GROUPS = [
  { label: "Mulai", ids: ["prolog", "memulai"] },
  { label: "Integrasi", ids: ["sdk-frontend", "backend-nodejs", "rest-api"] },
  { label: "Platform", ids: ["alerting", "keamanan-kepatuhan"] },
];

const SECTION_BY_ID = new Map(DOCS_SECTIONS.map((section) => [section.id, section]));
const FIRST_SECTION_ID = DOCS_SECTIONS[0]?.id ?? "prolog";

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

function DocsPage() {
  const [activeSection, setActiveSection] = useState(FIRST_SECTION_ID);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // The drawer only exists below the md breakpoint. On desktop the sidebar is
  // sticky and always visible, so it must never be inert.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Scroll spy. Registered once, with a functional update so the listener is
  // not torn down and rebuilt on every section change.
  useEffect(() => {
    const handleScroll = () => {
      const threshold = 160;
      let current = FIRST_SECTION_ID;

      for (const section of DOCS_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= threshold) {
          current = section.id;
        }
      }

      setActiveSection((previous) => (previous === current ? previous : current));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-wide items-center gap-4 px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-11 w-11 md:hidden"
            aria-label={isSidebarOpen ? "Tutup daftar isi" : "Buka daftar isi"}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((open) => !open)}
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </Button>

          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/dashboard">
              <ArrowLeft />
              Dashboard
            </Link>
          </Button>

          <div className="hidden h-4 w-px bg-border md:block" />

          <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              WebWatch <span className="ml-1 font-normal text-muted-foreground">Dokumentasi</span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <a
              href="https://github.com/hsanmz/webwatch"
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <Link to="/status" className="transition-colors hover:text-foreground">
              Status API
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-wide flex-1">
        <aside
          className={cn(
            "fixed top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-72 overflow-y-auto border-r border-border bg-surface transition-transform duration-[var(--motion-slow)] md:sticky md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          inert={!isDesktop && !isSidebarOpen}
        >
          <nav className="p-6 pb-24">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-8 last:mb-0">
                <h2 className="mb-3 ml-2 text-xs font-medium text-muted-foreground">
                  {group.label}
                </h2>
                <ul className="space-y-1">
                  {group.ids.map((id) => {
                    const section = SECTION_BY_ID.get(id);
                    if (!section) return null;
                    const isActive = activeSection === id;

                    return (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          aria-current={isActive ? "true" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            scrollToSection(id);
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--motion-fast)]",
                            isActive
                              ? "bg-primary-subtle text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <section.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate">{section.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="border-t border-border pt-6">
              <a
                href="https://github.com/hsanmz/webwatch/issues"
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-info-surface text-info">
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
                Support dan komunitas
              </a>
            </div>
          </nav>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            aria-label="Tutup daftar isi"
            className="fixed inset-0 z-20 cursor-default bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-content px-6 py-12 md:px-10">
            <div className="mb-16">
              <h1 className="mb-5 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                Dokumentasi WebWatch APM
              </h1>
              <p className="max-w-reading text-lg font-medium leading-relaxed text-muted-foreground md:text-xl">
                Panduan setup, referensi API, dan perilaku alerting untuk membangun sistem
                pengawasan error aplikasi.
              </p>
            </div>

            <div className="space-y-24 pb-16">
              {DOCS_SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="mb-8 flex items-center gap-4 border-b border-border pb-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary-subtle text-primary">
                      <section.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {section.title}
                    </h2>
                  </div>
                  {section.content}
                </section>
              ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-center md:flex-row md:text-left">
              <p className="text-sm text-muted-foreground">© 2026 WebWatch APM</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Kembali ke atas
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
