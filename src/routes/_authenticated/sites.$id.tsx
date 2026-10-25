import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  head: () => ({ meta: [{ title: "Pemantauan Domain - WebWatch" }] }),
  component: SiteDetail,
});

function formatRelativeTime(value?: string | null): string {
  if (!value) return "Belum ada error";
  const diff = Date.now() - new Date(value).getTime();
  if (isNaN(diff) || diff < 0) return "baru saja";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

function formatExactDate(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type SiteRow = {
  id: string;
  name: string | null;
  url: string;
  is_active: boolean;
  verification_status: string;
  verification_token: string | null;
  created_at: string;
  log_count?: number;
  last_event_at?: string | null;
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

type Detail = {
  site: SiteRow;
  events: ApmEventRow[];
};

function isErrorEvent(eventType: string): boolean {
  const lower = eventType.toLowerCase();
  return lower.includes("error") || lower.includes("rejection") || lower.includes("fatal");
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  trailing,
}: {
  icon: typeof Activity;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {trailing && <div>{trailing}</div>}
    </div>
  );
}

function CopyButton({ value, label = "Salin" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TooltipProvider delayDuration={0}>
      <TooltipPrimitive>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 gap-1 text-xs">
            {copied ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? "Tersalin" : label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "Tersalin ke clipboard" : `Salin ${label.toLowerCase()}`}
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  );
}

function SiteDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "apm" | "keys" | "settings">("overview");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /* ── Filter state for logs in APM tab ── */
  const [logSearch, setLogSearch] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const detail = useQuery({
    queryKey: ["site-detail", id],
    queryFn: () => api<Detail>(`/api/sites/detail?id=${encodeURIComponent(id)}`),
  });

  const apiKeys = useQuery({
    queryKey: ["site-keys", id],
    queryFn: () =>
      api<{ keys: { key: string; name: string; created_at: string }[] }>(
        `/api/sites/keys?siteId=${encodeURIComponent(id)}`,
      ),
  });

  const site = detail.data?.site ?? null;
  const events = useMemo(() => detail.data?.events ?? [], [detail.data?.events]);
  const keys = apiKeys.data?.keys ?? [];

  useEffect(() => {
    if (site) {
      setSiteName(site.name ?? "");
      setIsActive(site.is_active);
    }
  }, [site]);

  /* ── Toggle Ingest Mutation ── */
  const toggleIngest = useMutation({
    mutationFn: async (nextActive: boolean) =>
      api<{ ok: boolean }>("/api/sites", {
        method: "PATCH",
        body: JSON.stringify({ id, is_active: nextActive }),
      }),
    onSuccess: (_, nextActive) => {
      setIsActive(nextActive);
      toast.success(nextActive ? "Ingest APM diaktifkan" : "Ingest APM dijeda");
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Save Settings Mutation ── */
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
      toast.success("Pengaturan situs disimpan");
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Delete Site Mutation (Danger Zone) ── */
  const deleteSite = useMutation({
    mutationFn: async () =>
      api<{ ok: boolean }>("/api/sites", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      toast.success("Domain berhasil dihapus secara permanen");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      void navigate({ to: "/dashboard" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Create API Key Mutation ── */
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
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Verify Site Mutation ── */
  const verifySite = useMutation({
    mutationFn: async () =>
      api<{ ok: boolean }>("/api/sites/verify", {
        method: "POST",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      toast.success("Verifikasi domain berhasil");
      queryClient.invalidateQueries({ queryKey: ["site-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* ── Semantic Filter for Logs ── */
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by environment
    if (selectedEnv !== "all") {
      result = result.filter((e) => e.environment.toLowerCase() === selectedEnv.toLowerCase());
    }

    // Filter by event type
    if (selectedType === "error") {
      result = result.filter((e) => isErrorEvent(e.event_type));
    } else if (selectedType === "non-error") {
      result = result.filter((e) => !isErrorEvent(e.event_type));
    }

    // Semantic search across message, url, method, stack_trace
    if (logSearch.trim()) {
      const tokens = logSearch.toLowerCase().trim().split(/\s+/);
      result = result.filter((ev) => {
        const target =
          `${ev.message} ${ev.url ?? ""} ${ev.method ?? ""} ${ev.event_type} ${ev.stack_trace ?? ""} ${ev.environment}`.toLowerCase();
        return tokens.every((tok) => target.includes(tok));
      });
    }

    return result;
  }, [events, logSearch, selectedEnv, selectedType]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostname = site ? new URL(site.url).hostname : "";
  const logCapacity = events.length; // capped at 100 per domain
  const capacityPct = Math.min(100, Math.round((logCapacity / 100) * 100));

  /* ── Loading / Error / Empty States ── */
  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <ErrorState
        title="Detail domain gagal dimuat"
        description="Data pemantauan domain tidak dapat diambil dari server."
        onRetry={() => void detail.refetch()}
      />
    );
  }

  if (!site) {
    return (
      <EmptyState
        icon={Globe}
        title="Domain tidak ditemukan"
        description="Domain yang kamu cari mungkin sudah dihapus atau tidak pernah terdaftar."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Kembali ke Dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="hover:text-foreground hover:underline">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground">{hostname}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium text-muted-foreground">Ingest APM:</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  site.is_active ? "bg-emerald-500 shadow-2xs" : "bg-amber-500"
                }`}
                aria-hidden="true"
              />
              <span className="font-mono text-xs font-semibold text-foreground">
                {site.is_active ? "Aktif" : "Jeda"}
              </span>
            </div>
            <Switch
              checked={site.is_active}
              onCheckedChange={(checked) => toggleIngest.mutate(checked)}
              disabled={toggleIngest.isPending}
              aria-label="Toggle Ingest APM"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => void detail.refetch()}
            disabled={detail.isFetching}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", detail.isFetching ? "animate-spin" : "")} />
          </Button>
        </div>
      </div>

      {/* ── Cloudflare-Style Domain Hero Header ── */}
      <div className="panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted font-display text-lg font-bold text-foreground">
              {hostname.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {site.name || hostname}
                </h1>
                <Badge variant={site.is_active ? "success" : "neutral"} className="text-xs">
                  {site.is_active ? "Pemantauan Aktif" : "Ingest Dijeda"}
                </Badge>
              </div>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <span>{site.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 sm:border-t-0 sm:pt-0">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-muted-foreground">Kapasitas Log</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                {logCapacity} / 100 log
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-muted-foreground">
                Kejadian Terakhir
              </span>
              <span className="text-xs font-semibold text-foreground">
                {formatRelativeTime(site.last_event_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Verification banner if pending */}
        {site.verification_status === "pending" && site.verification_token && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning-surface p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-display text-xs font-bold text-warning uppercase tracking-wider">
                  Verifikasi Domain Diperlukan
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Host file <code className="bg-muted px-1 rounded">webwatch-verify.txt</code> di
                  root domain Anda agar ingest log diotorisasi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="select-all rounded bg-muted px-2 py-1 font-mono text-xs">
                  {site.verification_token}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => verifySite.mutate()}
                  disabled={verifySite.isPending}
                  className="h-7 text-xs"
                >
                  {verifySite.isPending ? "Memeriksa..." : "Verifikasi"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cloudflare Navigation Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="space-y-6"
      >
        <TabsList className="grid h-10 w-full grid-cols-4 sm:w-auto sm:inline-grid">
          <TabsTrigger value="overview" className="text-xs">
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="apm" className="text-xs">
            Log Exception ({events.length})
          </TabsTrigger>
          <TabsTrigger value="keys" className="text-xs">
            API Keys & SDK ({keys.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            Pengaturan
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Database}
              label="Kapasitas Log"
              value={`${logCapacity} / 100`}
              sub="auto-purge tertua aktif"
              tone={logCapacity >= 90 ? "warning" : "default"}
            />
            <StatCard
              icon={Activity}
              label="Total Error Kritis"
              value={events.filter((e) => isErrorEvent(e.event_type)).length}
              sub="butuh penanganan segera"
              tone="down"
            />
            <StatCard
              icon={KeyRound}
              label="API Key Aktif"
              value={keys.length}
              sub="kunci ingest SDK"
              tone="default"
            />
            <StatCard
              icon={Globe}
              label="Status Ingest"
              value={site.is_active ? "Menerima" : "Dijeda"}
              sub={site.is_active ? "SDK dapat posting event" : "Event baru akan di-drop"}
              tone={site.is_active ? "up" : "warning"}
            />
          </section>

          {/* Quick Storage Capacity Indicator */}
          <div className="panel p-5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-foreground font-semibold">
                Penyimpanan Log Domain (Maksimal 100)
              </span>
              <span className="font-mono text-muted-foreground">
                {logCapacity} dari 100 log tersimpan ({capacityPct}%)
              </span>
            </div>
            <Progress value={capacityPct} className="mt-2.5 h-2" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Untuk menghemat ruang database, sistem secara otomatis menghapus permanen log tertua
              ketika batas 100 log terlampaui.
            </p>
          </div>

          {/* Recent 5 errors preview */}
          <div className="panel overflow-hidden">
            <SectionHeader
              icon={Activity}
              title="Exception Terbaru"
              description="5 log error terakhir yang tercatat pada domain ini"
              trailing={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("apm")}
                  className="h-7 text-xs"
                >
                  Lihat Semua ({events.length}) →
                </Button>
              }
            />
            <div className="p-5">
              {events.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Belum ada error pada domain ini"
                  description="Aplikasi Anda berjalan normal tanpa error atau SDK belum mulai mengirim data."
                />
              ) : (
                <ul className="space-y-3">
                  {events.slice(0, 5).map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
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
                        <time className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatRelativeTime(ev.created_at)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>
                      {(ev.method || ev.url) && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {[ev.method, ev.url].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: APM & LOG EXCEPTION (Semantic Search & Filter) ── */}
        <TabsContent value="apm" className="space-y-4">
          <div className="panel overflow-hidden">
            <SectionHeader
              icon={Activity}
              title="Pemantauan Log APM & Exception"
              description="Menampilkan hingga 100 log terbaru yang tersimpan secara permanen untuk domain ini."
              trailing={
                <Badge variant="neutral" className="font-mono text-xs">
                  {filteredEvents.length} / {events.length} event
                </Badge>
              }
            />

            {/* Filter toolbar */}
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Semantic search input */}
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Pencarian semantik (pesan, endpoint, stack trace, status)..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedType("all")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      selectedType === "all"
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Semua Tipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType("error")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      selectedType === "error"
                        ? "bg-destructive/15 text-destructive font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    Error Kritis
                  </button>
                </div>

                <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedEnv("all")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      selectedEnv === "all"
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Semua Env
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEnv("production")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      selectedEnv === "production"
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Prod
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEnv("staging")}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      selectedEnv === "staging"
                        ? "bg-muted font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Staging
                  </button>
                </div>
              </div>
            </div>

            {/* Log Stream Area */}
            <div className="p-5">
              {events.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Belum ada exception yang terekam"
                  description="Domain ini belum menerima event dari SDK WebWatch. Pasang SDK untuk memulai."
                />
              ) : filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Tidak ada log yang cocok dengan filter pencarian "{logSearch}".
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredEvents.map((ev) => {
                    const isError = isErrorEvent(ev.event_type);
                    return (
                      <li
                        key={ev.id}
                        className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={isError ? "danger" : "info"}
                              className="font-mono text-[10px]"
                            >
                              {ev.event_type}
                            </Badge>
                            <Badge variant="neutral" className="font-mono text-[10px]">
                              {ev.environment}
                            </Badge>
                          </div>
                          <span
                            className="font-mono text-xs tabular-nums text-muted-foreground"
                            title={formatExactDate(ev.created_at)}
                          >
                            {formatRelativeTime(ev.created_at)}
                          </span>
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
                              Lihat stack trace lengkap
                            </summary>
                            <pre className="mt-2 max-h-80 w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                              {ev.stack_trace}
                            </pre>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: API KEYS & SDK INTEGRATION ── */}
        <TabsContent value="keys" className="space-y-6">
          <div className="panel overflow-hidden">
            <SectionHeader
              icon={KeyRound}
              title="API Keys Ingest"
              description="Kunci otorisasi untuk mengirim batch telemetry dari aplikasi ke domain ini."
              trailing={
                <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Buat Key Baru</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (keyName.trim()) createApiKey.mutate(keyName.trim());
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle>Buat API Key Baru</DialogTitle>
                        <DialogDescription>
                          Beri label identitas agar mudah dikenali (misal: "Frontend React" atau
                          "API Go").
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-4">
                        <Label htmlFor="key-name-input" className="text-xs font-semibold">
                          Nama / Label Key
                        </Label>
                        <Input
                          id="key-name-input"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                          placeholder="e.g. Server Production"
                          required
                          autoFocus
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setKeyDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button type="submit" disabled={createApiKey.isPending || !keyName.trim()}>
                          {createApiKey.isPending ? "Membuat..." : "Simpan Key"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              }
            />

            <div className="p-5">
              {keys.length === 0 ? (
                <EmptyState
                  icon={KeyRound}
                  title="Belum ada API Key untuk domain ini"
                  description="Buat API key agar SDK Anda dapat mengirim telemetry ke WebWatch."
                  action={
                    <Button onClick={() => setKeyDialogOpen(true)} size="sm">
                      Buat Key Pertama
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <li
                      key={k.key}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{k.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <code className="select-all rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                            {k.key}
                          </code>
                          <CopyButton value={k.key} label="Key" />
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SDK Integration Guide (Cloudflare/Linear clean docs) */}
          <div className="panel p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Panduan Integrasi @webwatch/sdk
            </h3>
            <p className="text-xs text-muted-foreground">
              Gunakan salah satu API key di atas untuk menginisialisasi monitoring error di aplikasi
              Anda.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">
                  1. Pasang package npm
                </p>
                <CodeBlock file="Terminal" code="npm i @webwatch/sdk" />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">
                  2. Konfigurasi Environment Variables
                </p>
                <CodeBlock
                  file=".env"
                  code={`WEBWATCH_KEY="${keys[0]?.key ?? "ww_your_api_key_here"}"\nWEBWATCH_URL="${origin}"`}
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-foreground">
                  3. Inisialisasi di Entry Point Aplikasi
                </p>
                <CodeBlock
                  file="index.ts / server.js"
                  code={`import { WebWatch } from "@webwatch/sdk";\n\n// Zero-config (membaca WEBWATCH_KEY dan WEBWATCH_URL secara otomatis)\nWebWatch.init();`}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: SETTINGS & DANGER ZONE (Cloudflare Style) ── */}
        <TabsContent value="settings" className="space-y-6">
          {/* General domain configuration */}
          <div className="panel overflow-hidden">
            <SectionHeader icon={Settings} title="Pengaturan Domain" />
            <form
              className="p-5 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                saveSettings.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="site-name-input" className="text-xs font-semibold">
                  Nama Tampilan
                </Label>
                <Input
                  id="site-name-input"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. Website Produksi"
                  className="max-w-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL Domain</Label>
                <Input value={site.url} disabled className="max-w-md bg-muted font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground">
                  URL domain tidak dapat diubah setelah terdaftar.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <Switch id="active-switch" checked={isActive} onCheckedChange={setIsActive} />
                <div>
                  <Label htmlFor="active-switch" className="font-semibold text-xs cursor-pointer">
                    Terima Ingest Log APM
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Nonaktifkan untuk menolak pengiriman log error dari SDK sementara waktu.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-border">
                <Button type="submit" disabled={saveSettings.isPending} className="gap-2">
                  {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </Button>
              </div>
            </form>
          </div>

          {/* DANGER ZONE (Cloudflare Zone Advanced / Deletion) */}
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 overflow-hidden">
            <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-3.5">
              <h2 className="font-display text-sm font-bold text-destructive">
                Zona Berbahaya (Danger Zone)
              </h2>
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Hapus Domain Secara Permanen
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                  Menghapus domain ini akan menghapus seluruh data pemantauan, konfigurasi API key,
                  dan seluruh 100 log exception yang tersimpan secara permanen. Tindakan ini tidak
                  dapat dibatalkan.
                </p>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 shrink-0">
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus Domain</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive font-display">
                      Konfirmasi Penghapusan Domain
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3 pt-2">
                      <p>
                        Apakah Anda benar-benar yakin ingin menghapus domain{" "}
                        <strong className="text-foreground">{hostname}</strong>?
                      </p>
                      <p className="text-xs">
                        Untuk melanjutkan, ketik hostname domain{" "}
                        <code className="select-all rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground">
                          {hostname}
                        </code>{" "}
                        di bawah ini:
                      </p>
                      <Input
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder={hostname}
                        className="font-mono text-xs"
                        autoFocus
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmInput("")}>
                      Batal
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      disabled={
                        deleteConfirmInput.trim().toLowerCase() !== hostname.toLowerCase() ||
                        deleteSite.isPending
                      }
                      onClick={() => deleteSite.mutate()}
                      className="gap-2"
                    >
                      {deleteSite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span>Hapus Permanen</span>
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
