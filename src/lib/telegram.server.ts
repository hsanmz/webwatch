const API = "https://api.telegram.org";

function token() {
  const t = process.env["TELEGRAM_BOT_TOKEN"];
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return t;
}

export function botUsername() {
  return (process.env["TELEGRAM_BOT_USERNAME"] ?? "").replace(/^@/, "");
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

export function humanDuration(ms: number) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} menit`;
  return `${hours} jam ${minutes} menit`;
}

function utcTimestamp(iso: string) {
  return `${iso.replace("T", " ").slice(0, 19)} UTC`;
}

export function describeSslDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) return "hari ini";
  const ceil = Math.ceil(daysLeft);
  return ceil <= 1 ? "1 hari" : `${ceil} hari`;
}

export function formatDownMessage(input: {
  label: string;
  url: string;
  errorMessage: string;
  failures: number;
  at: string;
}) {
  return [
    `🔴 <b>DOWN</b> — ${escapeHtml(input.label)}`,
    `<code>${escapeHtml(input.url)}</code>`,
    ``,
    `Error: ${escapeHtml(input.errorMessage)}`,
    `Gagal berturut-turut: ${input.failures}x`,
    `Waktu: ${utcTimestamp(input.at)}`,
  ].join("\n");
}

export function formatRecoveryMessage(input: {
  label: string;
  url: string;
  downtime: string;
  at: string;
}) {
  return [
    `🟢 <b>RECOVERED</b> — ${escapeHtml(input.label)}`,
    `<code>${escapeHtml(input.url)}</code>`,
    ``,
    `Durasi downtime: ${input.downtime}`,
    `Pulih: ${utcTimestamp(input.at)}`,
  ].join("\n");
}

export function formatSslWarningMessage(input: {
  label: string;
  url: string;
  daysLeft: number;
  at: string;
}) {
  return [
    `⚠️ <b>SSL CERTIFICATE</b> — ${escapeHtml(input.label)}`,
    `<code>${escapeHtml(input.url)}</code>`,
    ``,
    `Sertifikat SSL akan kedaluwarsa dalam ${describeSslDaysLeft(input.daysLeft)}.`,
    `Perpanjang sertifikat sebelum habis.`,
    `Waktu: ${utcTimestamp(input.at)}`,
  ].join("\n");
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
