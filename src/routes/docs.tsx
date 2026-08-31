import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Code, Terminal } from "lucide-react";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> kembali
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Dokumentasi WebWatch APM
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="prose prose-invert max-w-none">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Panduan Integrasi APM SDK
          </h1>
          <p className="text-muted-foreground text-lg mt-2 mb-8">
            Pelajari cara memasang WebWatch di aplikasimu untuk memantau error dan performa secara
            real-time.
          </p>

          <section className="mt-8 space-y-4">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold border-b border-border pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                1
              </span>
              Persiapan Dashboard
            </h2>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground ml-2">
              <li>Tambahkan situs baru di Dashboard WebWatch.</li>
              <li>
                Selesaikan proses <strong>Verifikasi Domain</strong> (upload{" "}
                <code className="text-foreground">webwatch-verify.txt</code>).
              </li>
              <li>
                Masuk ke Detail Situs dan buat <strong>API Key</strong> baru.
              </li>
              <li>
                Salin API Key tersebut (contoh:{" "}
                <code className="text-foreground">ww_a1b2c3...</code>).
              </li>
            </ol>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold border-b border-border pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                2
              </span>
              Integrasi Backend (Node.js / Express)
            </h2>
            <p className="text-muted-foreground">
              Untuk memantau error yang terjadi di sisi server (seperti database mati atau API
              gagal), tambahkan *middleware* ini di akhir pengaturan Express kamu.
            </p>
            <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-muted-foreground">
                <code className="text-blue-400">export function</code>{" "}
                <code className="text-yellow-200">webwatchErrorHandler</code>(apiKey) {"{\n"}
                {"  "}return <code className="text-blue-400">async</code> (err, req, res, next)
                =&gt; {"{\n"}
                {"    "}
                <code className="text-blue-400">try</code> {"{\n"}
                {"      "}
                <code className="text-blue-400">await</code>{" "}
                fetch("https://domain-webwatch-kamu.com/api/ingest", {"{\n"}
                {"        "}method: "POST",{"\n"}
                {"        "}headers: {"{\n"}
                {"          "}"Content-Type": "application/json",{"\n"}
                {"          "}"Authorization": `Bearer ${"{apiKey}"}`{"\n"}
                {"        }"},{"\n"}
                {"        "}body: JSON.stringify({"{\n"}
                {"          "}events: [{"{"} type: "backend_error", message: err.message,
                stack_trace: err.stack {"}"}]{"\n"}
                {"        }"}){"\n"}
                {"      }"});{"\n"}
                {"    }"} <code className="text-blue-400">catch</code> (e){" "}
                {'{ console.error("WebWatch Ingest Error", e); }'}
                {"\n"}
                {"    "}next(err);{"\n"}
                {"  }"};{"\n"}
                {"}"}
                {"\n\n"}
                <span className="text-gray-500">// Cara Pakai:</span>
                {"\n"}
                app.use(<code className="text-yellow-200">webwatchErrorHandler</code>(
                <span className="text-green-300">"ww_a1b2c3..."</span>));
              </pre>
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold border-b border-border pb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                3
              </span>
              Integrasi Frontend (React / Vanilla JS)
            </h2>
            <p className="text-muted-foreground">
              Untuk memantau error yang dialami langsung oleh pengunjung di browser mereka, pasang
              event listener global ini di file index/main.
            </p>
            <div className="rounded-lg border border-border bg-card p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-muted-foreground">
                <code className="text-blue-400">const</code> API_KEY ={" "}
                <span className="text-green-300">"ww_a1b2c3..."</span>;{"\n\n"}
                window.addEventListener(<span className="text-green-300">"error"</span>,{" "}
                <code className="text-blue-400">async</code> (event) =&gt; {"{\n"}
                {"  "}
                <code className="text-blue-400">await</code>{" "}
                fetch("https://domain-webwatch-kamu.com/api/ingest", {"{\n"}
                {"    "}method: "POST",{"\n"}
                {"    "}headers: {"{"} "Content-Type": "application/json", "Authorization": `Bearer
                ${"{API_KEY}"}` {"}"},{"\n"}
                {"    "}body: JSON.stringify({"{\n"}
                {"      "}events: [{"{"} type: "frontend_error", message: event.message, url:
                window.location.href {"}"}]{"\n"}
                {"    }"}){"\n"}
                {"  }"});{"\n"}
                {"}"});
              </pre>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
