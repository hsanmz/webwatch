import type { WebWatchEvent } from "./types.js";
import { sendEvents } from "./transport.js";
import { resolveEndpoint, resolveKey } from "./envconfig.js";

/**
 * In-memory batcher: events queue up and flush when either the size threshold
 * or the interval timer fires. A flush already in flight skips extra work (the
 * next one picks the queue up). Overflow drops the oldest events first, so a
 * spike never grows memory unbounded.
 *
 * Constraints taken from the ingest contract:
 *   - D1 accepts batches comfortably below 100 statements.
 *   - capture() is always fire-and-forget; only flush() is awaitable.
 */

export const MAX_QUEUE_SIZE = 1000;
export const MAX_BATCH_SIZE = 50;
export const FLUSH_INTERVAL_MS = 5_000;

let buffer: WebWatchEvent[] = [];
let droppedCount = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let inFlight = false;

export function queueSize(): number {
  return buffer.length;
}

export function droppedEventCount(): number {
  return droppedCount;
}

export function enqueue(event: WebWatchEvent): void {
  if (buffer.length >= MAX_QUEUE_SIZE) {
    buffer.shift();
    droppedCount++;
  }
  buffer.push(event);
  ensureTimer();
}

function ensureTimer(): void {
  if (typeof setInterval !== "function" || timer) return;
  timer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
  // Never keep the host process alive just for batch shipping.
  (timer as { unref?: () => void }).unref?.();
}

/** Drain everything, in chunks the ingest endpoint is known to accept. */
export async function flush(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    while (buffer.length > 0) {
      const endpoint = resolveEndpoint();
      const key = resolveKey();
      if (!endpoint || !key) {
        // Nothing we can do without credentials; drop the batch silently here.
        // capture() is responsible for warning the user at capture time.
        buffer = [];
        return;
      }

      const batch = buffer.splice(0, MAX_BATCH_SIZE);
      const result = await sendEvents(endpoint, key, batch, undefined);
      if (!result.ok) {
        // Non-retryable dead batch: keep nothing, the transport already warned.
        // For a network drop we could re-queue, but we would need bounded
        // bloat protection; add in a follow-up once the host API settles.
        return;
      }
    }
  } finally {
    inFlight = false;
    if (buffer.length === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }
}

/** Test hooks. */
export function queueStateReset(): void {
  buffer = [];
  droppedCount = 0;
  inFlight = false;
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

export function queueSnapshot(): WebWatchEvent[] {
  return [...buffer];
}
