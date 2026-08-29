import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  const { data } = await supabaseAdmin
    .from("telegram_accounts")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function findSite(userId: string, ref: string) {
  const { data } = await supabaseAdmin
    .from("sites")
    .select("id,name,url,is_active,current_status")
    .eq("user_id", userId)
    .ilike("id", `${ref}%`)
    .limit(2);
  if (!data || data.length !== 1) return null;
  return data[0];
}

function statusIcon(status: string, active: boolean) {
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
      : "Halo! Buka dashboard WebWatch, klik <b>Connect Telegram</b>, lalu ikuti link-nya untuk menghubungkan akun.";
  }

  const { data: link } = await supabaseAdmin
    .from("telegram_links")
    .select("id,user_id,status,expires_at")
    .eq("token", arg)
    .maybeSingle();

  if (!link || link.status !== "pending" || new Date(link.expires_at).getTime() < Date.now()) {
    return "❌ Token tidak valid atau sudah kedaluwarsa. Buat link baru dari dashboard.";
  }

  await supabaseAdmin
    .from("telegram_accounts")
    .upsert({ user_id: link.user_id, chat_id: chatId, username }, { onConflict: "user_id" });
  await supabaseAdmin.from("telegram_links").update({ status: "linked" }).eq("id", link.id);

  return `✅ Akun Telegram terhubung! Notifikasi downtime akan dikirim ke chat ini.\n\n${HELP}`;
}

async function handleAddSite(userId: string, args: string[]) {
  const raw = args[0];
  if (!raw) return "Format: /addsite &lt;url&gt; [interval_menit]";
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    new URL(url);
  } catch {
    return "URL tidak valid.";
  }
  const minutes = Math.max(1, Number(args[1] ?? 5) || 5);
  const { data, error } = await supabaseAdmin
    .from("sites")
    .insert({
      user_id: userId,
      url,
      name: new URL(url).hostname,
      interval_seconds: minutes * 60,
    })
    .select("id")
    .single();
  if (error) return `Gagal menambah situs: ${escapeHtml(error.message)}`;
  return `✅ Ditambahkan: <code>${escapeHtml(url)}</code>\nID: <code>${shortId(data.id)}</code>\nInterval: ${minutes} menit`;
}

async function handleList(userId: string) {
  const { data } = await supabaseAdmin
    .from("sites")
    .select("id,name,url,current_status,is_active,interval_seconds")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (!data?.length) return "Belum ada situs. Tambah dengan /addsite &lt;url&gt;";
  return data
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
  const { data: checks } = await supabaseAdmin
    .from("checks")
    .select("is_up")
    .eq("site_id", site.id)
    .gte("checked_at", since);
  const total = checks?.length ?? 0;
  const up = checks?.filter((c) => c.is_up).length ?? 0;
  const uptime = total ? ((up / total) * 100).toFixed(2) : "—";

  const { data: incidents } = await supabaseAdmin
    .from("incidents")
    .select("started_at,resolved_at,error_message")
    .eq("site_id", site.id)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(5);

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
    return sendTelegram(chatId, await handleStart(chatId, args[0], message?.from?.username ?? null));
  }

  const userId = await userIdForChat(chatId);
  if (!userId) {
    return sendTelegram(
      chatId,
      "Akun ini belum terhubung. Buka dashboard WebWatch → <b>Connect Telegram</b>.",
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
        await supabaseAdmin.from("sites").delete().eq("id", site.id).eq("user_id", userId);
        reply = `🗑️ Dihapus: ${escapeHtml(site.name || site.url)}`;
      }
      break;
    }
    case "/pause":
    case "/resume": {
      const active = command === "/resume";
      const site = args[0] ? await findSite(userId, args[0]) : null;
      if (!site) reply = `Format: ${command} &lt;id&gt;`;
      else {
        await supabaseAdmin
          .from("sites")
          .update({ is_active: active, consecutive_failures: 0 })
          .eq("id", site.id)
          .eq("user_id", userId);
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
