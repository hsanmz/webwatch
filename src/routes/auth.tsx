import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          <span className="font-display text-lg font-bold tracking-tight">WebWatch</span>
        </Link>

        <div className="panel p-8">
          <h1 className="text-2xl font-bold">
            {mode === "signin" ? "Masuk ke dashboard" : "Buat akun gratis"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau situs tiap menit, notif langsung ke Telegram.
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
            className="mt-6 w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </div>
    </main>
  );
}
