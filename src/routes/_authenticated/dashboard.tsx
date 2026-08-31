import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  Activity,
  Clock,
  Server,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Site = {
  id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  is_active: boolean;
  current_status: string;
  last_checked_at: string | null;
  verification_token: string | null;
  verification_status: string;
};

type Me = {
  id: string;
  email: string;
  chat_id: string | null;
  tg_username: string | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request gagal (${res.status})`);
  return data;
}

function StatusDot({ status, active }: { status: string; active: boolean }) {
  const color = !active
    ? "bg-[var(--paused)]/15 text-[var(--paused)] border border-[var(--paused)]/20"
    : status === "up"
      ? "bg-[var(--up)]/15 text-[var(--up)] border border-[var(--up)]/20"
      : status === "down"
        ? "bg-[var(--down)]/15 text-[var(--down)] border border-[var(--down)]/20"
        : "bg-muted text-muted-foreground border border-border";
  const dotColor = !active
    ? "bg-[var(--paused)]"
    : status === "up"
      ? "bg-[var(--up)]"
      : status === "down"
        ? "bg-[var(--down)]"
        : "bg-muted-foreground";

  const label = !active ? "Paused" : status === "unknown" ? "Pending" : status.toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest shadow-sm ${color}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor} ${active && status === "up" ? "live-dot" : ""}`}
      />
      {label}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [threshold, setThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);

  const sites = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const data = await api<{ sites: Site[] }>("/api/sites");
      return data.sites;
    },
  });

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await api<{ user: Me }>("/api/auth/me");
      return data.user;
    },
    retry: false,
  });

  const addSite = useMutation({
    mutationFn: () =>
      api<{ ok: boolean }>("/api/sites", {
        method: "POST",
        body: JSON.stringify({
          url: url.trim(),
          intervalMinutes: Math.max(1, Number(minutes) || 5),
          failThreshold: Math.max(1, Number(threshold) || 2),
          keyword: keyword.trim() || null,
          ssl: checkSsl,
        }),
      }),
    onSuccess: () => {
      setUrl("");
      setKeyword("");
      setThreshold("2");
      setCheckSsl(false);
      setOpenAdd(false);
      toast.success("Situs ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleSite = useMutation({
    mutationFn: async (site: Site) =>
      api<{ ok: boolean }>("/api/sites", {
        method: "PATCH",
        body: JSON.stringify({ id: site.id, is_active: !site.is_active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sites"] }),
  });

  const verifySite = useMutation({
    mutationFn: async (id: string) =>
      api<{ ok: boolean; status?: string }>("/api/sites/verify", {
        method: "POST",
        body: JSON.stringify({ id }),
      }),
    onSuccess: (data) => {
      toast.success("Verifikasi berhasil!");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => {
      toast.error(
        error.message === "token_mismatch"
          ? "Token tidak sesuai"
          : error.message === "file_not_found"
            ? "File webwatch-verify.txt tidak ditemukan"
            : error.message,
      );
    },
  });

  const removeSite = useMutation({
    mutationFn: async (id: string) =>
      api<{ ok: boolean }>("/api/sites", { method: "DELETE", body: JSON.stringify({ id }) }),
    onSuccess: () => {
      toast.success("Situs dihapus");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  async function signOut() {
    try {
      await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      queryClient.clear();
      navigate({ to: "/auth" });
    }
  }

  const connected = me.data?.chat_id != null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="WebWatch" className="h-8 w-auto" />
            <span className="font-display text-lg font-bold">
              <span className="text-primary">Web</span>
              <span className="text-foreground">Watch</span>
            </span>
            <span className="ml-2 hidden rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary-foreground md:inline-block">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/docs"
                className="text-sm text-muted-foreground hover:text-primary transition-colors mr-4 font-medium flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Dokumentasi SDK
              </Link>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest border ${
                  connected
                    ? "border-[var(--up)]/20 bg-[var(--up)]/10 text-[var(--up)]"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[var(--up)] live-dot" : "bg-muted-foreground"}`}
                />
                {connected ? "Telegram Terhubung" : "Telegram Terputus"}
              </span>
              {me.data?.email && (
                <span className="text-sm text-muted-foreground ml-2 mr-2">{me.data.email}</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {!connected && me.data && (
          <section className="panel flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/10 p-5">
            <div>
              <h3 className="font-display font-semibold text-amber-500">
                Telegram Belum Terhubung!
              </h3>
              <p className="mt-1 text-sm text-amber-500/80">
                Kamu belum mengaktifkan notifikasi Telegram. Login ulang di halaman auth untuk
                menghubungkan.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
            >
              <Link to="/auth">Hubungkan Sekarang</Link>
            </Button>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Proyek Pemantauan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola semua website yang sedang dipantau.
            </p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Tambah Situs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Tambah Situs Baru</DialogTitle>
                <DialogDescription>
                  Masukkan URL dan atur konfigurasi pemantauan. Kami akan mengeceknya secara
                  berkala.
                </DialogDescription>
              </DialogHeader>
              <form
                className="mt-2 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  addSite.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="url">URL Lengkap</Label>
                  <Input
                    id="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://situsku.com"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="interval">Interval (menit)</Label>
                    <Input
                      id="interval"
                      type="number"
                      min={1}
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Toleransi Gagal (x)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min={1}
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyword">Pengecekan Keyword (opsional)</Label>
                  <Input
                    id="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Contoh: Login"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-4 bg-card/50">
                  <Switch id="ssl" checked={checkSsl} onCheckedChange={setCheckSsl} />
                  <div className="grid gap-1.5">
                    <Label htmlFor="ssl" className="cursor-pointer font-semibold">
                      Pantau Sertifikat SSL
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Kirim peringatan jika SSL akan kedaluwarsa (&lt; 7 hari).
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={addSite.isPending}>
                    {addSite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan & Pantau
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {sites.isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sites.data?.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">Belum ada situs dipantau</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Tambahkan website pertama kamu untuk mulai memantau uptime dan mendapatkan alert
              Telegram secara real-time.
            </p>
            <Button className="mt-6" onClick={() => setOpenAdd(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Situs Pertama
            </Button>
          </div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sites.data?.map((site) => (
              <article
                key={site.id}
                className="panel group flex flex-col justify-between p-5 transition-all hover:border-primary/50 hover:shadow-glow"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/sites/$id"
                        params={{ id: site.id }}
                        className="block truncate font-display text-lg font-semibold transition-colors hover:text-primary focus:outline-none"
                      >
                        {site.name || site.url}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {site.url}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <StatusDot status={site.current_status} active={site.is_active} />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3" /> tiap {site.interval_seconds / 60}m
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />{" "}
                      {site.last_checked_at
                        ? `cek ${new Date(site.last_checked_at).toLocaleTimeString().slice(0, 5)}`
                        : "belum dicek"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                  {site.verification_status === "pending" ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                        >
                          Verifikasi Domain
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Verifikasi Kepemilikan Domain</DialogTitle>
                          <DialogDescription>
                            Untuk memantau dan mendapatkan metrik APM, buktikan bahwa kamu pemilik{" "}
                            {site.url}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <p className="text-sm">
                            1. Buat file bernama{" "}
                            <code className="bg-muted px-1 py-0.5 rounded">
                              webwatch-verify.txt
                            </code>{" "}
                            di root website kamu (agar bisa diakses di {site.url}
                            /webwatch-verify.txt).
                          </p>
                          <p className="text-sm">2. Isi file tersebut dengan kode unik ini:</p>
                          <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all select-all">
                            {site.verification_token}
                          </div>
                          <p className="text-sm">
                            3. Setelah file di-upload, klik tombol verifikasi di bawah.
                          </p>
                        </div>
                        <Button
                          onClick={() => verifySite.mutate(site.id)}
                          disabled={verifySite.isPending}
                        >
                          {verifySite.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Verifikasi Sekarang
                        </Button>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs font-medium"
                    >
                      <Link to="/sites/$id" params={{ id: site.id }}>
                        Lihat Metrik
                      </Link>
                    </Button>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleSite.mutate(site)}
                      title={site.is_active ? "Jeda pemantauan" : "Lanjutkan pemantauan"}
                    >
                      {site.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        if (
                          confirm(`Hapus ${site.name || site.url}? Riwayat akan hilang permanen.`)
                        ) {
                          removeSite.mutate(site.id);
                        }
                      }}
                      title="Hapus situs"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
