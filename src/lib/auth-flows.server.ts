import { db } from "./wrangler-env";
import {
  activeLinkForEmail,
  clearSessionCookie,
  createLinkForEmail,
  createOtpForEmail,
  destroySession,
  ensureUser,
  issueSession,
  lastOtpAge,
  OTP_RESEND_MIN_MS,
  requireUser,
  sessionCookie,
  verifyOtp,
} from "./auth.server";
import { botUsername, formatOtpMessage, sendTelegram } from "./telegram.server";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

function deepLinkFor(token: string): string {
  const username = botUsername();
  return `https://t.me/${username}?start=${token}`;
}

export async function requestOtp(request: Request): Promise<Response> {
  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "email_invalid" }, 400);

  const now = new Date().toISOString();
  await db().prepare("DELETE FROM telegram_links WHERE expires_at < ?").bind(now).run();

  const user = await db()
    .prepare("SELECT id, chat_id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<{ id: string; chat_id: string | null }>();

  if (user?.chat_id) {
    const age = await lastOtpAge(email);
    if (age != null && age < OTP_RESEND_MIN_MS) {
      return json(
        { error: "rate_limited", retryAfter: Math.ceil((OTP_RESEND_MIN_MS - age) / 1000) },
        429,
      );
    }
    const code = await createOtpForEmail(email);
    await sendTelegram(user.chat_id, formatOtpMessage(email, code));
    return json({ status: "sent", email });
  }

  const token = (await activeLinkForEmail(email))?.token ?? (await createLinkForEmail(email));
  return json({ status: "need_link", email, deepLink: deepLinkFor(token) });
}

export async function linkStatus(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email) return json({ error: "email_invalid" }, 400);

  const user = await db()
    .prepare("SELECT chat_id FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<{ chat_id: string | null }>();
  if (user?.chat_id) return json({ status: "linked", email });

  const pending = await activeLinkForEmail(email);
  return pending ? json({ status: "pending", email }) : json({ status: "expired", email });
}

export async function verifyOtpLogin(request: Request): Promise<Response> {
  let body: { email?: unknown; code?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; code?: unknown };
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code : "";
  if (!email) return json({ error: "email_invalid" }, 400);
  if (!/^\d{6}$/.test(code.trim())) return json({ error: "code_invalid" }, 400);

  const ok = await verifyOtp(email, code);
  if (!ok) return json({ error: "code_invalid" }, 400);

  const user = await ensureUser(email);
  const { token } = await issueSession(user.id);

  const response = json({ ok: true, user: { id: user.id, email: user.email } });
  response.headers.set("set-cookie", sessionCookie(token));
  return response;
}

export async function currentUser(request: Request): Promise<Response> {
  const user = await requireUser(request);
  if (!user) return json({ user: null });
  return json({
    user: { id: user.id, email: user.email, chat_id: user.chat_id, tg_username: user.tg_username },
  });
}

export async function logout(request: Request): Promise<Response> {
  await destroySession(request);
  const response = json({ ok: true });
  response.headers.set("set-cookie", clearSessionCookie());
  return response;
}
