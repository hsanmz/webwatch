import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronUp, RefreshCw, Search } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/apm")({
  head: () => ({ meta: [{ title: "Log Error APM - WebWatch" }] }),
  component: ApmIssues,
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

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return api<{ events: ApmEventRow[] }>("/api/sites/dashboard");
    },
  });
}

function isErrorEvent(eventType: string): boolean {
  const lower = eventType.toLowerCase();
  return lower.includes("error") || lower.includes("rejection") || lower.includes("fatal");
}

function formatRelativeTime(value: string): string {
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ApmIssues() {
  const { data: statsData, isPending, isError, isFetching, refetch } = useDashboardStats();
  const events = useMemo(() => statsData?.events ?? [], [statsData?.events]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedTrace, setExpandedTrace] = useState<Record<string, boolean>>({});

  const toggleTrace = (id: string) => {
    setExpandedTrace((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Semantic filter across multiple fields ── */
  const filteredEvents = useMemo(() => {
    let list = events;

    if (selectedEnv !== "all") {
      list = list.filter((e) => e.environment.toLowerCase() === selectedEnv.toLowerCase());
    }

    if (selectedType === "error") {
      list = list.filter((e) => isErrorEvent(e.event_type));
    } else if (selectedType === "non-error") {
      list = list.filter((e) => !isErrorEvent(e.event_type));
    }

    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
      list = list.filter((ev) => {
        const text =
          `${ev.site_name} ${ev.event_type} ${ev.environment} ${ev.message} ${ev.url ?? ""} ${ev.method ?? ""} ${ev.stack_trace ?? ""}`.toLowerCase();
        return tokens.every((tok) => text.includes(tok));
      });
    }

    return list;
  }, [events, searchQuery, selectedEnv, selectedType]);

  return (
    <>
      <PageHeader
        eyebrow="APM Telemetry"
        title="Log Error & Exception"
        description="Stream error dan exception dari seluruh domain aplikasi Anda secara terpusat."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching ? "animate-spin" : "")} />
            <span>Segarkan</span>
          </Button>
        }
      />

      <section className="panel overflow-hidden">
        {/* Panel header */}
        <div className="flex flex-col gap-3 border-b border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-foreground">
              Semua Exception Masuk
            </h2>
            <Badge variant="neutral" className="font-mono text-xs">
              {filteredEvents.length} / {events.length}
            </Badge>
          </div>

          {/* Semantic search and filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:w-72 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pencarian semantik (pesan, URL, stack, domain)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

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
                Semua
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
                Kritis
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

        <div className="p-5">
          {isPending ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-28 rounded-lg" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <ErrorState
              className="min-h-[180px]"
              title="Log error gagal dimuat"
              description="Data exception tidak bisa diambil dari server."
              onRetry={() => void refetch()}
            />
          ) : events.length === 0 ? (
            <EmptyState
              className="min-h-[180px]"
              icon={Activity}
              title="Belum ada error tercatat"
              description="Belum ada exception yang masuk dari SDK WebWatch pada seluruh domain yang kamu pantau."
            />
          ) : filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada log yang cocok dengan kata kunci "{searchQuery}".
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredEvents.map((ev) => {
                const isExpanded = expandedTrace[ev.id] ?? false;
                const isError = isErrorEvent(ev.event_type);
                return (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                  >
                    {/* Top row: site link, badges, timestamps */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                      <div className="flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                        <span title={formatDateTime(ev.created_at)}>
                          {formatRelativeTime(ev.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="mt-2 text-sm font-medium text-foreground">{ev.message}</p>

                    {/* Request info */}
                    {(ev.method || ev.url) && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {[ev.method, ev.url].filter(Boolean).join(" ")}
                      </p>
                    )}

                    {/* Stack trace toggle */}
                    {ev.stack_trace && (
                      <div className="mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTrace(ev.id)}
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
                          <pre className="mt-2 max-h-80 w-full overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground">
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
    </>
  );
}
