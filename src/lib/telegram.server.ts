import { getAppEnv } from "./wrangler-env";

const API = "https://api.telegram.org";

function safeAppEnv() {
  try {
    return getAppEnv();
  } catch {
    return {} as Record<string, string>;
  }
}

function token() {
  const envValue = typeof process !== "undefined" ? process.env["TELEGRAM_BOT_TOKEN"] : undefined;
  const t = safeAppEnv().TELEGRAM_BOT_TOKEN || envValue;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return t;
}

export function botUsername() {
  const envValue =
    typeof process !== "undefined" ? process.env["TELEGRAM_BOT_USERNAME"] : undefined;
  return (safeAppEnv().TELEGRAM_BOT_USERNAME || envValue || "").replace(/^@/, "");
}

export async function sendTelegram(chatId: string, text: string) {
  const res = await fetch(`${API}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error(`[telegram] sendMessage failed ${res.status}: ${await res.text()}`);
  }
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatOtpMessage(email: string, code: string) {
  return [
    `🔐 <b>Kode masuk WebWatch</b>`,
    ``,
    `<code>${code}</code>`,
    ``,
    `Berlaku 5 menit dan dipakai sekali. Jangan bagikan kode ini ke siapa pun.`,
    `Email: ${escapeHtml(email)}`,
  ].join("\n");
}

export function formatApmErrorMessage(input: {
  label: string;
  url: string;
  environment: string;
  eventType: string;
  message: string;
  endpoint: string;
}) {
  return [
    `🚨 <b>APM ALERT</b> — ${escapeHtml(input.label)}`,
    `<code>${escapeHtml(input.url)}</code>`,
    ``,
    `Tipe: <b>${escapeHtml(input.eventType)}</b> (${escapeHtml(input.environment)})`,
    `Pesan: ${escapeHtml(input.message)}`,
    `Endpoint: ${escapeHtml(input.endpoint)}`,
  ].join("\n");
}
