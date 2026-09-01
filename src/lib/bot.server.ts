import { db } from "./wrangler-env";
import { ensureUser, newId } from "./auth.server";
import { escapeHtml, humanDuration, sendTelegram } from "./telegram.server";

const HELP = [
  "<b>WebWatch</b> — perintah yang tersedia:",
  "/addsite &lt;url&gt; [interval_menit] — tambah situs",
  "/listsite — daftar situs",
  "/status — ringkasan status semua situs",
  "/removesite &lt;id&gt; — hapus situs",
  "/pause &lt;id&gt; — hentikan sementara",
  "/resume &lt;id&gt; — lanjutkan pemantauan",
  "/history &lt;id&gt; — uptime & insiden 30 hari",
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
      "SELECT id, name, url, is_active, current_status FROM sites WHERE user_id = ? AND id LIKE ? LIMIT 2",
    )
    .bind(userId, `${ref}%`)
    .all<{
      id: string;
      name: string | null;
      url: string;
      is_active: number;
      current_status: string;
    }>();
  if (!results || results.length !== 1) return null;
  return results[0];
}

function statusIcon(status: string, active: number) {
  if (!active) return "⏸️";
  if (status === "up") return "🟢";
  if (status === "down") return "🔴";
  return "⚪";
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
  if (!raw) return "Format: /addsite &lt;url&gt; [interval_menit]";
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

  const minutes = Math.max(1, Number(args[1] ?? 5) || 5);
  const id = newId();
  try {
    await db()
      .prepare(
        "INSERT INTO sites (id, user_id, url, name, interval_seconds) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, userId, url, parsed.hostname, minutes * 60)
      .run();
  } catch {
    return "❌ URL sudah dipantau akun lain.";
  }
  return `✅ Ditambahkan: <code>${escapeHtml(url)}</code>\nID: <code>${shortId(id)}</code>\nInterval: ${minutes} menit`;
}

async function handleList(userId: string) {
  const { results } = await db()
    .prepare(
      "SELECT id, name, url, current_status, is_active, interval_seconds FROM sites WHERE user_id = ? ORDER BY created_at ASC",
    )
    .bind(userId)
    .all<{
      id: string;
      name: string | null;
      url: string;
      current_status: string;
      is_active: number;
      interval_seconds: number;
    }>();
  if (!results?.length) return "Belum ada situs. Tambah dengan /addsite &lt;url&gt;";
  return results
    .map(
      (s) =>
        `${statusIcon(s.current_status, s.is_active)} <b>${escapeHtml(s.name || s.url)}</b>\n<code>${shortId(s.id)}</code> · ${s.interval_seconds / 60}m · ${escapeHtml(s.url)}`,
    )
    .join("\n\n");
}

async function handleHistory(userId: string, ref: string | undefined) {
  if (!ref) return "Format: /history &lt;id&gt;";
  const site = await findSite(userId, ref);
  if (!site) return "Situs tidak ditemukan.";

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const agg = await db()
    .prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(is_up), 0) AS up FROM checks WHERE site_id = ? AND checked_at >= ?",
    )
    .bind(site.id, since)
    .first<{ total: number; up: number }>();
  const total = Number(agg?.total ?? 0);
  const up = Number(agg?.up ?? 0);
  const uptime = total ? ((up / total) * 100).toFixed(2) : "—";

  const { results: incidents } = await db()
    .prepare(
      "SELECT started_at, resolved_at, error_message FROM incidents WHERE site_id = ? AND started_at >= ? ORDER BY started_at DESC LIMIT 5",
    )
    .bind(site.id, since)
    .all<{ started_at: string; resolved_at: string | null; error_message: string | null }>();

  const lines = [
    `📊 <b>${escapeHtml(site.name || site.url)}</b>`,
    `Uptime 30 hari: <b>${uptime}%</b> (${total} cek)`,
    "",
    "<b>Insiden terakhir:</b>",
  ];
  if (!incidents?.length) lines.push("Tidak ada insiden 🎉");
  else
    for (const i of incidents) {
      const dur = i.resolved_at
        ? humanDuration(new Date(i.resolved_at).getTime() - new Date(i.started_at).getTime())
        : "masih berlangsung";
      lines.push(
        `• ${i.started_at.replace("T", " ").slice(0, 16)} UTC — ${dur}${i.error_message ? ` (${escapeHtml(i.error_message)})` : ""}`,
      );
    }
  return lines.join("\n");
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
    case "/status": {
      reply = await handleList(userId);
      break;
    }
    case "/removesite": {
      const site = args[0] ? await findSite(userId, args[0]) : null;
      if (!site) reply = "Format: /removesite &lt;id&gt;";
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
      if (!site) reply = `Format: ${command} &lt;id&gt;`;
      else {
        await db()
          .prepare(
            "UPDATE sites SET is_active = ?, consecutive_failures = 0 WHERE id = ? AND user_id = ?",
          )
          .bind(active, site.id, userId)
          .run();
        reply = `${active ? "▶️ Dilanjutkan" : "⏸️ Dijeda"}: ${escapeHtml(site.name || site.url)}`;
      }
      break;
    }
    case "/history":
      reply = await handleHistory(userId, args[0]);
      break;
    default:
      reply = HELP;
  }

  return sendTelegram(chatId, reply);
}
