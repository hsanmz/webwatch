import { db } from "./wrangler-env";

export const SESSION_COOKIE = "ww_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const LINK_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ACTIVE = 3;
const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MIN_MS = 30_000;

let nodeCrypto: typeof import("node:crypto") | undefined;
async function getNodeCrypto() {
  if (!nodeCrypto) nodeCrypto = await import("node:crypto");
  return nodeCrypto;
}

export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export async function sha256Hex(value: string): Promise<string> {
  const { createHash } = await getNodeCrypto();
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export type SessionUser = {
  id: string;
  email: string;
  chat_id: string | null;
  tg_username: string | null;
};

type SessionJoinRow = {
  id: string;
  email: string;
  chat_id: string | null;
  tg_username: string | null;
};

export async function sessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const hash = await sha256Hex(token);
  try {
    const row = await db()
      .prepare(
        `SELECT u.id, u.email, u.chat_id, u.tg_username
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?
         LIMIT 1`,
      )
      .bind(hash, new Date().toISOString())
      .first<SessionJoinRow>();
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      chat_id: row.chat_id ?? null,
      tg_username: row.tg_username ?? null,
    };
  } catch (error) {
    console.error("[auth] session lookup failed", error);
    return null;
  }
}

export async function requireUser(request: Request): Promise<SessionUser | null> {
  return sessionUserFromRequest(request);
}

export async function issueSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const { randomBytes } = await getNodeCrypto();
  const token = randomBytes(32).toString("hex");
  const hash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(hash, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export async function destroySession(request: Request): Promise<void> {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return;
  const hash = await sha256Hex(token);
  await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(hash).run();
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createOtpForEmail(email: string): Promise<string> {
  const { randomInt } = await getNodeCrypto();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const hash = await sha256Hex(`${email}:${code}`);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const now = new Date().toISOString();

  await db().prepare("DELETE FROM otp_codes WHERE expires_at < ? OR used = 1").bind(now).run();
  const active = await db()
    .prepare("SELECT COUNT(*) AS n FROM otp_codes WHERE email = ? AND used = 0")
    .bind(email)
    .first<{ n: number }>();
  if ((active?.n ?? 0) >= OTP_MAX_ACTIVE) {
    await db()
      .prepare(
        "DELETE FROM otp_codes WHERE id IN (SELECT id FROM otp_codes WHERE email = ? AND used = 0 ORDER BY created_at ASC LIMIT 1)",
      )
      .bind(email)
      .run();
  }

  await db()
    .prepare("INSERT INTO otp_codes (email, code_hash, expires_at) VALUES (?, ?, ?)")
    .bind(email, hash, expiresAt)
    .run();
  return code;
}

export async function lastOtpAge(email: string): Promise<number | null> {
  const row = await db()
    .prepare(
      "SELECT created_at FROM otp_codes WHERE email = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(email, new Date().toISOString())
    .first<{ created_at: string }>();
  if (!row) return null;
  return Date.now() - new Date(row.created_at).getTime();
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  const hash = await sha256Hex(`${email}:${normalized}`);
  const now = new Date().toISOString();
  const row = await db()
    .prepare(
      "SELECT id FROM otp_codes WHERE email = ? AND code_hash = ? AND used = 0 AND expires_at > ? LIMIT 1",
    )
    .bind(email, hash, now)
    .first<{ id: number }>();
  if (!row) {
    await db()
      .prepare(
        "UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ? AND used = 0 AND expires_at > ?",
      )
      .bind(email, now)
      .run();
    const worst = await db()
      .prepare(
        "SELECT MAX(attempts) AS n FROM otp_codes WHERE email = ? AND used = 0 AND expires_at > ?",
      )
      .bind(email, now)
      .first<{ n: number }>();
    if ((worst?.n ?? 0) >= OTP_MAX_ATTEMPTS) {
      await db().prepare("DELETE FROM otp_codes WHERE email = ?").bind(email).run();
    }
    return false;
  }
  await db().prepare("UPDATE otp_codes SET used = 1 WHERE id = ?").bind(row.id).run();
  await db().prepare("DELETE FROM otp_codes WHERE email = ?").bind(email).run();
  return true;
}

type UserRow = {
  id: string;
  email: string;
  chat_id: string | null;
  tg_username: string | null;
};

export async function createLinkForEmail(email: string): Promise<string> {
  const { randomBytes } = await getNodeCrypto();
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
  await db()
    .prepare("INSERT INTO telegram_links (token, email, expires_at) VALUES (?, ?, ?)")
    .bind(token, email, expiresAt)
    .run();
  return token;
}

export async function activeLinkForEmail(email: string): Promise<{ token: string } | null> {
  const now = new Date().toISOString();
  const row = await db()
    .prepare(
      "SELECT token FROM telegram_links WHERE email = ? AND status = 'pending' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(email, now)
    .first<{ token: string }>();
  return row ?? null;
}

export async function linkedChatForEmail(email: string): Promise<string | null> {
  const now = new Date().toISOString();
  const row = await db()
    .prepare(
      "SELECT chat_id FROM telegram_links WHERE email = ? AND status = 'linked' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(email, now)
    .first<{ chat_id: string }>();
  return row?.chat_id ?? null;
}

export async function ensureUser(email: string): Promise<UserRow> {
  const existing = await db()
    .prepare("SELECT id, email, chat_id, tg_username FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<UserRow>();
  if (existing) return existing;

  const link = await db()
    .prepare(
      "SELECT chat_id, tg_username FROM telegram_links WHERE email = ? AND status = 'linked' ORDER BY created_at DESC LIMIT 1",
    )
    .bind(email)
    .first<{ chat_id: string | null; tg_username: string | null }>();

  const id = newId();
  await db()
    .prepare("INSERT INTO users (id, email, chat_id, tg_username) VALUES (?, ?, ?, ?)")
    .bind(id, email, link?.chat_id ?? null, link?.tg_username ?? null)
    .run();
  return { id, email, chat_id: link?.chat_id ?? null, tg_username: link?.tg_username ?? null };
}
