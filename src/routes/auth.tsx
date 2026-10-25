import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk - WebWatch" },
      {
        name: "description",
        content:
          "Masuk ke WebWatch dengan kode sekali pakai lewat Telegram untuk memantau error aplikasi dan menerima alert real-time.",
      },
      { property: "og:title", content: "Masuk - WebWatch" },
      {
        property: "og:description",
        content: "APM & Error Monitoring dengan alert Telegram.",
      },
    ],
  }),
  component: AuthPage,
});

const SAMPLE_ROWS = [
  {
    host: "contoh-api.id",
    type: "frontend_error",
    ok: false,
    msg: "TypeError: cannot read 'x' of undefined",
  },
  {
    host: "contoh-web.id",
    type: "backend_error",
    ok: false,
    msg: "Connection refused to database",
  },
  { host: "contoh-app.id", type: "api_error", ok: true, msg: "GET /users 200 OK" },
  {
    host: "contoh-checkout.id",
    type: "frontend_error",
    ok: false,
    msg: "ReferenceError: checkout is not defined",
  },
];

const PROMISES = [
  { icon: Bug, label: "Auto-capture error" },
  { icon: MessageSquare, label: "Alert lewat Telegram" },
  { icon: ShieldCheck, label: "Cooldown anti spam" },
];

function BrandPanel() {
  return (
    <div
      className="hidden min-h-screen flex-col justify-between p-10 lg:flex"
      style={{ backgroundColor: "var(--brand-950)" }}
    >
      <img
        src="/logo.png"
        alt="WebWatch"
        width={990}
        height={606}
        className="h-8 w-auto brightness-0 invert"
      />

      <div className="space-y-8">
        <div>
          <h2 className="max-w-xs font-display text-3xl font-bold leading-tight text-white">
            Aplikasi error?
            <br />
            Kamu tahu duluan.
          </h2>
          <p
            className="mt-4 max-w-sm text-sm leading-relaxed"
            style={{ color: "rgb(255 255 255 / 0.55)" }}
          >
            SDK nangkap error frontend & backend otomatis. Alert Telegram terkirim real-time.
          </p>
        </div>

        {/* APM instrument preview */}
        <div
          className="overflow-hidden rounded-xl"
          style={{
            border: "1px solid rgb(255 255 255 / 0.08)",
            backgroundColor: "rgb(255 255 255 / 0.04)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: "1px solid rgb(255 255 255 / 0.08)" }}
          >
            <span className="font-mono text-xs" style={{ color: "rgb(255 255 255 / 0.35)" }}>
              webwatch · apm
            </span>
            <span className="ml-auto">
              <Badge
                variant="neutral"
                className="border-0 text-[10px]"
                style={{
                  backgroundColor: "rgb(255 255 255 / 0.08)",
                  color: "rgb(255 255 255 / 0.4)",
                }}
              >
                contoh tampilan
              </Badge>
            </span>
          </div>

          <ul className="divide-y" style={{ borderColor: "rgb(255 255 255 / 0.06)" }}>
            {SAMPLE_ROWS.map((row) => (
              <li key={row.host} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.ok ? "bg-[var(--brand-500)]" : "bg-danger"}`}
                  aria-hidden="true"
                />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-sm font-medium"
                  style={{ color: "rgb(255 255 255 / 0.75)" }}
                >
                  {row.host}
                </span>
                <span
                  className="shrink-0 font-mono text-xs tabular-nums"
                  style={{
                    color: row.ok
                      ? "rgb(255 255 255 / 0.35)"
                      : "rgb(var(--danger-rgb, 220 38 38) / 0.75)",
                  }}
                >
                  {row.type}
                </span>
              </li>
            ))}
          </ul>

          {/* Telegram alert mock */}
          <div
            className="px-4 py-3"
            style={{
              borderTop: "1px solid rgb(255 255 255 / 0.06)",
              backgroundColor: "rgb(255 255 255 / 0.03)",
            }}
          >
            <p className="font-mono text-xs" style={{ color: "rgb(255 255 255 / 0.3)" }}>
              WebWatch Bot · 12:03
            </p>
            <p className="mt-1.5 text-sm font-medium" style={{ color: "rgb(255 255 255 / 0.75)" }}>
              <span className="font-bold text-danger">ERROR</span>
              <span style={{ color: "rgb(255 255 255 / 0.45)" }}> · contoh-api.id</span>
            </p>
            <p className="mt-0.5 font-mono text-xs" style={{ color: "rgb(255 255 255 / 0.3)" }}>
              TypeError: cannot read properties of undefined · stack trace tersedia
            </p>
          </div>
        </div>
      </div>

      {/* Footer promises */}
      <ul
        className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
        style={{ color: "rgb(255 255 255 / 0.35)" }}
      >
        {PROMISES.map((promise) => (
          <li key={promise.label} className="flex items-center gap-1.5">
            <promise.icon
              className="h-3.5 w-3.5"
              style={{ color: "var(--brand-500)" }}
              aria-hidden="true"
            />
            {promise.label}
          </li>
        ))}
      </ul>
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
  const [resendIn, setResendIn] = useState(0);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const interval = window.setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearInterval(interval);
  }, [resendIn]);

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
    const data = (await res.json()) as {
      status?: string;
      deepLink?: string;
      error?: string;
      retryAfter?: number;
    };
    if (!res.ok || data.error) {
      if (data.error === "rate_limited") {
        const wait = Math.max(1, data.retryAfter ?? 30);
        setResendIn(wait);
        throw new Error(`Terlalu cepat. Coba lagi dalam ${wait} detik.`);
      }
      throw new Error(data.error ?? "Gagal mengirim kode");
    }
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
          if (pollingRef.current == null) return;
          window.clearInterval(pollingRef.current);
          pollingRef.current = null;
          await requestOtp(email);
          setStep("code");
        }
      } catch {
        // transient network hiccup, keep polling
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
    <main className="flex min-h-screen">
      <div className="grid w-full lg:grid-cols-2">
        <BrandPanel />

        {/* ── Form column ─────────────────────────────────────────────── */}
        <div className="flex min-h-screen flex-col justify-center bg-background px-5 py-12 sm:px-10 lg:px-14">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            kembali ke beranda
          </Link>

          <div className="mx-auto w-full max-w-sm">
            {/* App icon — small visual anchor */}
            <img src="/favicon.png" alt="" aria-hidden="true" className="mb-6 h-10 w-10" />

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Masuk ke dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Login tanpa password — kode dikirim ke Telegram.
            </p>

            {/* ── Email step ──────────────────────────────────────────── */}
            {step === "email" && (
              <form onSubmit={submitEmail} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Alamat email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kamu@domain.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Kirim kode masuk
                </Button>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Kode 6 digit dikirim lewat bot Telegram. Belum punya bot? Kamu bisa set langsung
                  setelah mendaftar.
                </p>
              </form>
            )}

            {/* ── Link Telegram step ──────────────────────────────────── */}
            {step === "link" && (
              <div className="mt-8 space-y-4">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Hubungkan Telegram</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Buka bot lalu tekan Start. Setelah terhubung, kode masuk otomatis dikirim ke
                        chat.
                      </p>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={openTelegram}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Buka bot Telegram
                </Button>
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
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

            {/* ── OTP step ────────────────────────────────────────────── */}
            {step === "code" && (
              <form onSubmit={submitCode} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Kode masuk dari Telegram</Label>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    autoFocus
                    className="w-full"
                  >
                    <InputOTPGroup className="w-full">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 flex-1 font-mono text-base"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">
                    Terkirim ke Telegram untuk{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Verifikasi dan masuk
                </Button>
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={resend}
                    disabled={loading || resendIn > 0}
                  >
                    {resendIn > 0 ? `Kirim ulang (${resendIn}s)` : "Kirim ulang kode"}
                  </button>
                  <button
                    type="button"
                    className="transition-colors hover:text-foreground"
                    onClick={() => setStep("email")}
                  >
                    Ganti email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
