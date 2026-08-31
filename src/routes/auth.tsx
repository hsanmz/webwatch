import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2, ShieldCheck, Timer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WebWatch Uptime Monitor" },
      {
        name: "description",
        content:
          "Sign in or create a free WebWatch account to monitor your websites and get Telegram downtime alerts.",
      },
      { property: "og:title", content: "Sign in — WebWatch" },
      {
        property: "og:description",
        content: "Free uptime monitoring with instant Telegram alerts.",
      },
    ],
  }),
  component: AuthPage,
});

const SAMPLE_ROWS = [
  { host: "tokoku.id", ok: true, ms: "128 ms · 200 OK" },
  { host: "api.tokoku.id", ok: true, ms: "84 ms · 200 OK" },
  { host: "blog.tokoku.id", ok: false, ms: "timeout · 3x gagal" },
  { host: "checkout.tokoku.id", ok: true, ms: "213 ms · 200 OK" },
];

function BrandPanel() {
  return (
    <div
      className="hidden min-h-screen flex-col justify-between p-10 lg:flex"
      style={{
        backgroundColor: "#0b1219",
        backgroundImage:
          "radial-gradient(42rem 32rem at 85% -10%, oklch(0.76 0.13 178 / 0.18), transparent 60%), radial-gradient(32rem 28rem at -5% 100%, oklch(0.6 0.12 178 / 0.12), transparent 55%)",
      }}
    >
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="WebWatch" className="h-10 w-auto" />
      </div>

      <div>
        <h2 className="max-w-md font-display text-3xl font-bold leading-tight text-white">
          Website down? <span className="text-[#2dd4bf]">Kamu tahu duluan.</span>
        </h2>
        <p className="mt-4 max-w-md text-sm text-white/60">
          Tiap menit dipantau, alert Telegram terkirim langsung saat ada gangguan dan saat semuanya
          pulih kembali.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
          <ul className="divide-y divide-white/10">
            {SAMPLE_ROWS.map((row) => (
              <li key={row.host} className="flex items-center gap-3 py-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${row.ok ? "bg-[#2dd4bf]" : "bg-red-400"}`}
                />
                <span className="flex-1 font-mono text-sm text-white/90">{row.host}</span>
                <span className="font-mono text-[11px] text-white/50">{row.ms}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              telegram · baru saja
            </p>
            <p className="mt-1 text-sm">
              <span className="text-[#2dd4bf]">🔵 DOWN</span>
              <span className="text-white/80"> — blog.tokoku.id</span>
            </p>
            <p className="font-mono text-[11px] text-white/40">
              Error: Timeout (&gt;10s) · gagal berturut-turut: 3x · durasi 02:14
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-white/40">
        <span className="flex items-center gap-2">
          <Timer className="h-3.5 w-3.5" /> interval 1 menit
        </span>
        <span className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5" /> alert instan
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> anti false alarm
        </span>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Cek email kalau butuh konfirmasi.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in gagal. Coba lagi.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="marketing min-h-screen">
      <div className="grid lg:grid-cols-2">
        <BrandPanel />

        <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            kembali ke beranda
          </Link>

          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="WebWatch" className="h-8 w-auto" />
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Masuk ke dashboard" : "Buat akun gratis"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Pantau situs tiap menit, notif langsung ke Telegram."
                : "Gratis, tanpa kartu kredit. Langsung jalan dalam hitungan detik."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kamu@domain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Masuk" : "Daftar"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              atau
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="secondary" className="w-full" onClick={google}>
              Lanjut dengan Google
            </Button>

            <button
              type="button"
              className="mt-6 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
