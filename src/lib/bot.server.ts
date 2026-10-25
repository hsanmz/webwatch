import { db } from "./wrangler-env";
import { ensureUser, newId } from "./auth.server";
import { escapeHtml, sendTelegram } from "./telegram.server";

const HELP = [
  "<b>WebWatch APM</b> — perintah yang tersedia:",
  "/addsite <url> — tambah situs untuk menerima log error",
  "/listsite — daftar situs",
  "/removesite <id> — hapus situs",
  "/pause <id> — hentikan menerima log error",
  "/resume <id> — lanjutkan menerima log error",
].join("\n");

function shortId(id: string) {
  return id.slice(0, 8);
}

async function userIdForChat(chatId: string): Promise<string | null> {
  const row = await db()
    .prepare("SELECT id FROM users WHERE chat_id = ? LIMIT 1")
    .bind(chatId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

async function findSite(userId: string, ref: string) {
  const { results } = await db()
    .prepare(
      "SELECT id, name, url, is_active, verification_status FROM sites WHERE user_id = ? AND id LIKE ? LIMIT 2",
    )
    .bind(userId, `${ref}%`)
    .all<{
      id: string;
      name: string | null;
      url: string;
      is_active: number;
      verification_status: string;
    }>();
  if (!results || results.length !== 1) return null;
  return results[0];
}

function statusIcon(status: string, active: number) {
  if (!active) return "⏸️";
  if (status === "verified") return "✅";
  return "⏳";
}

async function handleStart(chatId: string, arg: string | undefined, username: string | null) {
  if (!arg) {
    const linked = await userIdForChat(chatId);
    return linked
      ? `Akun ini sudah terhubung ✅\n\n${HELP}`
      : "Halo! Buka dashboard WebWatch, masukkan email, lalu ikuti link untuk menghubungkan chat ini. Kode masuk akan dikirim ke sini.";
  }

  const link = await db()
    .prepare("SELECT token, email, status, expires_at FROM telegram_links WHERE token = ? LIMIT 1")
    .bind(arg)
    .first<{ token: string; email: string; status: string; expires_at: string }>();

  if (!link || link.status !== "pending" || new Date(link.expires_at).getTime() < Date.now()) {
    return "❌ Token tidak valid atau sudah kedaluwarsa. Buka lagi halaman login WebWatch untuk membuat link baru.";
  }

  await db()
    .prepare(
      "UPDATE telegram_links SET chat_id = ?, tg_username = ?, status = 'linked' WHERE token = ?",
    )
    .bind(chatId, username, link.token)
    .run();
  await ensureUser(link.email);

  return `✅ Telegram terhubung untuk <b>${escapeHtml(link.email)}</b>. Kembali ke halaman login WebWatch untuk menerima kode masuk di chat ini.\n\n${HELP}`;
}

async function handleAddSite(userId: string, args: string[]) {
  const raw = args[0];
  if (!raw) return "Format: /addsite <url>";
  const guess = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(guess);
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
      return "URL tidak valid (internal/private IPs ditolak).";
    }

    if (!host.includes(".")) return "URL tidak valid.";
  } catch {
    return "URL tidak valid.";
  }

  const url = parsed.toString();
  const taken = await db()
    .prepare("SELECT id FROM sites WHERE url = ? LIMIT 1")
    .bind(url)
    .first<{ id: string }>();
  if (taken) return "❌ URL sudah dipantau akun lain.";

  const id = newId();
  try {
    await db()
      .prepare(
        "INSERT INTO sites (id, user_id, url, name, verification_token, verification_status) VALUES (?, ?, ?, ?, ?, 'pending')",
      )
      .bind(id, userId, url, parsed.hostname, newId())
      .run();
  } catch {
    return "❌ URL sudah dipantau akun lain.";
  }
  return `✅ Ditambahkan: <code>${escapeHtml(url)}</code>\nID: <code>${shortId(id)}</code>\nStatus: ⏳ Menunggu verifikasi`;
}

async function handleList(userId: string) {
  const { results } = await db()
    .prepare(
      "SELECT id, name, url, is_active, verification_status FROM sites WHERE user_id = ? ORDER BY created_at ASC",
    )
    .bind(userId)
    .all<{
      id: string;
      name: string | null;
      url: string;
      is_active: number;
      verification_status: string;
    }>();
  if (!results?.length) return "Belum ada situs. Tambah dengan /addsite <url>";
  return results
    .map(
      (s) =>
        `${statusIcon(s.verification_status, s.is_active)} <b>${escapeHtml(s.name || s.url)}</b>\n<code>${shortId(s.id)}</code> · ${escapeHtml(s.url)}`,
    )
    .join("\n\n");
}

export async function handleTelegramUpdate(update: {
  message?: { chat?: { id?: number }; from?: { username?: string }; text?: string };
}) {
  const message = update.message;
  const chatId = message?.chat?.id != null ? String(message.chat.id) : null;
  const text = message?.text?.trim();
  if (!chatId || !text?.startsWith("/")) return;

  const [rawCommand = "", ...args] = text.split(/\s+/);
  const command = (rawCommand.split("@")[0] ?? "").toLowerCase();

  if (command === "/start") {
    return sendTelegram(
      chatId,
      await handleStart(chatId, args[0], message?.from?.username ?? null),
    );
  }

  const userId = await userIdForChat(chatId);
  if (!userId) {
    return sendTelegram(
      chatId,
      "Akun ini belum terhubung. Buka dashboard WebWatch dan ikuti link di halaman login.",
    );
  }

  let reply: string;
  switch (command) {
    case "/help":
      reply = HELP;
      break;
    case "/addsite":
      reply = await handleAddSite(userId, args);
      break;
    case "/listsite":
      reply = await handleList(userId);
      break;
    case "/removesite": {
      const site = args[0] ? await findSite(userId, args[0]) : null;
      if (!site) reply = "Format: /removesite <id>";
      else {
        await db()
          .prepare("DELETE FROM sites WHERE id = ? AND user_id = ?")
          .bind(site.id, userId)
          .run();
        reply = `🗑️ Dihapus: ${escapeHtml(site.name || site.url)}`;
      }
      break;
    }
    case "/pause":
    case "/resume": {
      const active = command === "/resume" ? 1 : 0;
      const site = args[0] ? await findSite(userId, args[0]) : null;
      if (!site) reply = `Format: ${command} <id>`;
      else {
        await db()
          .prepare("UPDATE sites SET is_active = ? WHERE id = ? AND user_id = ?")
          .bind(active, site.id, userId)
          .run();
        reply = `${active ? "▶️ Diaktifkan" : "⏸️ Dijeda"}: ${escapeHtml(site.name || site.url)}`;
      }
      break;
    }
    default:
      reply = HELP;
  }

  return sendTelegram(chatId, reply);
}
