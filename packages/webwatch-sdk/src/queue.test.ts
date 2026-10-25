import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BATCH_SIZE,
  MAX_QUEUE_SIZE,
  droppedEventCount,
  enqueue,
  flush,
  queueSize,
  queueSnapshot,
  queueStateReset,
} from "./queue.js";
import { resetConfig, setExplicit } from "./envconfig.js";
import { resetWarnedErrors } from "./transport.js";

const ENDPOINT = "https://watch.test";

function event(n: number): { type: string; message: string; stack_trace: string | null } {
  return { type: "api_error", message: `boom-${n}`, stack_trace: null };
}

afterEach(() => {
  queueStateReset();
  resetConfig();
  vi.unstubAllGlobals();
  resetWarnedErrors();
});

describe("enqueue", () => {
  it("menyimpan event di buffer", () => {
    enqueue(event(1));
    expect(queueSize()).toBe(1);
    expect(queueSnapshot()[0]?.message).toBe("boom-1");
  });

  it("membuang event paling tua saat buffer penuh", () => {
    for (let i = 0; i <= MAX_QUEUE_SIZE; i++) {
      enqueue(event(i));
    }
    expect(queueSize()).toBe(MAX_QUEUE_SIZE);
    expect(droppedEventCount()).toBe(1);
    expect(queueSnapshot()[0]?.message).toBe("boom-1");
    expect(queueSnapshot().at(-1)?.message).toBe(`boom-${MAX_QUEUE_SIZE}`);
  });
});

describe("flush", () => {
  it("mengirim batch lalu mengosongkan buffer", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setExplicit("ww_key_test", ENDPOINT);

    enqueue(event(1));
    enqueue(event(2));
    enqueue(event(3));
    await flush();

    expect(queueSize()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ENDPOINT}/api/ingest`);
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer ww_key_test");
    const body = JSON.parse(String(init.body)) as { events: unknown[] };
    expect(body.events).toHaveLength(3);
  });

  it("memecah queue besar beberapa kali kirim", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    setExplicit("ww_key_test", ENDPOINT);

    const total = MAX_BATCH_SIZE + 10;
    for (let i = 0; i < total; i++) enqueue(event(i));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queueSize()).toBe(0);
  });

  it("membuang buffer tanpa mengirim saat konfigurasinya hilang", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    enqueue(event(1));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(queueSize()).toBe(0);
  });

  it("bersifat single-flight: flush kedua tidak menduplikasi kiriman", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await gate;
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    setExplicit("ww_key_test", ENDPOINT);

    enqueue(event(1));
    const first = flush();
    const second = flush();
    release();
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queueSize()).toBe(0);
  });
});
