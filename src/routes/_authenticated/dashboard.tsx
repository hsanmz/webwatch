import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle, Plus, Server } from "lucide-react";

import { api, type ApiSite } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
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
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { SiteCard } from "@/components/app/site-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type UrlCheck = { ok: boolean; message: string | null };

function validateUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return { ok: false, message: "URL wajib diisi." };
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, message: "Format URL tidak valid." };
  }
  if (!parsed.hostname.includes(".")) {
    return { ok: false, message: "Format URL tidak valid masukkan domain yang benar." };
  }
  return { ok: true, message: null };
}

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const data = await api<{ sites: ApiSite[] }>("/api/sites");
      return data.sites;
    },
  });
}

function Dashboard() {
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [threshold, setThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const urlCheck = useMemo(() => validateUrl(url), [url]);

  const { data: user } = useCurrentUser();
  const { data: sitesData, isPending } = useSites();

  const connected = user?.chat_id != null;

  const addSite = useMutation({
    mutationFn: () => {
      if (!urlCheck.ok) {
        setUrlError(urlCheck.message);
        throw new Error(urlCheck.message ?? "URL tidak valid");
      }
      return api<{ ok: boolean }>("/api/sites", {
        method: "POST",
        body: JSON.stringify({
          url: url.trim(),
          intervalMinutes: Math.max(1, Number(minutes) || 5),
          failThreshold: Math.max(1, Number(threshold) || 2),
          keyword: keyword.trim() || null,
          ssl: checkSsl,
        }),
      });
    },
    onSuccess: () => {
      setUrl("");
      setKeyword("");
      setThreshold("2");
      setCheckSsl(false);
      setUrlError(null);
      setOpenAdd(false);
      toast.success("Situs ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => {
      if (error.message === "url_taken") {
        setUrlError("URL sudah dipantau oleh akun lain. Pilih URL lain.");
        return;
      }
      toast.error(error.message);
    },
  });

  const toggleSite = useMutation({
    mutationFn: async (site: ApiSite) =>
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
    onSuccess: () => {
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

  const stats = useMemo(() => {
    const list = sitesData ?? [];
    return {
      total: list.length,
      up: list.filter((s) => s.is_active && s.current_status === "up").length,
      down: list.filter((s) => s.is_active && s.current_status === "down").length,
      paused: list.filter((s) => !s.is_active).length,
    };
  }, [sitesData]);

  return (
    <>
      {!connected && user && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/10 p-5">
          <div>
            <h3 className="font-display font-semibold text-amber-500">Telegram Belum Terhubung!</h3>
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

      <PageHeader
        eyebrow="Monitoring"
        title="Proyek Pemantauan"
        description="Kelola semua website yang sedang dipantau."
        actions={
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
                  setUrlError(urlCheck.ok ? null : urlCheck.message);
                  if (urlCheck.ok) addSite.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="url">URL Lengkap</Label>
                  <Input
                    id="url"
                    required
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://situsku.com"
                    aria-invalid={!!urlError}
                  />
                  {urlError ? (
                    <p className="text-xs font-medium text-[var(--down)]">{urlError}</p>
                  ) : (
                    url.trim() !== "" &&
                    urlCheck.ok && (
                      <p className="text-xs text-muted-foreground">
                        Akan dipantau sebagai{" "}
                        <code className="rounded bg-muted px-1 py-0.5">
                          {/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`}
                        </code>
                      </p>
                    )
                  )}
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
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-4">
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
                  <Button
                    type="submit"
                    disabled={addSite.isPending || (url.trim() !== "" && !urlCheck.ok)}
                  >
                    {addSite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan & Pantau
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {sitesData && sitesData.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Server} label="Total Situs" value={stats.total} sub="terdaftar" />
          <StatCard
            icon={CheckCircle2}
            label="Online"
            value={stats.up}
            sub="pantauan aktif"
            tone="up"
          />
          <StatCard
            icon={AlertTriangle}
            label="Gangguan"
            value={stats.down}
            sub="butuh perhatian"
            tone="down"
          />
          <StatCard
            icon={PauseCircle}
            label="Dijeda"
            value={stats.paused}
            sub="pantauan nonaktif"
            tone="paused"
          />
        </section>
      )}

      {isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel animate-pulse p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-3/4 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
              <div className="mt-6 flex gap-5">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="mt-6 border-t border-border/60 pt-4">
                <div className="h-8 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : (sitesData ?? []).length === 0 ? (
        <div className="panel flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
          <div className="relative mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Server className="h-7 w-7 text-primary" />
            </div>
            <span className="live-dot absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-[var(--up)]" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Mulai Pantau
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold">Belum ada situs dipantau</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Tambahkan website pertama kamu untuk mulai memantau uptime dan mendapatkan alert
            Telegram secara real-time.
          </p>
          <Button className="mt-6" onClick={() => setOpenAdd(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Situs Pertama
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Situs Kamu</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {stats.total} terdaftar
            </span>
          </div>
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sitesData?.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                verifyPending={verifySite.isPending}
                onVerify={(id) => verifySite.mutate(id)}
                onToggle={(s) => toggleSite.mutate(s)}
                onRemove={(s) => removeSite.mutate(s.id)}
              />
            ))}
          </section>
        </>
      )}
    </>
  );
}
