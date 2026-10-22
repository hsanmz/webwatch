import { Link } from "@tanstack/react-router";
import { Activity, AlertTriangle, Clock, Loader2, Pause, Play, Trash2 } from "lucide-react";
import type { ApiSite } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/app/status-badge";

function hostInitial(url: string): string {
  try {
    return new URL(url).hostname
      .replace(/^www\./, "")
      .charAt(0)
      .toUpperCase();
  } catch {
    return "#";
  }
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SiteCard({
  site,
  verifyPending = false,
  onVerify,
  onToggle,
  onRemove,
}: {
  site: ApiSite;
  verifyPending?: boolean;
  onVerify?: (id: string) => void;
  onToggle: (site: ApiSite) => void;
  onRemove: (site: ApiSite) => void;
}) {
  const needsVerification = site.verification_status === "pending";

  return (
    <article className="panel flex flex-col justify-between p-5 transition-colors hover:border-border-strong">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-lg border font-display text-sm font-bold ${
                needsVerification
                  ? "border-warning/30 bg-warning-surface text-warning"
                  : "border-border bg-muted text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              {needsVerification ? <AlertTriangle className="h-4 w-4" /> : hostInitial(site.url)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-foreground">
                {site.name || hostLabel(site.url)}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{site.url}</p>
            </div>
          </div>
          <StatusBadge status={site.current_status} active={site.is_active} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            tiap {Math.round(site.interval_seconds / 60)} menit
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {site.last_checked_at
              ? `cek ${new Date(site.last_checked_at).toLocaleTimeString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  hour: "2-digit",
                  minute: "2-digit",
                })} WIB`
              : "belum dicek"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        {needsVerification ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-warning/40 text-warning">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Verifikasi Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verifikasi Kepemilikan Domain</DialogTitle>
                <DialogDescription>
                  Untuk memantau dan mendapatkan metrik, buktikan bahwa kamu pemilik {site.url}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm">
                  1. Buat file bernama{" "}
                  <code className="rounded bg-muted px-1 py-0.5">webwatch-verify.txt</code> di root
                  website kamu (agar bisa diakses di {site.url}/webwatch-verify.txt).
                </p>
                <p className="text-sm">2. Isi file tersebut dengan kode unik ini:</p>
                <div className="select-all break-all rounded-lg border border-border bg-muted p-3 font-mono text-sm">
                  {site.verification_token}
                </div>
                <p className="text-sm">
                  3. Setelah file di-upload, klik tombol verifikasi di bawah.
                </p>
              </div>
              <Button onClick={() => onVerify?.(site.id)} disabled={verifyPending}>
                {verifyPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Verifikasi Sekarang
              </Button>
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link to="/sites/$id" params={{ id: site.id }}>
              Lihat Metrik
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(site)}
            title={site.is_active ? "Jeda pemantauan" : "Lanjutkan pemantauan"}
          >
            {site.is_active ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {site.is_active ? "Jeda pemantauan" : "Lanjutkan pemantauan"}
            </span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-danger-surface hover:text-danger"
                title="Hapus situs"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Hapus situs</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus {site.name || hostLabel(site.url)}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Riwayat pengecekan, insiden, dan metrik situs ini akan hilang permanen. Tindakan
                  ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:brightness-95"
                  onClick={() => onRemove(site)}
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}
