import { db } from "./wrangler-env";
import { newId, requireUser } from "./auth.server";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

async function userFor(request: Request): Promise<Response | null> {
  const user = await requireUser(request);
  if (!user) return json({ error: "unauthorized" }, 401);
  return null;
}

function toBool(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

type SiteRow = {
  id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  check_ssl: boolean;
  is_active: boolean;
  current_status: string;
  last_checked_at: string | null;
  verification_token: string | null;
  verification_status: string;
};

type SiteDbRow = {
  id: string;
  name: string | null;
  url: string;
  interval_seconds: number;
  fail_threshold: number;
  check_keyword: string | null;
  check_ssl: number;
  is_active: number;
  current_status: string;
  last_checked_at: string | null;
  verification_token: string | null;
  verification_status: string;
};

function mapSite(row: SiteDbRow): SiteRow {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    interval_seconds: Number(row.interval_seconds),
    fail_threshold: Number(row.fail_threshold),
    check_keyword: row.check_keyword,
    check_ssl: toBool(row.check_ssl),
    is_active: toBool(row.is_active),
    current_status: row.current_status,
    last_checked_at: row.last_checked_at,
    verification_token: row.verification_token,
    verification_status: row.verification_status,
  };
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    // Prevent SSRF: block localhost, local, and private IP ranges
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\.\d+\.\d+\.\d+$/.test(host) ||
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^169\.254\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(host) ||
      /^\[?(::1|fc00:|fe80:)/.test(host)
    ) {
      return null;
    }

    if (!host.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function listSites(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;
  try {
    const { results } = await db()
      .prepare(
        `SELECT id, name, url, interval_seconds, fail_threshold, check_keyword, check_ssl,
                is_active, current_status, last_checked_at, verification_token, verification_status
         FROM sites WHERE user_id = ? ORDER BY created_at ASC`,
      )
      .bind(user.id)
      .all<SiteDbRow>();
    return json({ sites: (results ?? []).map(mapSite) });
  } catch (error) {
    console.error("[listSites] DB error:", error);
    return json({ error: "server_error" }, 500);
  }
}

type CreateSiteBody = {
  url?: unknown;
  intervalMinutes?: unknown;
  failThreshold?: unknown;
  keyword?: unknown;
  ssl?: unknown;
};

type UpdateSiteBody = {
  id?: unknown;
  patch?: Record<string, unknown>;
  is_active?: unknown;
  intervalMinutes?: unknown;
  failThreshold?: unknown;
  keyword?: unknown;
  ssl?: unknown;
};

type DeleteSiteBody = { id?: unknown };

export async function createSite(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;

  let body: CreateSiteBody;
  try {
    body = (await request.json()) as CreateSiteBody;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const url = normalizeUrl(body.url);
  if (!url) return json({ error: "url_invalid" }, 400);

  const taken = await db()
    .prepare("SELECT id FROM sites WHERE url = ? LIMIT 1")
    .bind(url)
    .first<{ id: string }>();
  if (taken) return json({ error: "url_taken" }, 409);

  const id = newId();
  const token = newId();
  try {
    await db()
      .prepare(
        `INSERT INTO sites (id, user_id, url, name, interval_seconds, fail_threshold, check_keyword, check_ssl, verification_token, verification_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      )
      .bind(
        id,
        user.id,
        url,
        new URL(url).hostname,
        clampInt(body.intervalMinutes, 5, 1, 1440) * 60,
        clampInt(body.failThreshold, 2, 1, 100),
        typeof body.keyword === "string" && body.keyword.trim() ? body.keyword.trim() : null,
        body.ssl === true ? 1 : 0,
        token,
      )
      .run();
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("unique") || msg.includes("constraint")) {
      return json({ error: "url_taken" }, 409);
    }
    console.error("[createSite] DB Insert error:", error);
    return json({ error: "server_error" }, 500);
  }
  return json({ ok: true, id });
}

export async function updateSite(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;

  let body: UpdateSiteBody;
  try {
    body = (await request.json()) as UpdateSiteBody;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ error: "id_required" }, 400);

  try {
    const current = await db()
      .prepare(
        "SELECT interval_seconds, fail_threshold, check_keyword, check_ssl, is_active FROM sites WHERE id = ? AND user_id = ? LIMIT 1",
      )
      .bind(id, user.id)
      .first<{
        interval_seconds: number;
        fail_threshold: number;
        check_keyword: string | null;
        check_ssl: number;
        is_active: number;
      }>();
    if (!current) return json({ error: "not_found" }, 404);

    const patch = (body.patch ?? body) as Record<string, unknown>;

    const intervalSeconds =
      patch["intervalMinutes"] !== undefined
        ? clampInt(patch["intervalMinutes"], 5, 1, 1440) * 60
        : current.interval_seconds;
    const failThreshold =
      patch["failThreshold"] !== undefined
        ? clampInt(patch["failThreshold"], 2, 1, 100)
        : current.fail_threshold;
    const keyword =
      patch["keyword"] !== undefined
        ? typeof patch["keyword"] === "string" && patch["keyword"].trim()
          ? patch["keyword"].trim()
          : null
        : current.check_keyword;
    const checkSsl =
      patch["ssl"] !== undefined ? (patch["ssl"] === true ? 1 : 0) : current.check_ssl;
    const isActive =
      patch["is_active"] !== undefined ? (patch["is_active"] === true ? 1 : 0) : current.is_active;

    await db()
      .prepare(
        `UPDATE sites SET
          interval_seconds = ?, fail_threshold = ?, check_keyword = ?, check_ssl = ?, is_active = ?,
          consecutive_failures = CASE WHEN ? = 1 AND is_active = 0 THEN 0 ELSE consecutive_failures END
         WHERE id = ? AND user_id = ?`,
      )
      .bind(intervalSeconds, failThreshold, keyword, checkSsl, isActive, isActive, id, user.id)
      .run();
    return json({ ok: true });
  } catch (error) {
    console.error("[updateSite] DB error:", error);
    return json({ error: "server_error" }, 500);
  }
}

export async function deleteSite(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;

  let body: DeleteSiteBody;
  try {
    body = (await request.json()) as DeleteSiteBody;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ error: "id_required" }, 400);

  try {
    const result = await db()
      .prepare("DELETE FROM sites WHERE id = ? AND user_id = ?")
      .bind(id, user.id)
      .run();
    if (!result.success) return json({ error: "delete_failed" }, 500);
    return json({ ok: true });
  } catch (error) {
    console.error("[deleteSite] DB error:", error);
    return json({ error: "server_error" }, 500);
  }
}

export async function siteDetail(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) return json({ error: "id_required" }, 400);

  try {
    const site = await db()
      .prepare(
        `SELECT id, name, url, current_status, is_active, interval_seconds, fail_threshold, check_keyword, check_ssl, verification_token, verification_status, last_checked_at
         FROM sites WHERE id = ? AND user_id = ? LIMIT 1`,
      )
      .bind(id, user.id)
      .first<SiteDbRow>();
    if (!site) return json({ error: "not_found" }, 404);

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { results: checksDb } = await db()
      .prepare(
        "SELECT id, is_up, status_code, response_time_ms, error_message, checked_at FROM checks WHERE site_id = ? AND checked_at >= ? ORDER BY checked_at DESC LIMIT 5000",
      )
      .bind(site.id, since)
      .all<{
        id: string;
        is_up: number;
        status_code: number | null;
        response_time_ms: number | null;
        error_message: string | null;
        checked_at: string;
      }>();
    const checks = (checksDb ?? [])
      .map((c) => ({
        id: c.id,
        is_up: toBool(c.is_up),
        status_code: c.status_code,
        response_time_ms: c.response_time_ms,
        error_message: c.error_message,
        checked_at: c.checked_at,
      }))
      .reverse();

    const { results: incidents } = await db()
      .prepare(
        "SELECT id, started_at, resolved_at, error_message FROM incidents WHERE site_id = ? ORDER BY started_at DESC LIMIT 20",
      )
      .bind(site.id)
      .all<{
        id: string;
        started_at: string;
        resolved_at: string | null;
        error_message: string | null;
      }>();

    return json({ site: mapSite(site), checks, incidents: incidents ?? [] });
  } catch (error) {
    console.error("[siteDetail] DB error:", error);
    return json({ error: "server_error" }, 500);
  }
}

export async function verifySite(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ error: "id_required" }, 400);

  let site;
  try {
    site = await db()
      .prepare(
        "SELECT url, verification_token, verification_status FROM sites WHERE id = ? AND user_id = ? LIMIT 1",
      )
      .bind(id, user.id)
      .first<{ url: string; verification_token: string | null; verification_status: string }>();
  } catch (error) {
    console.error("[verifySite] DB error:", error);
    return json({ error: "server_error" }, 500);
  }

  if (!site) return json({ error: "not_found" }, 404);
  if (site.verification_status === "verified") return json({ ok: true, status: "verified" });
  if (!site.verification_token) return json({ error: "no_token" }, 400);

  try {
    const checkUrl = new URL("/webwatch-verify.txt", site.url).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(checkUrl, {
      method: "GET",
      headers: { "User-Agent": "WebWatch-Verifier/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return json({ error: "file_not_found" }, 400);
    }
    const text = await res.text();
    if (text.includes(site.verification_token)) {
      try {
        await db()
          .prepare("UPDATE sites SET verification_status = 'verified' WHERE id = ?")
          .bind(id)
          .run();
        return json({ ok: true, status: "verified" });
      } catch (error) {
        console.error("[verifySite] DB update error:", error);
        return json({ error: "server_error" }, 500);
      }
    } else {
      return json({ error: "token_mismatch" }, 400);
    }
  } catch (e) {
    return json({ error: "network_error" }, 400);
  }
}
