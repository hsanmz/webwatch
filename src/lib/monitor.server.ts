import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { escapeHtml, humanDuration, sendTelegram } from "./telegram.server";

const REQUEST_TIMEOUT_MS = 10_000;
const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000; // anti-flapping
const MAX_SITES_PER_RUN = 60;

export type ProbeResult = {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number;
  errorMessage: string | null;
};

export async function probe(url: string, keyword: string | null): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "WebWatch/1.0 (+uptime monitor)" },
    });
    const elapsed = Date.now() - started;

    if (!res.ok) {
      return {
        isUp: false,
        statusCode: res.status,
        responseTimeMs: elapsed,
        errorMessage: `HTTP ${res.status}`,
      };
    }

    if (keyword) {
      const body = await res.text();
      if (!body.includes(keyword)) {
        return {
          isUp: false,
          statusCode: res.status,
          responseTimeMs: Date.now() - started,
          errorMessage: `Keyword "${keyword}" tidak ditemukan`,
        };
      }
    }

    return { isUp: true, statusCode: res.status, responseTimeMs: elapsed, errorMessage: null };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      isUp: false,
      statusCode: null,
      responseTimeMs: Date.now() - started,
      errorMessage: aborted ? "Timeout (>10s)" : ((error as Error)?.message ?? "Request gagal"),
    };
  }
}

async function chatIdFor(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("telegram_accounts")
    .select("chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.chat_id ?? null;
}

type SiteRow = {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  current_status: string;
  consecutive_failures: number;
  last_checked_at: string | null;
  last_notified_at: string | null;
};

export async function checkSite(site: SiteRow) {
  const result = await probe(site.url, site.check_keyword);
  const now = new Date();
  const label = escapeHtml(site.name || site.url);

  await supabaseAdmin.from("checks").insert({
    site_id: site.id,
    status_code: result.statusCode,
    response_time_ms: result.responseTimeMs,
    is_up: result.isUp,
    error_message: result.errorMessage,
  });

  const cooldownActive =
    site.last_notified_at != null &&
    now.getTime() - new Date(site.last_notified_at).getTime() < NOTIFY_COOLDOWN_MS;

  let status = site.current_status;
  let failures = result.isUp ? 0 : site.consecutive_failures + 1;
  let notified = false;

  if (!result.isUp && failures >= site.fail_threshold && site.current_status !== "down") {
    status = "down";
    await supabaseAdmin.from("incidents").insert({
      site_id: site.id,
      error_message: result.errorMessage,
    });
    if (!cooldownActive) {
      const chatId = await chatIdFor(site.user_id);
      if (chatId) {
        await sendTelegram(
          chatId,
          [
            `🔴 <b>DOWN</b> — ${label}`,
            `<code>${escapeHtml(site.url)}</code>`,
            ``,
            `Error: ${escapeHtml(result.errorMessage ?? "unknown")}`,
            `Gagal berturut-turut: ${failures}x`,
            `Waktu: ${now.toISOString().replace("T", " ").slice(0, 19)} UTC`,
          ].join("\n"),
        );
        notified = true;
      }
    }
  } else if (result.isUp && site.current_status === "down") {
    status = "up";
    const { data: incident } = await supabaseAdmin
      .from("incidents")
      .select("id, started_at")
      .eq("site_id", site.id)
      .is("resolved_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let downtime = "tidak diketahui";
    if (incident) {
      downtime = humanDuration(now.getTime() - new Date(incident.started_at).getTime());
      await supabaseAdmin
        .from("incidents")
        .update({ resolved_at: now.toISOString() })
        .eq("id", incident.id);
    }

    if (!cooldownActive) {
      const chatId = await chatIdFor(site.user_id);
      if (chatId) {
        await sendTelegram(
          chatId,
          [
            `🟢 <b>RECOVERED</b> — ${label}`,
            `<code>${escapeHtml(site.url)}</code>`,
            ``,
            `Durasi downtime: ${downtime}`,
            `Pulih: ${now.toISOString().replace("T", " ").slice(0, 19)} UTC`,
          ].join("\n"),
        );
        notified = true;
      }
    }
  } else if (result.isUp) {
    status = "up";
  }

  await supabaseAdmin
    .from("sites")
    .update({
      current_status: status,
      consecutive_failures: failures,
      last_checked_at: now.toISOString(),
      ...(notified ? { last_notified_at: now.toISOString() } : {}),
    })
    .eq("id", site.id);

  return { siteId: site.id, up: result.isUp, status };
}

export async function runDueChecks() {
  const { data: sites, error } = await supabaseAdmin
    .from("sites")
    .select(
      "id,user_id,name,url,interval_seconds,fail_threshold,check_keyword,current_status,consecutive_failures,last_checked_at,last_notified_at",
    )
    .eq("is_active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SITES_PER_RUN);

  if (error) throw error;

  const now = Date.now();
  const due = (sites ?? []).filter((site) => {
    if (!site.last_checked_at) return true;
    return now - new Date(site.last_checked_at).getTime() >= site.interval_seconds * 1000;
  });

  const results = [];
  for (const site of due) {
    try {
      results.push(await checkSite(site as SiteRow));
    } catch (err) {
      console.error(`[monitor] check failed for ${site.id}`, err);
    }
  }
  return results;
}

export async function purgeOldData() {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  await supabaseAdmin.from("checks").delete().lt("checked_at", cutoff);
  await supabaseAdmin.from("incidents").delete().lt("started_at", cutoff).not("resolved_at", "is", null);
}
