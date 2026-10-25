import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Radio,
  Search,
  Server,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { api, type ApiSite } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard APM - WebWatch" }] }),
  component: Dashboard,
});

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
  site_name: string;
  site_id: string;
};

type DashboardStatsResponse = {
  events: ApmEventRow[];
  metrics?: {
    totalSites: number;
    activeSites: number;
    events24h: number;
    totalStoredEvents: number;
  };
};

function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const data = await api<{ sites: ApiSite[] }>("/api/sites");
      return data.sites;
    },
  });
}

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return api<DashboardStatsResponse>("/api/sites/dashboard");
    },
  });
}

function isErrorEvent(eventType: string): boolean {
  const lower = eventType.toLowerCase();
  return lower.includes("error") || lower.includes("rejection") || lower.includes("fatal");
}

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

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const sites = useSites();
  const stats = useDashboardStats();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [domainFilter, setDomainFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const connected = user?.chat_id != null;
  const siteList = useMemo(() => sites.data ?? [], [sites.data]);
  const events = useMemo(() => stats.data?.events ?? [], [stats.data]);
  const metrics = stats.data?.metrics;

  /* ── Add domain mutation ── */
  const addDomainMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizeUrlInput(newUrl);
      if (!normalized) throw new Error("URL domain wajib diisi.");
      try {
        const parsed = new URL(normalized);
        if (!parsed.hostname.includes(".")) {
          throw new Error("Masukkan domain yang valid (misal: myapp.com).");
        }
      } catch {
        throw new Error("Format URL tidak valid.");
      }

      return api<{ ok: boolean; id: string }>("/api/sites", {
        method: "POST",
        body: JSON.stringify({
          url: normalized,
          name: newName.trim() || undefined,
        }),
      });
    },
    onSuccess: (data) => {
      toast.success("Domain berhasil ditambahkan");
      setNewUrl("");
      setNewName("");
      setUrlError(null);
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      if (data.id) {
        void navigate({ to: "/sites/$id", params: { id: data.id } });
      }
    },
    onError: (err: Error) => {
      setUrlError(err.message);
      toast.error(err.message);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    addDomainMutation.mutate();
  };

  /* ── Semantic / fuzzy search for domains ── */
  const filteredSites = useMemo(() => {
    if (!domainFilter.trim()) return siteList;
    const tokens = domainFilter.toLowerCase().trim().split(/\s+/);
    return siteList.filter((site) => {
      const target = `${site.name ?? ""} ${site.url} ${site.verification_status}`.toLowerCase();
      return tokens.every((tok) => target.includes(tok));
    });
  }, [siteList, domainFilter]);

  /* ── Semantic search for events ── */
  const filteredEvents = useMemo(() => {
    if (!eventFilter.trim()) return events;
    const tokens = eventFilter.toLowerCase().trim().split(/\s+/);
    return events.filter((ev) => {
      const target =
        `${ev.site_name} ${ev.event_type} ${ev.environment} ${ev.message} ${ev.url ?? ""} ${ev.method ?? ""}`.toLowerCase();
      return tokens.every((tok) => target.includes(tok));
    });
  }, [events, eventFilter]);

  const toggleEventExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalSitesCount = metrics?.totalSites ?? siteList.length;
  const activeSitesCount = metrics?.activeSites ?? siteList.filter((s) => s.is_active).length;
  const events24hCount = metrics?.events24h ?? 0;
  const totalStoredEvents = metrics?.totalStoredEvents ?? events.length;

  return (
    <>
      {/* ── Telegram link banner ── */}
      {!connected && user && (
        <section className="panel flex flex-wrap items-center justify-between gap-4 border-warning/30 bg-warning-surface p-5">
          <div className="flex items-start gap-3">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">
                Telegram belum terhubung
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Notifikasi APM real-time belum aktif. Hubungkan akun Telegram Anda agar setiap error
                baru langsung masuk ke chat.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-warning/40 text-warning">
            <Link to="/auth">Hubungkan Telegram</Link>
          </Button>
        </section>
      )}

      {/* ── Page Header with Add Domain CTA ── */}
      <PageHeader
        eyebrow="Ringkasan Global"
        title="Dashboard APM"
        description="Pantau kesehatan, volume exception, dan seluruh domain aplikasi Anda secara terpusat."
        actions={
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Tambah Domain</span>
          </Button>
        }
      />

      {/* ── APM Metric Row ── */}
      {sites.isPending || stats.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-lg" />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Globe}
            label="Domain Terpantau"
            value={totalSitesCount}
            sub={`${activeSitesCount} domain aktif menerima log`}
            tone="up"
          />
          <StatCard
            icon={Activity}
            label="Exception (24 Jam)"
            value={events24hCount}
            sub="terekam dari seluruh aplikasi"
            tone={events24hCount > 0 ? "down" : "default"}
          />
          <StatCard
            icon={Database}
            label="Kapasitas Log"
            value={`${totalStoredEvents}`}
            sub="maks 100 log/domain (auto-purge)"
            tone="default"
          />
          <StatCard
            icon={Radio}
            label="Alert Telegram"
            value={connected ? "Terhubung" : "Belum Aktif"}
            sub={connected ? "Notifikasi real-time aktif" : "Tautkan akun di Pengaturan"}
            tone={connected ? "up" : "warning"}
          />
        </section>
      )}

      {/* ── SECTION: Domain & Aplikasi (Cloudflare-style zone management) ── */}
      <section className="panel flex flex-col overflow-hidden">
        {/* Section Top Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Domain & Aplikasi Terpantau
            </h2>
            <Badge variant="neutral" className="font-mono text-xs">
              {filteredSites.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search filter */}
            <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari domain..."
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Grid / List switch */}
            <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded p-1 text-muted-foreground transition-colors hover:text-foreground ${
                  viewMode === "grid" ? "bg-surface text-foreground shadow-xs" : ""
                }`}
                title="Tampilan Grid (Card)"
                aria-label="Tampilan Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded p-1 text-muted-foreground transition-colors hover:text-foreground ${
                  viewMode === "list" ? "bg-surface text-foreground shadow-xs" : ""
                }`}
                title="Tampilan Tabel (List)"
                aria-label="Tampilan List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah</span>
            </Button>
          </div>
        </div>

        {/* Domain View Area */}
        <div className="p-5">
          {sites.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : sites.isError ? (
            <ErrorState
              title="Daftar domain gagal dimuat"
              description="Data domain tidak dapat diambil dari server."
              onRetry={() => void sites.refetch()}
            />
          ) : siteList.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="Belum ada domain dipantau"
              description="Tambahkan website atau backend API Anda untuk mulai memantau exception dengan @webwatch/sdk."
              action={
                <Button onClick={() => setAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Tambah Domain Pertama</span>
                </Button>
              }
            />
          ) : filteredSites.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada domain yang cocok dengan pencarian "{domainFilter}".
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID / CARD VIEW ── */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site) => {
                const logCount = site.log_count ?? 0;
                const capacityPct = Math.min(100, Math.round((logCount / 100) * 100));
                return (
                  <Link
                    key={site.id}
                    to="/sites/$id"
                    params={{ id: site.id }}
                    className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface p-4 transition-all duration-150 hover:border-border-strong hover:shadow-xs"
                  >
                    <div>
                      {/* Top identity & status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-display text-xs font-bold text-foreground">
                            {hostInitial(site.url)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {site.name || hostLabel(site.url)}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {site.url}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={site.is_active ? "success" : "neutral"}
                          className="shrink-0 text-[10px]"
                        >
                          {site.is_active ? "Aktif" : "Jeda"}
                        </Badge>
                      </div>

                      {/* Log Storage Progress (Cap 100) */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>Kapasitas Log</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            {logCount} / 100
                          </span>
                        </div>
                        <Progress value={capacityPct} className="mt-1.5 h-1.5" />
                      </div>
                    </div>

                    {/* Bottom footer: last error & link */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span className="truncate text-[11px]">
                        {site.last_event_at
                          ? `Error: ${formatRelativeTime(site.last_event_at)}`
                          : "Belum ada error"}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:translate-x-0.5 transition-transform text-[11px]">
                        Pemantauan
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* ── LIST / TABLE VIEW (Cloudflare Sites style) ── */
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[300px]">Domain & Hostname</TableHead>
                    <TableHead>Status Ingest</TableHead>
                    <TableHead>Kapasitas Log (Maks 100)</TableHead>
                    <TableHead>Kejadian Terakhir</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => {
                    const logCount = site.log_count ?? 0;
                    return (
                      <TableRow key={site.id} className="group hover:bg-muted/20">
                        <TableCell>
                          <Link
                            to="/sites/$id"
                            params={{ id: site.id }}
                            className="flex items-center gap-2.5 font-medium text-foreground hover:underline"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted font-display text-[10px] font-bold">
                              {hostInitial(site.url)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {site.name || hostLabel(site.url)}
                              </p>
                              <p className="truncate font-mono text-[10px] text-muted-foreground">
                                {site.url}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={site.is_active ? "success" : "neutral"}
                            className="text-[10px]"
                          >
                            {site.is_active ? "Aktif" : "Jeda"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {logCount} / 100 log
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatRelativeTime(site.last_event_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <Link to="/sites/$id" params={{ id: site.id }}>
                              <span>Buka</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION: Semua Exception Terbaru (Executive Global Feed) ── */}
      <section className="panel flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Semua Error Terakhir
            </h2>
            <Badge variant="neutral" className="font-mono text-xs">
              {filteredEvents.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Filter pesan / URL..."
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs shrink-0">
              <Link to="/apm">Lihat Semua di APM →</Link>
            </Button>
          </div>
        </div>

        <div className="p-5">
          {stats.isPending ? (
            <ul className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-20 rounded-lg" />
                </li>
              ))}
            </ul>
          ) : stats.isError ? (
            <ErrorState
              title="Log exception gagal dimuat"
              description="Tidak dapat mengambil log exception terbaru dari server."
              onRetry={() => void stats.refetch()}
            />
          ) : events.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Belum ada exception yang terekam"
              description="Aplikasi Anda berjalan aman atau SDK belum mulai mengirim log error."
            />
          ) : filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada log yang cocok dengan filter "{eventFilter}".
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredEvents.slice(0, 10).map((ev) => {
                const isExpanded = expandedEvents[ev.id] ?? false;
                const isError = isErrorEvent(ev.event_type);
                return (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                  >
                    {/* Header line: site link, badges, timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/sites/$id"
                          params={{ id: ev.site_id }}
                          className="font-display text-sm font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {ev.site_name}
                        </Link>
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

                      <time
                        className="font-mono text-xs tabular-nums text-muted-foreground"
                        dateTime={ev.created_at}
                      >
                        {formatRelativeTime(ev.created_at)}
                      </time>
                    </div>

                    {/* Error message */}
                    <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>

                    {/* Method & URL endpoint */}
                    {(ev.method || ev.url) && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {[ev.method, ev.url].filter(Boolean).join(" ")}
                      </p>
                    )}

                    {/* Stack trace toggle button */}
                    {ev.stack_trace && (
                      <div className="mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpand(ev.id)}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              <span>Sembunyikan Stack Trace</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              <span>Lihat Stack Trace</span>
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <pre className="mt-2 max-h-60 w-full overflow-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                            {ev.stack_trace}
                          </pre>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── DIALOG: Tambah Domain Baru ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="font-display">Tambah Domain Baru</DialogTitle>
              <DialogDescription>
                Daftarkan domain atau backend service untuk mulai mengumpulkan log APM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="domain-url" className="text-xs font-semibold">
                  URL Domain <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="domain-url"
                  placeholder="https://app.example.com atau api.domain.id"
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Protokol https:// akan otomatis ditambahkan jika tidak ditulis.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="domain-name" className="text-xs font-semibold">
                  Nama Tampilan (Opsional)
                </Label>
                <Input
                  id="domain-name"
                  placeholder="e.g. Production Backend, Web App"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {urlError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {urlError}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={addDomainMutation.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={addDomainMutation.isPending} className="gap-2">
                {addDomainMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <span>Daftarkan Domain</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
