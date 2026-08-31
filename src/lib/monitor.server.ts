import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  formatDownMessage,
  formatRecoveryMessage,
  formatSslWarningMessage,
  humanDuration,
  sendTelegram,
} from "./telegram.server";
import { evaluateStatus, isInCooldown, shouldWarnSsl } from "./monitor-core";

const REQUEST_TIMEOUT_MS = 10_000;
const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000; // anti-flapping
const SSL_WARN_THRESHOLD_DAYS = 7;
const SSL_WARN_REPEAT_MS = 24 * 60 * 60 * 1000; // peringatan max 1x per hari per situs
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

// Best-effort SSL expiry inspection. Returns null when the runtime does not
// support node:tls or the certificate could not be fetched — the check is
// skipped instead of failing the site.
async function checkSslExpiry(rawUrl: string): Promise<number | null> {
  try {
    const { connect } = await import("node:tls");
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const port = parsed.port ? Number(parsed.port) : 443;

    return await new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (value: number | null) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      const socket: import("node:tls").TLSSocket = connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      });
      const timer = setTimeout(() => {
        socket.destroy();
        finish(null);
      }, 5000);

      socket.once("secureConnect", () => {
        clearTimeout(timer);
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) {
          socket.end();
          finish(null);
          return;
        }
        const daysLeft = (new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000;
        socket.end();
        finish(daysLeft);
      });
      socket.once("error", () => {
        clearTimeout(timer);
        finish(null);
      });
    });
  } catch {
    return null;
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
  check_ssl: boolean;
  current_status: string;
  consecutive_failures: number;
  last_checked_at: string | null;
  last_notified_at: string | null;
  ssl_last_warned_at: string | null;
};

export async function checkSite(site: SiteRow) {
  const result = await probe(site.url, site.check_keyword);
  const now = new Date();
  const nowMs = now.getTime();
  const label = site.name || site.url;

  let isUp = result.isUp;
  let errorMessage = result.errorMessage;

  let sslDaysLeft: number | null = null;
  if (site.check_ssl) {
    sslDaysLeft = await checkSslExpiry(site.url);
    if (isUp && sslDaysLeft !== null && sslDaysLeft <= 0) {
      isUp = false;
      errorMessage = "Sertifikat SSL sudah kedaluwarsa";
    }
  }

  await supabaseAdmin.from("checks").insert({
    site_id: site.id,
    status_code: result.statusCode,
    response_time_ms: result.responseTimeMs,
    is_up: isUp,
    error_message: errorMessage,
  });

  const evaluation = evaluateStatus({
    currentStatus: site.current_status,
    isUp,
    consecutiveFailures: site.consecutive_failures,
    failThreshold: site.fail_threshold,
  });

  const cooldownActive = isInCooldown(site.last_notified_at, nowMs, NOTIFY_COOLDOWN_MS);
  let notified = false;
  let sslWarned = false;

  if (evaluation.becameDown) {
    await supabaseAdmin.from("incidents").insert({
      site_id: site.id,
      error_message: errorMessage,
    });
    if (!cooldownActive) {
      const chatId = await chatIdFor(site.user_id);
      if (chatId) {
        await sendTelegram(
          chatId,
          formatDownMessage({
            label,
            url: site.url,
            errorMessage: errorMessage ?? "unknown",
            failures: evaluation.consecutiveFailures,
            at: now.toISOString(),
          }),
        );
        notified = true;
      }
    }
  } else if (evaluation.becameUp) {
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
      downtime = humanDuration(nowMs - new Date(incident.started_at).getTime());
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
          formatRecoveryMessage({ label, url: site.url, downtime, at: now.toISOString() }),
        );
        notified = true;
      }
    }
  }

  if (
    isUp &&
    sslDaysLeft !== null &&
    shouldWarnSsl({
      daysLeft: sslDaysLeft,
      lastWarnedAt: site.ssl_last_warned_at,
      now: nowMs,
      warnThresholdDays: SSL_WARN_THRESHOLD_DAYS,
      repeatAfterMs: SSL_WARN_REPEAT_MS,
    })
  ) {
    const chatId = await chatIdFor(site.user_id);
    if (chatId) {
      await sendTelegram(
        chatId,
        formatSslWarningMessage({
          label,
          url: site.url,
          daysLeft: sslDaysLeft,
          at: now.toISOString(),
        }),
      );
      sslWarned = true;
    }
  }

  await supabaseAdmin
    .from("sites")
    .update({
      current_status: evaluation.status,
      consecutive_failures: evaluation.consecutiveFailures,
      last_checked_at: now.toISOString(),
      ...(notified ? { last_notified_at: now.toISOString() } : {}),
      ...(sslWarned ? { ssl_last_warned_at: now.toISOString() } : {}),
    })
    .eq("id", site.id);

  return { siteId: site.id, up: isUp, status: evaluation.status };
}

export async function runDueChecks() {
  const { data: sites, error } = await supabaseAdmin
    .from("sites")
    .select(
      "id,user_id,name,url,interval_seconds,fail_threshold,check_keyword,check_ssl,current_status,consecutive_failures,last_checked_at,last_notified_at,ssl_last_warned_at",
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
  await supabaseAdmin
    .from("incidents")
    .delete()
    .lt("started_at", cutoff)
    .not("resolved_at", "is", null);
}
