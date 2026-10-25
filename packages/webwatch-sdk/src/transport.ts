import { escapeless } from "./format.js";

/**
 * POSTs a batch to the ingest endpoint with bounded exponential backoff.
 *
 * Retryable: network error and the standard 5xx, plus 408/429.
 * Non-retryable (400/401/403/404): server told us something is wrong — like
 * webwatch's own machine codes invalid_key or site_not_verified — retrying
 * identical payloads only burns the remote, so we stop and say it once.
 */

const RETRY_LIMIT = 3;
const RETRY_BASE_MS = 500;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const warnedErrors = new Set<string>();

function warnOnce(code: string, detail: string): void {
  if (warnedErrors.has(code)) return;
  warnedErrors.add(code);
  console.error(`[webwatch-sdk] ingest gagal (${code}): ${detail}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SendResult = { ok: true } | { ok: false; code: "disabled" | "network" | "server" };

export async function sendEvents(
  endpoint: string,
  accessToken: string,
  events: unknown[],
  fetchFn: typeof fetch = globalThis.fetch,
  backoffBaseMs = RETRY_BASE_MS,
): Promise<SendResult> {
  if (!endpoint || !accessToken) return { ok: false, code: "disabled" };

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ events }),
      });

      if (response.ok) return { ok: true };

      const status = response.status;
      const text = escapeless(await response.text().catch(() => ""));

      if (!RETRYABLE_STATUS.has(status)) {
        warnOnce(
          `http_${status}`,
          `Tolong cek WEBWATCH_KEY dan status verifikasi domain (${escapeless(text.slice(0, 200))}).`,
        );
        return { ok: false, code: "server" };
      }
    } catch (error) {
      // Network/RST — retry handles it; final attempt falls through below.
    }

    if (attempt < RETRY_LIMIT) {
      await sleep(backoffBaseMs * 2 ** attempt);
    }
  }

  // Tell once about a dead host so deployments self-report instead of vanishing.
  console.error(
    "[webwatch-sdk] ingest gagal setelah retry; event batch dibuang. Pastikan WEBWATCH_URL benar.",
  );
  return { ok: false, code: "network" };
}

/** Test hook. */
export function resetWarnedErrors(): void {
  warnedErrors.clear();
}
