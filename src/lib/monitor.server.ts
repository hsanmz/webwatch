import { db, type AppEnv } from "./wrangler-env";
import { newId } from "./auth.server";
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
const MAX_SITES_PER_RUN = 200;

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
  const row = await db()
    .prepare("SELECT chat_id FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ chat_id: string | null }>();
  return row?.chat_id ?? null;
}

function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value));
  return Number.isFinite(n) ? n : fallback;
}

export type SiteRow = {
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

type SiteDbRow = {
  id: string;
  user_id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  check_ssl: number;
  current_status: string;
  consecutive_failures: number;
  last_checked_at: string | null;
  last_notified_at: string | null;
  ssl_last_warned_at: string | null;
};

function mapSite(row: SiteDbRow): SiteRow {
  return {
    ...row,
    check_ssl: toBool(row.check_ssl),
    interval_seconds: toInt(row.interval_seconds, 300),
    fail_threshold: toInt(row.fail_threshold, 2),
    consecutive_failures: toInt(row.consecutive_failures, 0),
  };
}

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

  await db()
    .prepare(
      "INSERT INTO checks (id, site_id, status_code, response_time_ms, is_up, error_message) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(newId(), site.id, result.statusCode, result.responseTimeMs, isUp ? 1 : 0, errorMessage)
    .run();

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
    await db()
      .prepare("INSERT INTO incidents (id, site_id, error_message) VALUES (?, ?, ?)")
      .bind(newId(), site.id, errorMessage)
      .run();
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
    const incident = await db()
      .prepare(
        "SELECT id, started_at FROM incidents WHERE site_id = ? AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1",
      )
      .bind(site.id)
      .first<{ id: string; started_at: string }>();

    let downtime = "tidak diketahui";
    if (incident) {
      downtime = humanDuration(nowMs - new Date(incident.started_at).getTime());
      await db()
        .prepare("UPDATE incidents SET resolved_at = ? WHERE id = ?")
        .bind(now.toISOString(), incident.id)
        .run();
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

  await db()
    .prepare(
      `UPDATE sites SET
        current_status = ?,
        consecutive_failures = ?,
        last_checked_at = ?,
        last_notified_at = COALESCE(?, last_notified_at),
        ssl_last_warned_at = COALESCE(?, ssl_last_warned_at)
       WHERE id = ?`,
    )
    .bind(
      evaluation.status,
      evaluation.consecutiveFailures,
      now.toISOString(),
      notified ? now.toISOString() : null,
      sslWarned ? now.toISOString() : null,
      site.id,
    )
    .run();

  return { siteId: site.id, up: isUp, status: evaluation.status };
}

export async function runDueChecks() {
  const { results } = await db()
    .prepare(
      `SELECT id, user_id, name, url, interval_seconds, fail_threshold, check_keyword, check_ssl,
              current_status, consecutive_failures, last_checked_at, last_notified_at, ssl_last_warned_at
       FROM sites
       WHERE is_active = 1
       ORDER BY last_checked_at ASC
       LIMIT ?`,
    )
    .bind(MAX_SITES_PER_RUN)
    .all<SiteDbRow>();

  const now = Date.now();
  const due = (results ?? [])
    .filter((site) => {
      if (!site.last_checked_at) return true;
      return now - new Date(site.last_checked_at).getTime() >= site.interval_seconds * 1000;
    })
    .map(mapSite);

  const checkedResults = [];
  const CHUNK_SIZE = 15;
  for (let i = 0; i < due.length; i += CHUNK_SIZE) {
    const chunk = due.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map((site) =>
        checkSite(site).catch((err) => {
          console.error(`[monitor] check failed for ${site.id}`, err);
          return null;
        }),
      ),
    );
    checkedResults.push(...results);
  }

  const checked = checkedResults.filter((c) => c !== null);
  return checked;
}

export async function purgeOldData() {
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  await db().prepare("DELETE FROM checks WHERE checked_at < ?").bind(cutoff).run();
  await db()
    .prepare("DELETE FROM incidents WHERE started_at < ? AND resolved_at IS NOT NULL")
    .bind(cutoff)
    .run();
}

// Runs on the Cloudflare scheduled trigger (every minute) and on the manual
// admin endpoint. `ctx` is only used on scheduled events.
export async function runScheduledMonitor(_ctx?: unknown) {
  const checked = await runDueChecks();
  if (checked.length) console.log(`[monitor] checked ${checked.length} sites`);

  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() < 5) {
    await purgeOldData();
  }
  return checked.length;
}

export type { AppEnv };
