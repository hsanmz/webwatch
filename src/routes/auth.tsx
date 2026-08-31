import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — WebWatch Uptime Monitor" },
      {
        name: "description",
        content:
          "Masuk ke WebWatch dengan OTP via Telegram untuk memantau situs dan dapat alert downtime instan.",
      },
      { property: "og:title", content: "Masuk — WebWatch" },
      {
        property: "og:description",
        content: "Uptime monitoring gratis dengan alert Telegram instan.",
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
      className="hidden min-h-screen flex-col justify-between p-10 lg:flex bg-muted/30"
      style={{
        backgroundImage:
          "radial-gradient(42rem 32rem at 85% -10%, oklch(0.58 0.12 178 / 0.18), transparent 60%), radial-gradient(32rem 28rem at -5% 100%, oklch(0.58 0.12 178 / 0.12), transparent 55%)",
      }}
    >
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="WebWatch" className="h-10 w-auto" />
      </div>

      <div>
        <h2 className="max-w-md font-display text-3xl font-bold leading-tight text-foreground">
          Website down? <span className="text-primary">Kamu tahu duluan.</span>
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted-foreground font-medium">
          Tiap menit dipantau, alert Telegram terkirim langsung saat ada gangguan dan saat semuanya
          pulih kembali.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-4 shadow-panel">
          <ul className="divide-y divide-border">
            {SAMPLE_ROWS.map((row) => (
              <li key={row.host} className="flex items-center gap-3 py-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${row.ok ? "bg-primary" : "bg-red-400"}`}
                />
                <span className="flex-1 font-mono text-sm font-medium text-foreground">{row.host}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{row.ms}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              telegram · baru saja
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              <span className="font-bold text-red-500">DOWN</span>
              <span className="text-muted-foreground"> — blog.tokoku.id</span>
            </p>
            <p className="font-mono text-[11px] font-medium text-muted-foreground/80 mt-1">
              Error: Timeout (&gt;10s) · gagal berturut-turut: 3x · durasi 02:14
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/80">
        <span className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" /> interval 1 menit
        </span>
        <span className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> alert instan
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> anti false alarm
        </span>
      </div>
    </div>
  );
}

type Step = "email" | "link" | "code";

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) navigate({ to: "/dashboard" });
      })
      .catch(() => undefined);
    return () => {
      if (pollingRef.current != null) window.clearInterval(pollingRef.current);
    };
  }, [navigate]);

  const requestOtp = useCallback(async (emailValue: string) => {
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: emailValue }),
    });
    const data = (await res.json()) as { status?: string; deepLink?: string; error?: string };
    if (!res.ok || data.error) throw new Error(data.error ?? "Gagal mengirim kode");
    return data;
  }, []);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await requestOtp(email);
      if (data.status === "sent") {
        setStep("code");
      } else if (data.status === "need_link" && data.deepLink) {
        setDeepLink(data.deepLink);
        setStep("link");
        startPolling();
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startPolling() {
    if (pollingRef.current != null) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/link-status?email=${encodeURIComponent(email)}`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as { status?: string };
        if (data.status === "linked") {
          if (pollingRef.current != null) window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          await requestOtp(email);
          setStep("code");
        }
      } catch {
        // transient network hiccup — keep polling
      }
    }, 2500);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Masukkan 6 digit kode.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok)
        throw new Error(
          data.error === "code_invalid" ? "Kode salah atau kedaluwarsa." : "Gagal verifikasi kode.",
        );
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      const data = await requestOtp(email);
      if (data.status === "need_link") {
        if (data.deepLink) {
          setDeepLink(data.deepLink);
          setStep("link");
          startPolling();
        }
        return;
      }
      toast.success("Kode baru sudah dikirim ke Telegram.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  function openTelegram() {
    if (deepLink) window.open(deepLink, "_blank", "noopener");
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
              Masuk ke dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Login tanpa password — kode masuk dikirim ke Telegram.
            </p>

            {step === "email" && (
              <form onSubmit={submitEmail} className="mt-6 space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lanjut
                </Button>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Kode 6 digit dikirim lewat bot Telegram. Belum punya bot? Nanti kamu bisa set
                  langsung.
                </p>
              </form>
            )}

            {step === "link" && (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Hubungkan Telegram</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Buka bot lalu tekan <span className="font-mono text-xs">Start</span>.
                        Setelah terhubung, kode masuk otomatis dikirim ke chat.
                      </p>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={openTelegram}>
                  <MessageCircle className="h-4 w-4" />
                  Buka bot Telegram
                </Button>
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menunggu koneksi Telegram…
                </p>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setStep("email")}
                >
                  Ganti email
                </button>
              </div>
            )}

            {step === "code" && (
              <form onSubmit={submitCode} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Kode masuk</Label>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    className="w-full"
                  >
                    <InputOTPGroup className="w-full">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 flex-1 text-base" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">
                    Terkirim ke Telegram untuk {email}
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verifikasi & masuk
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={resend}
                >
                  Kirim ulang kode
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
