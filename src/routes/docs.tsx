import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  Menu,
  X,
  Terminal,
  Zap,
  Shield,
  Globe,
  Server,
  Code,
  Layers,
  Activity,
  Lock,
  Webhook,
  Database,
  BellRing,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

/* -------------------------------------------------------------------------- */
/*  Minimal syntax highlighter — keeps the dark code blocks readable without   */
/*  hand-writing a <span> per token.                                           */
/* -------------------------------------------------------------------------- */

const TOKEN_RE =
  /(\/\/[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|await|async|import|from|export|new|try|catch|finally|if|else|for|of|in|true|false|null|undefined|class|extends|throw)\b|\b\d+(?:\.\d+)?\b)/g;

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));

    const token = match[0];
    let className = "text-purple-400";
    if (token.startsWith("//")) className = "text-gray-500";
    else if (/^["'`]/.test(token)) className = "text-green-300";
    else if (/^\d/.test(token)) className = "text-orange-300";

    parts.push(
      <span key={`${index}-${token}`} className={className}>
        {token}
      </span>,
    );
    cursor = index + token.length;
  }

  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

function CodeBlock({ file, code }: { file: string; code: string }) {
  return (
    <div className="bg-[#0D1117] border border-border rounded-xl overflow-hidden mb-6 shadow-lg">
      <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/5">
        <span className="text-xs font-mono text-muted-foreground">{file}</span>
      </div>
      <div className="p-5 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-300 leading-relaxed">
          {code.split("\n").map((line, i) => (
            <div key={i} className="whitespace-pre">
              {highlightLine(line)}
            </div>
          ))}
        </pre>
      </div>
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
        <p className="text-lg leading-relaxed text-muted-foreground mb-6">
          WebWatch lahir dari rasa frustrasi menghadapi <em>monitoring tools</em> tingkat enterprise
          yang mahal, rumit diatur, dan penuh dengan metrik yang tidak relevan. Filosofi kami
          sederhana:{" "}
          <strong>
            Pantau apa yang penting, laporkan secepat mungkin, dan jangan ganggu performa aplikasi.
          </strong>
        </p>
        <p className="text-muted-foreground mb-6">
          Sistem ini terbagi menjadi dua pilar utama yang berjalan berdampingan namun saling
          melengkapi:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-10">
          <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
            <Globe className="h-8 w-8 text-blue-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Synthetic Uptime Monitoring</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pengecekan proaktif dari luar. Worker kami melakukan request HTTP/HTTPS ke situs Anda
              secara berkala untuk mendeteksi <em>downtime</em>, mengukur <em>response time</em>,
              memeriksa kata kunci tertentu pada body, atau memberi peringatan sertifikat SSL
              sebelum pengunjung Anda menyadarinya.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
            <Activity className="h-8 w-8 text-teal-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">
              Application Performance Monitoring
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pelaporan reaktif dari dalam. Dengan SDK ultra-ringan, sistem menangkap{" "}
              <em>stack trace</em>, konteks HTTP (URL dan method), serta nama environment tepat di
              milidetik terjadinya <em>crash</em> atau <em>unhandled exception</em>.
            </p>
          </div>
        </div>
        <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg mb-8">
          <h4 className="font-bold text-primary mb-1">Arsitektur Edge-First</h4>
          <p className="text-sm text-primary/80">
            Seluruh <em>ingestion layer</em> dibangun di atas Cloudflare Workers. Payload error dari
            aplikasi Anda diterima di edge terdekat dan langsung ditulis ke D1, tanpa antrean, tanpa
            worker tambahan, dan tanpa satu pun komponen yang harus selalu berjalan di server pusat.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "memulai",
    title: "Langkah Awal (Setup)",
    icon: Zap,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Mengintegrasikan WebWatch dapat diselesaikan dalam hitungan menit. Alurnya sepenuhnya{" "}
          <em>self-service</em>.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">1. Verifikasi Kepemilikan Domain</h3>
        <p className="text-muted-foreground mb-4">
          Sebelum sistem menerima log APM untuk sebuah situs, Anda harus membuktikan bahwa domain
          tersebut benar-benar milik Anda. Tujuannya: mencegah pihak lain mengaitkan domain orang
          lain ke akun mereka.
        </p>
        <ol className="list-decimal ml-5 space-y-2 text-muted-foreground mb-6">
          <li>
            Buka <strong>Uptime Monitors → situs Anda</strong> di dashboard, lalu salin token
            verifikasi yang ditampilkan pada dialog <em>Verifikasi Domain</em>.
          </li>
          <li>
            Buat file bernama <code>webwatch-verify.txt</code> di web root / document root situs
            Anda, lalu isikan dengan token tersebut (tanpa teks tambahan).
          </li>
          <li>
            Kembali ke dashboard dan klik <strong>Verifikasi</strong>.
          </li>
        </ol>
        <p className="text-muted-foreground mb-6">
          Verifikasi dilakukan dengan melakukan request{" "}
          <code>GET &lt;url-situs-anda&gt;/webwatch-verify.txt</code> menggunakan user-agent{" "}
          <code>WebWatch-Verifier/1.0</code> dan timeout 10 detik. Status situs berubah menjadi{" "}
          <code>verified</code> bila isi file mengandung token yang cocok.
        </p>
        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-r-lg mb-8">
          <h4 className="font-bold text-orange-500 mb-1">Dampak verifikasi</h4>
          <p className="text-sm text-orange-500/80">
            Selama status masih <code>pending</code>, endpoint ingestion akan menjawab{" "}
            <code>403 site_not_verified</code> untuk situs tersebut. Pemantauan uptime sendiri
            <strong> tidak</strong> terhambat oleh verifikasi — Anda tetap bisa memantau domain
            sebelum selesai memverifikasi.
          </p>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">2. Manajemen Lingkungan (Environments)</h3>
        <p className="text-muted-foreground mb-4">
          Setiap environment sebaiknya memakai <strong>situs terpisah</strong> di dashboard, karena
          API Key selalu terikat pada satu situs. Field <code>environment</code> pada tiap event APM
          menutup kebutuhan penandaan environment.
        </p>
        <table className="w-full text-left text-sm mt-4 border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Environment</th>
              <th className="pb-3 font-medium">Saran Penggunaan</th>
              <th className="pb-3 font-medium">Alerting</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>production</code>
              </td>
              <td className="py-4">Situs dan API Key khusus produksi. Wajib diamankan.</td>
              <td className="py-4">
                Kirim ke grup Telegram tim <em>On-call</em>.
              </td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>staging</code>
              </td>
              <td className="py-4">Situs terpisah dengan Key sendiri. Bebas di-rotasi.</td>
              <td className="py-4">Grup internal, atau tanpa notifikasi sama sekali.</td>
            </tr>
            <tr>
              <td className="py-4">
                <code>local</code>
              </td>
              <td className="py-4">
                Jangan panggil <code>init()</code> di pengembangan lokal.
              </td>
              <td className="py-4">Tidak dikirim.</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-muted-foreground mt-4">
          Nilai environment dikirim otomatis oleh SDK dari <code>process.env.NODE_ENV</code> saat
          tersedia, dan bernilai <code>production</code> di browser. Anda juga dapat mengirimnya
          manual saat memanggil <code>capture()</code>.
        </p>
      </>
    ),
  },
  {
    id: "sdk-frontend",
    title: "SDK Frontend Terperinci",
    icon: Code,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          SDK WebWatch adalah satu file ES module yang disajikan langsung dari deployment Anda
          sendiri melalui <code>GET /api/public/sdk</code> — tidak ada CDN pihak ketiga yang perlu
          dipercaya. Responsnya memakai header <code>application/javascript</code>, CORS terbuka
          untuk semua origin, dan di-cache selama satu jam.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Instalasi</h3>
        <CodeBlock
          file="main.js"
          code={`import { WebWatch } from "https://webwatch.example/api/public/sdk";

// API key diambil dari halaman detail situs → API Keys
WebWatch.init("ww_your_api_key", "https://webwatch.example/api/ingest");`}
        />

        <h3 className="text-xl font-bold mt-8 mb-4">Apa saja yang otomatis ditangkap?</h3>
        <table className="w-full text-left text-sm mt-4 border-collapse mb-6">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Sumber</th>
              <th className="pb-3 font-medium">event_type</th>
              <th className="pb-3 font-medium">Informasi</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>window</code> <em>error</em>
              </td>
              <td className="py-4">
                <code>frontend_error</code>
              </td>
              <td className="py-4">Pesan error, stack trace, URL halaman saat ini.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>window</code> <em>unhandledrejection</em>
              </td>
              <td className="py-4">
                <code>frontend_promise_error</code>
              </td>
              <td className="py-4">Alasan promise ditolak tanpa ditangani.</td>
            </tr>
            <tr>
              <td className="py-4">Manual</td>
              <td className="py-4">
                <code>api_error</code>, <code>log</code>, …
              </td>
              <td className="py-4">Anda menentukan tipe, pesan, dan konteksnya.</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold mt-8 mb-4">Pengiriman manual</h3>
        <CodeBlock
          file="checkout.js"
          code={`await WebWatch.capture(
  "api_error",
  "Payment gateway timeout",
  error?.stack ?? null,
  "/api/checkout",
  "POST"
);`}
        />

        <h3 className="text-xl font-bold mt-8 mb-4">API SDK</h3>
        <table className="w-full text-left text-sm mt-4 border-collapse mb-6">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Method</th>
              <th className="pb-3 font-medium">Deskripsi</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>init(key, endpoint?)</code>
              </td>
              <td className="py-4">
                Menyimpan API key dan endpoint ingestion (default <code>/api/ingest</code>), lalu
                memasang listener error. Panggil sekali saat aplikasi start.
              </td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>capture(type, message, stackTrace, url, method)</code>
              </td>
              <td className="py-4">
                Mengirim satu event. Tidak melakukan apa-apa bila <code>init()</code> belum
                dipanggil. Kegagalan pengiriman selalu ditelan agar aplikasi Anda tidak pernah
                terganggu.
              </td>
            </tr>
            <tr>
              <td className="py-4">
                <code>expressErrorHandler()</code>
              </td>
              <td className="py-4">
                Middleware Express untuk menangkap error backend. Lihat bagian berikut.
              </td>
            </tr>
          </tbody>
        </table>

        <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Self-hosted & same-origin.</strong> Bila endpoint
            yang Anda berikan diawali <code>http</code>, SDK memakainya apa adanya. Bila tidak,
            endpoint dipetakan ke <code>window.location.origin</code>, sehingga deployment
            same-origin tanpa konfigurasi tambahan ikut berfungsi.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "backend-nodejs",
    title: "Backend: Node.js & Express",
    icon: Server,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Untuk menangkap error backend, SDK menyediakan satu middleware Express. Middleware ini
          mengambil konteks request (URL dan method) sebelum error diteruskan ke handler bawaan
          Express.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Express.js Middleware</h3>
        <p className="text-muted-foreground mb-4">
          Middleware error WebWatch harus ditempatkan <strong>setelah</strong> semua route dan
          middleware Anda, tepat sebelum handler fallback bawaan Express.
        </p>

        <CodeBlock
          file="server.js"
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

        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-r-lg mt-6 mb-6">
          <h4 className="font-bold text-orange-500 mb-1">Perhatian terhadap asynchronous error</h4>
          <p className="text-sm text-orange-500/80">
            Di Express 4.x, <em>promise</em> yang gagal secara <em>asynchronous</em> (seperti query
            database di dalam route <code>async</code>) tidak otomatis tertangkap oleh error
            middleware. Bungkus controller Anda dengan utilitas seperti{" "}
            <code>express-async-handler</code>, atau tangkap manual dengan <code>next(err)</code>.
          </p>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">Framework lain</h3>
        <p className="text-muted-foreground mb-4">
          Middleware Express hanya satu convenience. Untuk framework apa pun, panggil{" "}
          <code>capture()</code> dari blok <code>catch</code> Anda:
        </p>
        <CodeBlock
          file="handler.js"
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

        <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Tentang paket npm.</strong> Source paket{" "}
            <code>@webwatch/sdk</code> tersedia di folder <code>packages/webwatch-sdk</code>, namun
            saat ini masih memakai URL ingestion placeholder dan tidak menerima parameter endpoint.
            Untuk pemakaian nyata, gunakan modul yang disajikan dari <code>/api/public/sdk</code>{" "}
            seperti pada contoh di atas.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "rest-api",
    title: "Referensi REST API (Manual Ingestion)",
    icon: Database,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Selain memakai SDK, Anda bebas membangun integrasi custom dengan bahasa pemrograman apa
          pun yang bisa melakukan HTTP request ke endpoint ingestion kami.
        </p>

        <div className="border border-border rounded-lg overflow-hidden bg-card mb-8">
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="font-bold font-mono">
              POST{" "}
              <span className="text-muted-foreground ml-2">
                https://webwatch.example/api/ingest
              </span>
            </h4>
          </div>
          <div className="p-4">
            <h5 className="text-sm font-semibold mb-2">Autentikasi Header</h5>
            <code className="text-xs bg-black/40 px-2 py-1 rounded text-primary">
              Authorization: Bearer [API_KEY]
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              API key dibuat per situs di halaman detail situs → <strong>API Keys</strong>, dengan
              format <code>ww_</code> diikuti 48 karakter heksadesimal.
            </p>

            <h5 className="text-sm font-semibold mt-6 mb-2">Spesifikasi Payload (JSON)</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="pb-2 font-medium">Properti</th>
                    <th className="pb-2 font-medium">Tipe</th>
                    <th className="pb-2 font-medium">Wajib</th>
                    <th className="pb-2 font-medium">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground align-top">
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">events</td>
                    <td className="py-3">Array</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">Daftar event yang dikirim dalam satu batch.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">type</td>
                    <td className="py-3">String</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">
                      Tipe event, misalnya <code>frontend_error</code>,{" "}
                      <code>frontend_promise_error</code>, <code>backend_error</code>,{" "}
                      <code>api_error</code>, atau <code>log</code>. Default <code>log</code>.
                    </td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">message</td>
                    <td className="py-3">String</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">Pesan utama error atau ringkasan log.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">stack_trace</td>
                    <td className="py-3">String</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">Jejak stack error.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">url</td>
                    <td className="py-3">String</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">URL halaman atau endpoint yang bermasalah.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">method</td>
                    <td className="py-3">String</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">
                      HTTP method, misalnya <code>GET</code> atau <code>POST</code>.
                    </td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">environment</td>
                    <td className="py-3">String</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">
                      Nama environment. Default <code>production</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono text-foreground">user_agent</td>
                    <td className="py-3">String</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">User agent klien bila Anda ingin mengirimnya.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">Contoh Request & Response</h3>
        <CodeBlock
          file="curl"
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

        <h3 className="text-xl font-bold mt-8 mb-4">Kode Respons</h3>
        <table className="w-full text-left text-sm mt-4 border-collapse mb-6">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Body</th>
              <th className="pb-3 font-medium">Arti</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>200</code>
              </td>
              <td className="py-4">
                <code>{'{ "ok": true, "ingested": 1 }'}</code>
              </td>
              <td className="py-4">Event berhasil disimpan.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>400</code>
              </td>
              <td className="py-4">
                <code>invalid_payload</code> / <code>bad_request</code>
              </td>
              <td className="py-4">
                Body JSON tidak valid atau <code>events</code> bukan array.
              </td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>401</code>
              </td>
              <td className="py-4">
                <code>missing_token</code> / <code>invalid_key</code>
              </td>
              <td className="py-4">Header Authorization hilang atau API key tidak dikenal.</td>
            </tr>
            <tr>
              <td className="py-4">
                <code>403</code>
              </td>
              <td className="py-4">
                <code>site_not_verified</code>
              </td>
              <td className="py-4">Domain situs belum diverifikasi.</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-muted-foreground">
          <strong>Catatan:</strong> endpoint ingestion mengizinkan semua origin (CORS <code>*</code>
          ) agar SDK browser dapat mengirim dari domain pelanggan, dan saat ini belum membatasi laju
          request secara otomatis. Bila Anda membutuhkan pembatasan, tambahkan sendiri di sisi
          aplikasi Anda.
        </p>
      </>
    ),
  },
  {
    id: "alerting",
    title: "Sistem Alerting & Perintah Bot",
    icon: BellRing,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Tujuan utama <em>monitoring</em> adalah memberi tahu Anda di saat yang tepat. WebWatch
          mengirim seluruh notifikasi melalui Telegram, dengan aturan anti-spam yang mencegah banjir
          pesan (<em>alert fatigue</em>).
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Kapan Notifikasi Dikirim?</h3>
        <table className="w-full text-left text-sm mt-4 border-collapse mb-6">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Pemicu</th>
              <th className="pb-3 font-medium">Pesan</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">Situs gagal melewati ambang batas beruntun</td>
              <td className="py-4">
                🔴 <strong>DOWN</strong> — label, URL, pesan error, jumlah kegagalan, waktu UTC.
              </td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">Situs kembali merespons berhasil</td>
              <td className="py-4">
                🟢 <strong>RECOVERED</strong> — label, URL, durasi downtime, waktu pemulihan.
              </td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">Sertifikat SSL akan kedaluwarsa ≤ 7 hari</td>
              <td className="py-4">
                ⚠️ <strong>SSL CERTIFICATE</strong> — label, URL, sisa hari, waktu UTC.
              </td>
            </tr>
            <tr>
              <td className="py-4">Batch APM memuat event bertipe error</td>
              <td className="py-4">
                🚨 <strong>APM ALERT</strong> — tipe, environment, pesan, endpoint yang terkena.
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold mt-8 mb-4">Aturan Anti-Spam</h3>
        <ul className="list-disc ml-5 space-y-2 text-muted-foreground mb-8">
          <li>
            Notifikasi <strong>DOWN</strong> dan <strong>RECOVERED</strong> untuk satu situs
            memiliki jeda minimal <strong>10 menit</strong>. Bila kejadian lain terjadi di dalam
            rentang tersebut, pesan ditahan sampai cooldown selesai.
          </li>
          <li>
            Peringatan SSL hanya dikirim ulang paling cepat <strong>1 kali per 24 jam</strong> per
            situs.
          </li>
          <li>
            Dari satu batch APM, hanya <strong>event error pertama</strong> yang diumumkan lewat
            Telegram. Sisanya tetap tercatat dan dapat dilihat di halaman{" "}
            <strong>APM &amp; Issues</strong>.
          </li>
          <li>Notifikasi hanya dikirim ke chat Telegram yang sudah terhubung dengan akun Anda.</li>
        </ul>

        <h3 className="text-xl font-bold mt-8 mb-4">Perintah Bot Telegram</h3>
        <p className="text-muted-foreground mb-4">
          Bot WebWatch juga menjadi antarmuka manajemen. Kirim perintah berikut ke chat bot Anda:
        </p>
        <table className="w-full text-left text-sm mt-4 border-collapse mb-6">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Perintah</th>
              <th className="pb-3 font-medium">Fungsi</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/start</code>
              </td>
              <td className="py-4">Menghubungkan chat Telegram dengan akun Anda.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/help</code>
              </td>
              <td className="py-4">Menampilkan daftar perintah.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/addsite &lt;url&gt; [interval_menit]</code>
              </td>
              <td className="py-4">Menambahkan situs yang dipantau.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/listsite</code> · <code>/status</code>
              </td>
              <td className="py-4">Menampilkan daftar situs beserta statusnya.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/removesite &lt;id&gt;</code>
              </td>
              <td className="py-4">Menghapus situs.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>/pause &lt;id&gt;</code> · <code>/resume &lt;id&gt;</code>
              </td>
              <td className="py-4">Menjeda atau melanjutkan pemantauan.</td>
            </tr>
            <tr>
              <td className="py-4">
                <code>/history &lt;id&gt;</code>
              </td>
              <td className="py-4">Uptime 30 hari beserta insiden terakhir.</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Terminal className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>
              <code>id</code> yang dimaksud adalah 8 karakter pertama dari id situs. Pencocokan
              dilakukan dengan prefix, dan harus menghasilkan tepat satu situs.
            </span>
          </p>
        </div>
      </>
    ),
  },
  {
    id: "keamanan-kepatuhan",
    title: "Keamanan & Kepatuhan Data",
    icon: Shield,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Karena kami mengumpulkan <em>stack trace</em> dan konteks request dari aplikasi Anda, kami
          menjaga agar data sensitif pelanggan Anda tidak bocor.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 border border-border rounded-xl bg-card">
            <Lock className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Tanpa Password</h4>
            <p className="text-sm text-muted-foreground">
              Tidak ada password yang disimpan maupun dipulihkan. Login memakai kode 6 digit sekali
              pakai yang dikirim ke chat Telegram, berlaku 5 menit, dan dibatasi 5 kali percobaan.
            </p>
          </div>
          <div className="p-5 border border-border rounded-xl bg-card">
            <Layers className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Isolasi Tenant</h4>
            <p className="text-sm text-muted-foreground">
              Setiap data situs, insiden, event, dan API key terikat pada akun pemiliknya. Seluruh
              query terautentikasi dijalankan dengan filter <code>user_id</code>, sehingga satu akun
              tidak dapat membaca atau mengubah data akun lain.
            </p>
          </div>
          <div className="p-5 border border-border rounded-xl bg-card">
            <Activity className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Retensi Terbatas</h4>
            <p className="text-sm text-muted-foreground">
              Riwayat pemeriksaan uptime dan insiden yang sudah selesai dihapus otomatis setelah{" "}
              <strong>30 hari</strong>. Event APM disimpan sebagai arsip dan dapat dihapus manual
              dari dashboard.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">Kredensial</h3>
        <ul className="list-disc ml-5 space-y-2 text-muted-foreground mb-8">
          <li>Token sesi dan kode OTP disimpan dalam bentuk hash SHA-256, bukan nilai aslinya.</li>
          <li>
            Cookie sesi memakai flag <code>HttpOnly</code>, <code>Secure</code>, dan{" "}
            <code>SameSite=Lax</code> dengan masa berlaku 30 hari.
          </li>
          <li>API key dibuat per situs dan dapat dicabut dengan menghapus key tersebut.</li>
          <li>
            Endpoint webhook Telegram dan endpoint cron dilindungi shared secret yang dibandingkan
            secara timing-safe.
          </li>
        </ul>

        <h3 className="text-xl font-bold mt-8 mb-4">CORS pada Endpoint Ingestion</h3>
        <p className="text-muted-foreground mb-8">
          Endpoint <code>/api/ingest</code> sengaja mengizinkan semua origin, karena SDK browser
          mengirim dari domain pelanggan sendiri. Endpoint tersebut hanya menerima API key yang
          valid, dan seluruh isinya dipisahkan per situs.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Komitmen GDPR &amp; CCPA</h3>
        <p className="text-muted-foreground leading-relaxed">
          Sistem kami dirancang agar beroperasi penuh sebagai <em>Data Processor</em>. Kami
          menyarankan Anda — sebagai <em>Data Controller</em> — untuk tidak mengirim nama, email,
          atau data pribadi pengguna secara terang (<em>plain-text</em>) ke server kami. Gunakan ID
          samaran (<em>anonymized user ID</em>), dan hapus atau sensor setiap data sensitif sebelum
          dikirim.
        </p>

        <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground mt-8">
          <p className="flex items-start gap-2">
            <Webhook className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>
              Ingin memantau uptime lewat curl? Endpoint manual tersedia di{" "}
              <code>POST /api/public/cron/run</code> dengan header <code>x-webwatch-cron</code> —
              namun penggunaannya dibatasi untuk keperluan verifikasi.
            </span>
          </p>
        </div>
      </>
    ),
  },
];

function DocsPage() {
  const [activeSection, setActiveSection] = useState(DOCS_SECTIONS[0]?.id || "prolog");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const sections = DOCS_SECTIONS.map((s) => document.getElementById(s.id));
      let currentActive = activeSection;

      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            currentActive = section.id;
          }
        }
      }

      if (currentActive !== activeSection) {
        setActiveSection(currentActive);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 items-center gap-4 px-4 sm:px-8 max-w-[1400px]">
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            to="/dashboard"
            className="hidden md:inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="hidden md:block h-4 w-px bg-border" />
          <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>
              WebWatch <span className="text-muted-foreground font-normal ml-1">Documentation</span>
            </span>
          </Link>

          <div className="ml-auto hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <a
              href="https://github.com/hsanmz/webwatch"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a href="/status" className="hover:text-foreground transition-colors">
              API Status
            </a>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-[1400px] flex relative">
        {/* Sidebar Navigation */}
        <aside
          className={`
          fixed md:sticky top-14 left-0 z-30 h-[calc(100vh-3.5rem)] w-72 border-r border-border bg-background/95 backdrop-blur-md transition-transform duration-300 md:translate-x-0 overflow-hidden
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <div className="p-6 h-full overflow-y-auto pb-24 scrollbar-hide">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-2">
              Getting Started
            </h4>
            <nav className="space-y-1 mb-8">
              {DOCS_SECTIONS.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left
                    ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }
                  `}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${activeSection === item.id ? "text-primary" : "text-muted-foreground/50"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </button>
              ))}
            </nav>

            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-2">
              API &amp; Integrasi
            </h4>
            <nav className="space-y-1 mb-8">
              {DOCS_SECTIONS.slice(2, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left
                    ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }
                  `}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${activeSection === item.id ? "text-primary" : "text-muted-foreground/50"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </button>
              ))}
            </nav>

            <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-2">
              Platform &amp; Ops
            </h4>
            <nav className="space-y-1">
              {DOCS_SECTIONS.slice(5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left
                    ${
                      activeSection === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-card hover:text-foreground"
                    }
                  `}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${activeSection === item.id ? "text-primary" : "text-muted-foreground/50"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </button>
              ))}
            </nav>

            <div className="mt-12 pt-6 border-t border-border/50">
              <a
                href="https://github.com/hsanmz/webwatch/issues"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
                Support &amp; Komunitas
              </a>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0" ref={contentRef}>
          <div className="px-6 py-12 md:px-12 lg:px-24 max-w-5xl mx-auto">
            <div className="mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold mb-6">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                v1.0.0 (Stable)
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                WebWatch Documentation
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium max-w-3xl">
                Panduan komprehensif, referensi API, dan praktik terbaik (*best practices*) untuk
                membangun sistem pengawasan aplikasi tanpa celah.
              </p>
            </div>

            <div className="space-y-32 pb-32">
              {DOCS_SECTIONS.map((section, index) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="scroll-mt-28"
                >
                  <div className="flex items-center gap-4 mb-8 pb-4 border-b border-border">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                      <section.icon className="h-6 w-6" />
                    </div>
                    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                      {section.title}
                    </h2>
                  </div>
                  <div className="prose prose-invert prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none max-w-none text-base md:text-lg">
                    {section.content}
                  </div>
                </motion.section>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border mt-12 pb-16 gap-4 text-center md:text-left">
              <p className="text-sm text-muted-foreground font-medium">
                © 2026 WebWatch APM. Built for developers.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-sm font-medium text-foreground bg-card hover:bg-muted border border-border px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                Scroll ke Paling Atas
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
