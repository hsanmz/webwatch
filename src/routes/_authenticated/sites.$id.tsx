import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Save,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { CodeBlock } from "@/components/app/code-block";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sites/$id")({
  component: SiteDetail,
});

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRelativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

type SiteRow = {
  id: string;
  name: string | null;
  url: string;
  is_active: boolean;
  verification_status: string;
  verification_token: string | null;
  created_at: string;
};

type ApmEventRow = {
  id: string;
  environment: string;
  event_type: string;
  message: string;
  stack_trace: string | null;
  url: string | null;
  method: string | null;
  user_agent: string | null;
  created_at: string;
};

type Detail = { site: SiteRow; events: ApmEventRow[] };

function isErrorEvent(eventType: string): boolean {
  return eventType.toLowerCase().includes("error");
}

/* ── Section header with consistent styling ── */
function SectionHeader({
  icon: Icon,
  title,
  trailing,
}: {
  icon: React.ElementType;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {trailing}
    </div>
  );
}

/* ── Status badge ── */
function StatusChip({ status, active }: { status: string; active: boolean }) {
  const isVerified = status === "verified";
  return (
    <Badge variant={isVerified ? "success" : "warning"} className="gap-1">
      {isVerified ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
      {isVerified ? "Terverifikasi" : "Pending Verifikasi"}
    </Badge>
  );
}

/* ── Copy to clipboard button ── */
function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TooltipPrimitive>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 gap-1">
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{copied ? "Tersalin" : label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        {copied ? "Tersalin ke clipboard" : `Salin ${label.toLowerCase()}`}
      </TooltipContent>
    </TooltipPrimitive>
  );
}

/* ── Refresh button with loading ── */
function RefreshButton({
  onClick,
  disabled,
  title = "Refresh",
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <TooltipPrimitive>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
        >
          <Loader2 className={cn("h-4 w-4", disabled ? "animate-spin" : "")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{title}</TooltipContent>
    </TooltipPrimitive>
  );
}

function SiteDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "apm" | "settings">("overview");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const handleTabChange = (value: string) => setActiveTab(value as "overview" | "apm" | "settings");

  const detail = useQuery({
    queryKey: ["site-detail", id],
    queryFn: () => api<Detail>(`/api/sites/detail?id=${encodeURIComponent(id)}`),
  });
  const refetchDetail = () => detail.refetch();
  const {
    data: detailData,
    isPending: detailIsPending,
    isError: detailIsError,
    isFetching: detailIsFetching,
  } = detail;

  const apiKeys = useQuery({
    queryKey: ["site-keys", id],
    queryFn: () =>
      api<{ keys: { key: string; name: string; created_at: string }[] }>(
        `/api/sites/keys?siteId=${encodeURIComponent(id)}`,
      ),
  });

  const createApiKey = useMutation({
    mutationFn: async (name: string) =>
      api<{ ok: boolean; key: string }>("/api/sites/keys", {
        method: "POST",
        body: JSON.stringify({ siteId: id, name }),
      }),
    onSuccess: () => {
      toast.success("API key berhasil dibuat");
      setKeyName("");
      setKeyDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["site-keys", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveSettings = useMutation({
    mutationFn: async () =>
      api<{ ok: boolean }>("/api/sites", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          name: siteName.trim() || null,
          is_active: isActive,
        }),
      }),
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      setSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const verifySite = useMutation({
    mutationFn: async () =>
      api<{ ok: boolean }>("/api/sites/verify", {
        method: "POST",
        body: JSON.stringify({ siteId: id }),
      }),
    onSuccess: () => {
      toast.success("Verifikasi berhasil");
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const site = detailData?.site ?? null;
  const events = detailData?.events ?? [];
  const keys = apiKeys.data?.keys ?? [];

  const now = Date.now();

  useEffect(() => {
    if (site) {
      setSiteName(site.name ?? "");
      setIsActive(site.is_active);
    }
  }, [site]);

  /* ── Loading / Error / Empty ── */
  if (detailIsPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (detailIsError) {
    return (
      <ErrorState
        title="Detail situs gagal dimuat"
        description="Data situs tidak bisa diambil dari server."
        onRetry={() => void refetchDetail()}
      />
    );
  }

  if (!site) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Situs tidak ditemukan"
        description="Situs yang kamu cari sudah dihapus atau tidak pernah ada."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  /* ── Render ── */
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        eyebrow="Detail Situs"
        title={site.name || new URL(site.url).hostname.replace(/^www\./, "")}
        description={site.url}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton onClick={() => refetchDetail()} disabled={detailIsFetching} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" /> Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("apm")}>
                  <Activity className="h-4 w-4" /> Log APM
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <StatusChip status={site.verification_status} active={site.is_active} />
          </div>
        }
      />

      {/* ── Verification Banner ── */}
      {site.verification_status === "pending" && site.verification_token && (
        <section className="panel border-warning/30 bg-warning-surface p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                Verifikasi Kepemilikan Domain
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Agar log error diterima, buktikan bahwa kamu pemilik{" "}
                <code className="font-mono bg-muted px-1.5 rounded">{site.url}</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="select-all font-mono text-xs bg-muted px-2 py-1 rounded">
                {site.verification_token}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifySite.mutate()}
                disabled={verifySite.isPending}
              >
                {verifySite.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Memverifikasi...
                  </>
                ) : (
                  "Verifikasi Sekarang"
                )}
              </Button>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Buat file <code className="bg-muted px-1 rounded">webwatch-verify.txt</code> di root
            website kamu (agar bisa diakses di{" "}
            <code className="font-mono bg-muted px-1 rounded">
              {new URL(site.url).origin}/webwatch-verify.txt
            </code>
            ) dan isi dengan kode unik di atas. Klik tombol verifikasi setelah file di-upload.
          </p>
        </section>
      )}

      {/* ── Stat Row ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Activity}
          label="Total Error (30 hari)"
          value={events.length}
          sub="event tercatat"
        />
        <StatCard
          icon={TriangleAlert}
          label="Error"
          value={events.filter((e) => isErrorEvent(e.event_type)).length}
          sub="butuh perhatian"
          tone="down"
        />
        <StatCard icon={Bell} label="API Keys" value={keys.length} sub="terbuat untuk situs ini" />
      </section>

      {/* ── Tabs Content ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Recent errors */}
          <div className="panel overflow-hidden">
            <SectionHeader
              icon={Activity}
              title="Error Terbaru"
              trailing={
                <div className="flex items-center gap-2">
                  <RefreshButton onClick={() => refetchDetail()} disabled={detailIsFetching} />
                  <Badge variant="neutral">{events.length} event</Badge>
                </div>
              }
            />
            <div className="p-5">
              {detailIsPending ? (
                <ul className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i}>
                      <Skeleton className="h-24 rounded-lg" />
                    </li>
                  ))}
                </ul>
              ) : detailIsError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="Detail situs gagal dimuat"
                  description="Data situs tidak bisa diambil dari server."
                  onRetry={() => void refetchDetail()}
                />
              ) : events.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={Activity}
                  title="Belum ada error tercatat"
                  description="Belum ada exception yang masuk dari SDK WebWatch pada situs ini."
                />
              ) : (
                <ul className="space-y-3">
                  {events.slice(0, 10).map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={isErrorEvent(ev.event_type) ? "danger" : "info"}
                            className="font-mono text-[10px]"
                          >
                            {ev.event_type}
                          </Badge>
                          <Badge variant="neutral" className="font-mono text-[10px]">
                            {ev.environment}
                          </Badge>
                        </div>
                        <time
                          className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                          dateTime={ev.created_at}
                        >
                          {formatRelativeTime(ev.created_at)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>
                      {(ev.method || ev.url) && (
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          {[ev.method, ev.url].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {ev.stack_trace && (
                        <details className="mt-3 group">
                          <summary className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            <ChevronDown
                              className="h-3 w-3 transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            />
                            Tampilkan stack trace
                          </summary>
                          <pre className="mt-2 w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                            {ev.stack_trace}
                          </pre>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── APM ── */}
        <TabsContent value="apm">
          <div className="panel overflow-hidden">
            <SectionHeader
              icon={Activity}
              title="Semua Log APM & Error"
              trailing={
                <div className="flex items-center gap-2">
                  <RefreshButton onClick={() => refetchDetail()} disabled={detailIsFetching} />
                  <Badge variant="neutral">{events.length} event</Badge>
                </div>
              }
            />
            <div className="p-5">
              {detailIsPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : detailIsError ? (
                <ErrorState
                  className="min-h-[160px]"
                  title="Log APM gagal dimuat"
                  description="Data exception tidak bisa diambil dari server."
                  onRetry={() => void refetchDetail()}
                />
              ) : events.length === 0 ? (
                <EmptyState
                  className="min-h-[160px]"
                  icon={Activity}
                  title="Belum ada error tercatat"
                  description="Belum ada exception yang masuk dari SDK WebWatch pada situs ini."
                />
              ) : (
                <ul className="space-y-3">
                  {events.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={isErrorEvent(ev.event_type) ? "danger" : "info"}
                            className="font-mono text-[10px]"
                          >
                            {ev.event_type}
                          </Badge>
                          <Badge variant="neutral" className="font-mono text-[10px]">
                            {ev.environment}
                          </Badge>
                        </div>
                        <time
                          className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                          dateTime={ev.created_at}
                        >
                          {formatRelativeTime(ev.created_at)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>
                      {(ev.method || ev.url) && (
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          {[ev.method, ev.url].filter(Boolean).join(" ")}
                        </p>
                      )}
                      {ev.stack_trace && (
                        <details className="mt-3 group">
                          <summary className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            <ChevronDown
                              className="h-3 w-3 transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            />
                            Tampilkan stack trace
                          </summary>
                          <pre className="mt-2 w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                            {ev.stack_trace}
                          </pre>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── SETTINGS ── */}
        <TabsContent value="settings">
          <div className="panel overflow-hidden">
            <SectionHeader icon={Settings} title="Pengaturan Situs" />
            <form
              className="p-5 space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                saveSettings.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="site-name">Nama Situs</Label>
                <Input
                  id="site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="misal: Website Produksi"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <div className="space-y-0.5">
                  <Label htmlFor="active" className="font-medium cursor-pointer">
                    Aktifkan Ingest Error
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Nonaktifkan untuk menghentikan penerimaan log error dari SDK tanpa menghapus
                    situs.
                  </p>
                </div>
              </div>

              {site.verification_status === "pending" && site.verification_token && (
                <div className="space-y-2 pt-4 border-t border-border bg-warning-surface/50 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-warning">Domain Belum Terverifikasi</p>
                      <p className="text-xs text-muted-foreground">
                        Verifikasi domain untuk mulai menerima log error.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifySite.mutate()}
                      disabled={verifySite.isPending}
                    >
                      {verifySite.isPending ? "Memverifikasi..." : "Verifikasi Domain"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token verifikasi:{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      {site.verification_token}
                    </code>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saveSettings.isPending}>
                  {saveSettings.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── API Keys & APM Integration ── */}
      <section className="panel overflow-hidden">
        <SectionHeader
          icon={KeyRound}
          title="API Keys & Integrasi APM"
          trailing={
            <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-2 text-xs gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Buat Key Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Buat API Key Baru</DialogTitle>
                  <DialogDescription>
                    Beri nama agar mudah dikenali, misalnya "frontend produksi".
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = keyName.trim();
                    if (!name) return;
                    createApiKey.mutate(name);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nama API Key</Label>
                    <Input
                      id="key-name"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Frontend produksi"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createApiKey.isPending || !keyName.trim()}>
                      {createApiKey.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      )}
                      Buat Key
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Gunakan API key ini di SDK WebWatch untuk mengirim log dan error dari aplikasimu.
          </p>

          {apiKeys.isPending ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : apiKeys.isError ? (
            <ErrorState
              className="min-h-[160px]"
              title="API Key gagal dimuat"
              description="Daftar API key tidak bisa diambil dari server."
              onRetry={() => void apiKeys.refetch()}
            />
          ) : keys.length === 0 ? (
            <EmptyState
              className="min-h-[160px]"
              icon={KeyRound}
              title="Belum ada API Key"
              description="Buat API key untuk mulai mengirim log error dari aplikasi kamu."
              action={
                <Button asChild>
                  <DialogTrigger asChild>
                    <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                      <Button size="sm">
                        <KeyRound className="h-3.5 w-3.5" /> Buat Key Pertama
                      </Button>
                    </Dialog>
                  </DialogTrigger>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {keys.map((k) => (
                <li
                  key={k.key}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{k.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="select-all break-all font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {k.key}
                      </code>
                      <CopyButton value={k.key} label="Key" />
                      <time
                        className="text-xs text-muted-foreground tabular-nums"
                        dateTime={k.created_at}
                      >
                        {new Date(k.created_at).toLocaleDateString("id-ID")}
                      </time>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Cara Pasang
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Cara Memasang SDK</DialogTitle>
                        <DialogDescription>
                          API key <span className="font-mono">{k.name}</span>. Ganti contoh domain
                          dan key di bawah dengan milikmu.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 py-2">
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-foreground">
                            1. Frontend (Browser / React / Vue / HTML)
                          </h3>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Letakkan di dalam tag{" "}
                            <code className="rounded bg-muted px-1">{"<head>"}</code> pada file
                            index.html aplikasimu.
                          </p>
                          <CodeBlock
                            file="index.html"
                            code={`<script type="module">
  import { WebWatch } from "${origin}/api/public/sdk";

  WebWatch.init("${k.key}", "${origin}/api/ingest");
</script>`}
                          />
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-foreground">
                            2. Backend (Node.js / Express)
                          </h3>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Letakkan paling bawah sebelum{" "}
                            <code className="rounded bg-muted px-1">app.listen</code>.
                          </p>
                          <CodeBlock
                            file="server.js"
                            code={`import { WebWatch } from "${origin}/api/public/sdk";

WebWatch.init("${k.key}", "${origin}/api/ingest");

app.use(WebWatch.expressErrorHandler());`}
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Settings Dialog ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pengaturan Situs</DialogTitle>
            <DialogDescription>
              Konfigurasi nama, status aktif, dan verifikasi domain untuk situs ini.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveSettings.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="site-name-dialog">Nama Situs</Label>
              <Input
                id="site-name-dialog"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="misal: Website Produksi"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch id="active-dialog" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="active-dialog" className="cursor-pointer">
                Aktifkan Ingest Error
              </Label>
            </div>

            {site.verification_status === "pending" && site.verification_token && (
              <div className="space-y-2 pt-4 border-t border-border bg-warning-surface/50 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-warning">Domain Belum Terverifikasi</p>
                    <p className="text-xs text-muted-foreground">
                      Verifikasi domain untuk mulai menerima log error.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifySite.mutate()}
                    disabled={verifySite.isPending}
                  >
                    {verifySite.isPending ? "Memverifikasi..." : "Verifikasi Domain"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token verifikasi:{" "}
                  <code className="font-mono bg-muted px-1 rounded">{site.verification_token}</code>
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
