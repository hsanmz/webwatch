import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

const DOCS_SECTIONS = [
  {
    id: "prolog",
    title: "Prolog: Filosofi WebWatch",
    icon: BookOpen,
    content: (
      <>
        <p className="text-lg leading-relaxed text-muted-foreground mb-6">
          WebWatch lahir dari rasa frustrasi menghadapi *monitoring tools* tingkat enterprise yang
          mahal, rumit diatur, dan penuh dengan metrik yang tidak relevan. Filosofi kami sederhana:{" "}
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
              Pengecekan proaktif dari luar. Server global kami melakukan ping ke situs Anda
              (HTTP/HTTPS) setiap menit untuk mendeteksi *downtime*, latensi jaringan, atau
              kedaluwarsa sertifikat SSL sebelum pengunjung Anda menyadarinya.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
            <Activity className="h-8 w-8 text-teal-500 mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">
              Application Performance Monitoring
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pelaporan reaktif dari dalam. Memanfaatkan SDK ultra-ringan, sistem akan menangkap
              *stack trace*, HTTP *context*, dan status aplikasi tepat di milidetik terjadinya
              sebuah *crash* atau *unhandled exception*.
            </p>
          </div>
        </div>
        <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg mb-8">
          <h4 className="font-bold text-primary mb-1">Arsitektur Edge-First</h4>
          <p className="text-sm text-primary/80">
            Semua *ingestion layer* dibangun di atas jaringan *Edge Workers* global. Ini berarti
            *payload* error dari user di seluruh dunia akan diterima dalam rentang latensi &lt; 50ms
            dan diantrekan secara asinkron tanpa memblokir *thread* aplikasi Anda.
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
          Mengintegrasikan WebWatch dapat diselesaikan dalam hitungan menit. Kami merancang alur
          kerja yang sepenuhnya *self-service*.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">1. Pendaftaran Domain & Autorisasi</h3>
        <p className="text-muted-foreground mb-4">
          Sebelum sistem mulai menerima log, Anda diwajibkan melakukan *Domain Verification*.
          Langkah ini mencegah eksploitasi API *rate limit* Anda oleh pihak yang tidak bertanggung
          jawab.
        </p>
        <div className="bg-card border border-border rounded-xl p-5 font-mono text-sm text-muted-foreground space-y-3 mb-8">
          <p className="text-foreground font-semibold">Terdapat dua metode verifikasi:</p>
          <ul className="list-disc ml-5 space-y-2">
            <li>
              <strong>File Upload (Direkomendasikan):</strong> Unduh{" "}
              <code>webwatch-verify.txt</code> dan letakkan di <code>/public</code> atau *document
              root* Anda.
            </li>
            <li>
              <strong>DNS TXT Record:</strong> Tambahkan TXT record <code>_webwatch-challenge</code>{" "}
              dengan *value* token dari dashboard Anda.
            </li>
          </ul>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">2. Manajemen Lingkungan (Environments)</h3>
        <p className="text-muted-foreground mb-4">
          Kami menyarankan pembuatan API Key yang berbeda untuk masing-masing lingkungan
          (*environment*). Misalnya, pisahkan log antara <code>production</code> dan{" "}
          <code>staging</code>.
        </p>
        <table className="w-full text-left text-sm mt-4 border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground">
              <th className="pb-3 font-medium">Environment</th>
              <th className="pb-3 font-medium">Saran Penggunaan API Key</th>
              <th className="pb-3 font-medium">Alerting</th>
            </tr>
          </thead>
          <tbody className="text-foreground/80">
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>production</code>
              </td>
              <td className="py-4">Gunakan Key khusus Prod. Wajib diamankan.</td>
              <td className="py-4">Kirim ke grup Telegram tim *On-call*.</td>
            </tr>
            <tr className="border-b border-border/20">
              <td className="py-4">
                <code>staging</code>
              </td>
              <td className="py-4">Bebas di-rotasi. Untuk pengujian regresi.</td>
              <td className="py-4">Dibisukan (Muted) / Grup internal.</td>
            </tr>
            <tr>
              <td className="py-4">
                <code>local</code>
              </td>
              <td className="py-4">
                Gunakan flag <code>enabled: false</code> di SDK.
              </td>
              <td className="py-4">Tidak dikirim.</td>
            </tr>
          </tbody>
        </table>
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
          SDK Frontend WebWatch memonitor *Global Window Error*, *Unhandled Promise Rejection*, dan
          *React Error Boundaries*. Ukuran bundle SDK sangat kecil (~2KB gzipped).
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Integrasi Skrip Langsung (CDN)</h3>
        <div className="bg-[#0D1117] border border-border rounded-xl overflow-hidden mb-6 shadow-lg">
          <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/5">
            <span className="text-xs font-mono text-muted-foreground">index.html</span>
          </div>
          <div className="p-5 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 leading-relaxed">
              <span className="text-gray-500">
                {"<!-- Load secara async agar tidak memblokir render -->"}
              </span>
              {"n"}
              <span className="text-blue-400">{"<script "}</span>
              <span className="text-purple-400">async src</span>
              <span className="text-gray-300">="</span>
              <span className="text-green-300">https://cdn.webwatch.id/v1/sdk.js</span>
              <span className="text-gray-300">"</span>
              <span className="text-blue-400">{"></script>"}</span>
              {"n"}
              <span className="text-blue-400">{"<script>"}</span>
              {"n"}
              {"  "}window.webwatch = window.webwatch || [];{"n"}
              {"  "}window.webwatch.push({"{"}
              {"n"}
              {"    "}
              <span className="text-purple-400">apiKey</span>:{" "}
              <span className="text-green-300">"ww_live_xxxxxxxxx"</span>,{"n"}
              {"    "}
              <span className="text-purple-400">environment</span>:{" "}
              <span className="text-green-300">"production"</span>,{"n"}
              {"    "}
              <span className="text-purple-400">captureConsole</span>:{" "}
              <span className="text-orange-300">true</span>,{"n"}
              {"    "}
              <span className="text-purple-400">ignoreErrors</span>: [{" "}
              <span className="text-green-300">/Network Error/i</span>,{" "}
              <span className="text-green-300">"ResizeObserver loop limit exceeded"</span> ],{"n"}
              {"    "}
              <span className="text-purple-400">sampleRate</span>:{" "}
              <span className="text-orange-300">1.0</span>{" "}
              <span className="text-gray-500">// 1.0 = tangkap 100% error</span>
              {"n"}
              {"  "}
              {"}"});{"n"}
              <span className="text-blue-400">{"</script>"}</span>
            </pre>
          </div>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">Integrasi React & Next.js</h3>
        <p className="text-muted-foreground mb-4">
          Kami menyediakan komponen *Error Boundary* terpadu untuk mencegah aplikasi React berubah
          menjadi *blank white screen* saat komponen gagal di-*render*.
        </p>
        <div className="bg-[#0D1117] border border-border rounded-xl overflow-hidden mb-6 shadow-lg">
          <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/5">
            <span className="text-xs font-mono text-muted-foreground">App.tsx</span>
          </div>
          <div className="p-5 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 leading-relaxed">
              <span className="text-red-400">import</span> {"{ ErrorBoundary }"}{" "}
              <span className="text-red-400">from</span>{" "}
              <span className="text-green-300">"@webwatch/react"</span>;{"nn"}
              <span className="text-blue-400">function</span>{" "}
              <span className="text-yellow-200">FallbackUI</span>({"{ error, resetError }"}) {"{"}
              {"n"}
              {"  "}return ({"n"}
              {"    "}
              <span className="text-blue-400">{"<div>"}</span>
              {"n"}
              {"      "}
              <span className="text-blue-400">{"<h1>"}</span>Oops! Terjadi kesalahan sistem.
              <span className="text-blue-400">{"</h1>"}</span>
              {"n"}
              {"      "}
              <span className="text-blue-400">{"<button onClick="}</span>
              {"{resetError}"}
              <span className="text-blue-400">{">"}</span>Coba Lagi
              <span className="text-blue-400">{"</button>"}</span>
              {"n"}
              {"    "}
              <span className="text-blue-400">{"</div>"}</span>
              {"n"}
              {"  "});{"n"}
              {"}"}
              {"nn"}
              <span className="text-red-400">export default function</span>{" "}
              <span className="text-yellow-200">App</span>() {"{"}
              {"n"}
              {"  "}return ({"n"}
              {"    "}
              <span className="text-blue-400">{"<ErrorBoundary fallback="}</span>
              {"{FallbackUI}"}
              <span className="text-blue-400">{">"}</span>
              {"n"}
              {"      "}
              <span className="text-blue-400">{"<MyComplexComponent />"}</span>
              {"n"}
              {"    "}
              <span className="text-blue-400">{"</ErrorBoundary>"}</span>
              {"n"}
              {"  "});{"n"}
              {"}"}
            </pre>
          </div>
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
          Menangkap error di backend memerlukan intersepsi HTTP *Request* untuk mendapatkan konteks
          (URL, Headers, User ID) sebelum error dilaporkan.
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Express.js Middleware</h3>
        <p className="text-muted-foreground mb-4">
          Sangat penting untuk menempatkan middleware *ErrorHandler* WebWatch{" "}
          <strong>setelah</strong> semua rute dan middleware lainnya, tepat sebelum handler *error
          fallback* bawaan Anda.
        </p>

        <div className="bg-[#0D1117] border border-border rounded-xl overflow-hidden mb-6 shadow-lg">
          <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/5">
            <span className="text-xs font-mono text-muted-foreground">server.js</span>
          </div>
          <div className="p-5 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300 leading-relaxed">
              <span className="text-blue-400">const</span> express ={" "}
              <span className="text-yellow-200">require</span>(
              <span className="text-green-300">"express"</span>);{"n"}
              <span className="text-blue-400">const</span> webwatch ={" "}
              <span className="text-yellow-200">require</span>(
              <span className="text-green-300">"@webwatch/node"</span>);{"nn"}
              <span className="text-blue-400">const</span> app ={" "}
              <span className="text-yellow-200">express</span>();{"nn"}
              <span className="text-gray-500">// 1. Inisialisasi</span>
              {"n"}
              webwatch.<span className="text-yellow-200">init</span>({"{"}
              {"n"}
              {"  "}
              <span className="text-purple-400">apiKey</span>: "process.env.WEBWATCH_API_KEY",{"\n"}
              {"  "}
              <span className="text-purple-400">environment</span>: "process.env.NODE_ENV",{"\n"}
              {"  "}
              <span className="text-purple-400">captureUncaught</span>:{" "}
              <span className="text-orange-300">true</span>
              {"n"}
              {"}"});{"nn"}
              <span className="text-gray-500">
                // 2. Middleware Ingestion (Tepat di bawah parser)
              </span>
              {"n"}
              app.<span className="text-yellow-200">use</span>(webwatch.Handlers.
              <span className="text-yellow-200">requestHandler</span>());{"nn"}
              <span className="text-gray-500">// --- Controller & Routing Aplikasi Anda ---</span>
              {"n"}
              app.<span className="text-yellow-200">get</span>(
              <span className="text-green-300">"/api/data"</span>, (req, res) {"=>"} {"{"}
              {"n"}
              {"  "}
              <span className="text-red-400">throw new</span>{" "}
              <span className="text-yellow-200">Error</span>(
              <span className="text-green-300">"Koneksi database gagal!"</span>);{"n"}
              {"}"});{"nn"}
              <span className="text-gray-500">
                // 3. Middleware Error (Di akhir sebelum app.listen)
              </span>
              {"n"}
              app.<span className="text-yellow-200">use</span>(webwatch.Handlers.
              <span className="text-yellow-200">errorHandler</span>());{"nn"}
              app.<span className="text-yellow-200">listen</span>(
              <span className="text-orange-300">3000</span>);
            </pre>
          </div>
        </div>

        <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-r-lg mt-6">
          <h4 className="font-bold text-orange-500 mb-1">Perhatian terkait Asynchronous Error</h4>
          <p className="text-sm text-orange-500/80">
            Di Express 4.x, *promise* yang gagal secara *asynchronous* (seperti query database di
            dalam rute `async`) tidak akan otomatis tertangkap oleh *error middleware*. Pastikan
            Anda mem-bungkus (wrap) *controller* Anda menggunakan utilitas seperti
            `express-async-handler` atau menangkapnya manual menggunakan `next(err)`.
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
          Selain menggunakan SDK, Anda bebas membangun integrasi kustom menggunakan bahasa
          pemrograman apa pun yang mendukung HTTP *request* dengan *endpoint* REST publik kami.
        </p>

        <div className="border border-border rounded-lg overflow-hidden bg-card mb-8">
          <div className="p-4 border-b border-border bg-muted/30">
            <h4 className="font-bold font-mono">
              POST{" "}
              <span className="text-muted-foreground ml-2">
                https://ingest.webwatch.id/v1/events
              </span>
            </h4>
          </div>
          <div className="p-4">
            <h5 className="text-sm font-semibold mb-2">Autentikasi Header</h5>
            <code className="text-xs bg-black/40 px-2 py-1 rounded text-primary">
              Authorization: Bearer [API_KEY]
            </code>

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
                    <td className="py-3 font-mono text-foreground">event_id</td>
                    <td className="py-3">String (UUID)</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">ID unik untuk deduplikasi *event*. Maks. 36 karakter.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">level</td>
                    <td className="py-3">Enum</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">
                      Nilai harus salah satu dari: <code>fatal</code>, <code>error</code>,{" "}
                      <code>warning</code>, <code>info</code>, <code>debug</code>.
                    </td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">message</td>
                    <td className="py-3">String</td>
                    <td className="py-3 text-primary">Ya</td>
                    <td className="py-3">Pesan utama *error* atau ringkasan log.</td>
                  </tr>
                  <tr className="border-b border-border/20">
                    <td className="py-3 font-mono text-foreground">exception</td>
                    <td className="py-3">Object</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">Detail *stack trace* dan nama *class exception*.</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono text-foreground">request</td>
                    <td className="py-3">Object</td>
                    <td className="py-3">Tidak</td>
                    <td className="py-3">
                      Detail HTTP (URL, Method, Headers). Hindari menyisipkan header sensitif
                      seperti <code>Cookie</code> atau *Token*.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          <strong>Rate Limiting:</strong> Endpoint *ingestion* dibatasi hingga 1.000 *event* per
          menit per API Key. *Payload* yang melebihi batas ini akan ditolak dengan status HTTP{" "}
          <code>429 Too Many Requests</code>.
        </p>
      </>
    ),
  },
  {
    id: "alerting",
    title: "Sistem Alerting & Webhook",
    icon: BellRing,
    content: (
      <>
        <p className="text-muted-foreground mb-6">
          Tujuan utama *monitoring* adalah memberi tahu Anda di saat yang tepat. WebWatch memiliki
          *engine* alert pintar yang mencegah notifikasi ganda atau banjir notifikasi (*alert
          fatigue*).
        </p>

        <h3 className="text-xl font-bold mt-8 mb-4">Mekanisme Debouncing Telegram</h3>
        <p className="text-muted-foreground mb-4">
          Bila ada 5.000 error identik yang terjadi dalam kurun waktu 10 detik, Anda{" "}
          <strong>tidak</strong> akan menerima 5.000 pesan Telegram. WebWatch mengelompokkan
          (grouping) *event* yang memiliki tanda tangan (*signature*) error yang sama.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-muted-foreground mb-8">
          <li>
            Pesan pertama dikirim <strong>secara instan</strong> (T+0).
          </li>
          <li>
            Pesan peringatan kedua tentang masalah yang sama akan ditunda minimal{" "}
            <strong>5 menit</strong>, dengan rangkuman total kemunculan baru (misal: "Error ini
            terjadi 459x lagi").
          </li>
          <li>Setiap 1 jam, status sistem yang masih gagal (*failing*) akan diingatkan kembali.</li>
        </ul>

        <h3 className="text-xl font-bold mt-8 mb-4">Konfigurasi Custom Webhook (Enterprise)</h3>
        <p className="text-muted-foreground mb-4">
          Selain Telegram, Anda dapat mengarahkan *alert* ke *channel* Slack, Discord, atau sistem
          tiket seperti Jira/Linear menggunakan fitur Custom Webhook.
        </p>
        <div className="bg-card border border-border p-4 rounded-xl font-mono text-xs text-muted-foreground mb-4">
          {`POST https://domain-anda.com/webhook/webwatch

{
  "alert_type": "DOWNTIME_DETECTED",
  "project_name": "Tokoku API",
  "url": "https://api.tokoku.com/health",
  "triggered_at": "2026-09-01T01:30:00Z",
  "details": {
    "status_code": 502,
    "response_time_ms": 3200
  }
}`}
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
          Karena kami mengumpulkan *stack trace* dan *header* *request* dari aplikasi Anda, kami
          mematuhi standar privasi data tertinggi untuk memastikan PII (*Personal Identifiable
          Information*) pelanggan Anda tidak bocor.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-5 border border-border rounded-xl bg-card">
            <Lock className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Automated Data Scrubbing</h4>
            <p className="text-sm text-muted-foreground">
              Kami secara otomatis menghapus atau me-masking nilai dari header HTTP sensitif:{" "}
              <code>authorization</code>, <code>cookie</code>, <code>x-api-key</code>, serta payload
              *password*.
            </p>
          </div>
          <div className="p-5 border border-border rounded-xl bg-card">
            <Layers className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Isolasi *Tenant* (RLS)</h4>
            <p className="text-sm text-muted-foreground">
              Database log dipartisi secara ketat berdasarkan API Key. Row-Level Security mencegah
              kebocoran silang data antar pengguna platform kami.
            </p>
          </div>
          <div className="p-5 border border-border rounded-xl bg-card">
            <Activity className="h-6 w-6 text-primary mb-3" />
            <h4 className="font-bold mb-2">Retensi Terbatas</h4>
            <p className="text-sm text-muted-foreground">
              Log mentah (*raw error events*) akan dihapus permanen secara sistematis (*hard
              delete*) setelah <strong>30 hari</strong> bergulir (*rolling window*).
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold mt-8 mb-4">Komitmen GDPR & CCPA</h3>
        <p className="text-muted-foreground leading-relaxed">
          Sistem kami dirancang agar beroperasi penuh sebagai *Data Processor*. Kami menyarankan
          Anda—sebagai *Data Controller*—untuk mengonfigurasi *SDK Frontend* agar tidak mengirim
          nama atau email pengguna secara terang (*plain-text*) ke server kami, melainkan cukup
          mengirimkan ID samaran (*anonymized user ID*).
        </p>
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
              href="https://github.com/webwatch"
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
              API & Integrasi
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
              Platform & Ops
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

            <div className="mt-12 pt-6 border-t border-border/50">
              <a
                href="#"
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
                Support & Komunitas
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
                v1.2.0 (Stable)
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
