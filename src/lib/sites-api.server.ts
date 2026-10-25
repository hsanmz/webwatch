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
  is_active: boolean;
  verification_token: string | null;
  verification_status: string;
  created_at: string;
};

type SiteDbRow = {
  id: string;
  name: string | null;
  url: string;
  is_active: number;
  verification_token: string | null;
  verification_status: string;
  created_at: string;
};

function mapSite(row: SiteDbRow): SiteRow {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    is_active: toBool(row.is_active),
    verification_token: row.verification_token,
    verification_status: row.verification_status,
    created_at: row.created_at,
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

export async function listSites(request: Request): Promise<Response> {
  const denied = await userFor(request);
  if (denied) return denied;
  const user = (await requireUser(request))!;
  try {
    const { results } = await db()
      .prepare(
        `SELECT id, name, url, is_active, verification_token, verification_status, created_at
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
};

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
        `INSERT INTO sites (id, user_id, url, name, verification_token, verification_status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
      )
      .bind(id, user.id, url, new URL(url).hostname, token)
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

type UpdateSiteBody = {
  id?: unknown;
  name?: unknown;
  is_active?: unknown;
};

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
      .prepare("SELECT is_active FROM sites WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(id, user.id)
      .first<{ is_active: number }>();
    if (!current) return json({ error: "not_found" }, 404);

    const name = body.name ?? undefined;
    const isActive =
      body.is_active !== undefined ? (body.is_active === true ? 1 : 0) : current.is_active;

    if (name !== undefined) {
      await db()
        .prepare("UPDATE sites SET name = ?, is_active = ? WHERE id = ? AND user_id = ?")
        .bind(typeof name === "string" && name.trim() ? name.trim() : null, isActive, id, user.id)
        .run();
    } else {
      await db()
        .prepare("UPDATE sites SET is_active = ? WHERE id = ? AND user_id = ?")
        .bind(isActive, id, user.id)
        .run();
    }
    return json({ ok: true });
  } catch (error) {
    console.error("[updateSite] DB error:", error);
    return json({ error: "server_error" }, 500);
  }
}

type DeleteSiteBody = { id?: unknown };

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
        `SELECT id, name, url, is_active, verification_token, verification_status, created_at
         FROM sites WHERE id = ? AND user_id = ? LIMIT 1`,
      )
      .bind(id, user.id)
      .first<SiteDbRow>();
    if (!site) return json({ error: "not_found" }, 404);

    const { results: eventsDb } = await db()
      .prepare(
        "SELECT id, environment, event_type, message, stack_trace, url, method, user_agent, created_at FROM apm_events WHERE site_id = ? ORDER BY created_at DESC LIMIT 100",
      )
      .bind(site.id)
      .all<ApmEventRow>();

    return json({ site: mapSite(site), events: eventsDb ?? [] });
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
    const timer = setTimeout(() => controller.abort(), 10000);

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
