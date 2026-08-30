import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, Loader2, Pause, Play, Plus, Send, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { createTelegramLink } from "@/lib/telegram.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
};

function StatusDot({ status, active }: { status: string; active: boolean }) {
  const color = !active
    ? "bg-[var(--paused)]"
    : status === "up"
      ? "bg-[var(--up)]"
      : status === "down"
        ? "bg-[var(--down)]"
        : "bg-muted-foreground";
  const label = !active ? "Paused" : status === "unknown" ? "Belum dicek" : status.toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const linkTelegram = useServerFn(createTelegramLink);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [keyword, setKeyword] = useState("");

  const sites = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select(
          "id,name,url,interval_seconds,fail_threshold,check_keyword,is_active,current_status,last_checked_at",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Site[];
    },
  });

  const telegram = useQuery({
    queryKey: ["telegram-account"],
    queryFn: async () => {
      const { data } = await supabase.from("telegram_accounts").select("chat_id,username").maybeSingle();
      return data;
    },
  });

  const addSite = useMutation({
    mutationFn: async () => {
      const raw = url.trim();
      const full = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(full);
      const { error } = await supabase.from("sites").insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        url: full,
        name: parsed.hostname,
        interval_seconds: Math.max(1, Number(minutes) || 5) * 60,
        check_keyword: keyword.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUrl("");
      setKeyword("");
      toast.success("Situs ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleSite = useMutation({
    mutationFn: async (site: Site) => {
      const { error } = await supabase
        .from("sites")
        .update({ is_active: !site.is_active, consecutive_failures: 0 })
        .eq("id", site.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sites"] }),
  });

  const removeSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Situs dihapus");
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const connect = useMutation({
    mutationFn: async () => await linkTelegram({ data: undefined }),
    onSuccess: (result) => window.open(result.url, "_blank", "noopener"),
    onError: () => toast.error("Gagal membuat link Telegram"),
  });

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-5 w-5" />
            <span className="font-display text-lg font-bold">WebWatch</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">Notifikasi Telegram</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {telegram.data
                ? `Terhubung ke chat ${telegram.data.username ? `@${telegram.data.username}` : telegram.data.chat_id}`
                : "Hubungkan akun Telegram untuk menerima alert down & recovery."}
            </p>
          </div>
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {telegram.data ? "Hubungkan ulang" : "Connect Telegram"}
          </Button>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-base font-semibold">Tambah situs</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              addSite.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://situsku.com"
              />
            </div>
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
              <Label htmlFor="keyword">Keyword (opsional)</Label>
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Login"
              />
            </div>
            <Button type="submit" disabled={addSite.isPending}>
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </form>
        </section>

        <section className="panel divide-y divide-border">
          {sites.isLoading && (
            <p className="p-5 text-sm text-muted-foreground">Memuat situs…</p>
          )}
          {sites.data?.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              Belum ada situs yang dipantau. Tambahkan yang pertama di atas.
            </p>
          )}
          {sites.data?.map((site) => (
            <article key={site.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <Link
                  to="/sites/$id"
                  params={{ id: site.id }}
                  className="truncate text-sm font-semibold hover:text-primary"
                >
                  {site.name || site.url}
                </Link>
                <p className="truncate font-mono text-xs text-muted-foreground">{site.url}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <StatusDot status={site.current_status} active={site.is_active} />
                  <span className="font-mono text-xs text-muted-foreground">
                    tiap {site.interval_seconds / 60}m
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {site.last_checked_at
                      ? `dicek ${new Date(site.last_checked_at).toLocaleTimeString()}`
                      : "belum pernah dicek"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => toggleSite.mutate(site)}>
                  {site.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeSite.mutate(site.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
