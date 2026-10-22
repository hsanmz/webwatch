import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Server } from "lucide-react";

import { api, type ApiSite } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/page-header";
import { SiteCard } from "@/components/app/site-card";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";

export const Route = createFileRoute("/_authenticated/monitors")({
  component: Monitors,
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

function Monitors() {
  const queryClient = useQueryClient();
  const [openAdd, setOpenAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [threshold, setThreshold] = useState("2");
  const [keyword, setKeyword] = useState("");
  const [checkSsl, setCheckSsl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const urlCheck = useMemo(() => validateUrl(url), [url]);
  const { data: sitesData, isPending, isError, refetch } = useSites();

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

  return (
    <>
      <PageHeader
        eyebrow="Uptime"
        title="Uptime Monitors"
        description="Kelola daftar website yang ingin kamu pantau ketersediaannya."
        actions={
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Tambah situs
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Tambah situs baru</DialogTitle>
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
                  <Label htmlFor="url">URL lengkap</Label>
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
                    aria-describedby="url-hint"
                  />
                  {urlError ? (
                    <p id="url-hint" className="text-xs font-medium text-danger">
                      {urlError}
                    </p>
                  ) : (
                    <p id="url-hint" className="text-xs text-muted-foreground">
                      {url.trim() !== "" && urlCheck.ok ? (
                        <>
                          Akan dipantau sebagai{" "}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                            {/^https?:\/\//i.test(url.trim())
                              ? url.trim()
                              : `https://${url.trim()}`}
                          </code>
                        </>
                      ) : (
                        "Contoh: situsku.com"
                      )}
                    </p>
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
                    <Label htmlFor="threshold">Toleransi gagal (x)</Label>
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
                  <Label htmlFor="keyword">Pengecekan keyword (opsional)</Label>
                  <Input
                    id="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Contoh: Login"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                  <Switch id="ssl" checked={checkSsl} onCheckedChange={setCheckSsl} />
                  <div className="grid gap-1.5">
                    <Label htmlFor="ssl" className="cursor-pointer font-semibold">
                      Pantau sertifikat SSL
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
                    {addSite.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    Simpan & pantau
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[196px] rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Situs tidak bisa dimuat"
          description="Daftar situs gagal diambil dari server."
          onRetry={() => void refetch()}
        />
      ) : (sitesData ?? []).length === 0 ? (
        <EmptyState
          icon={Server}
          title="Belum ada situs dipantau"
          description="Tambahkan website pertama kamu untuk mulai memantau uptime."
          action={
            <Button onClick={() => setOpenAdd(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Tambah situs pertama
            </Button>
          }
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      )}
    </>
  );
}
