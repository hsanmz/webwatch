import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEvents, resetWarnedErrors } from "./transport.js";

const ENDPOINT = "https://watch.test/api/ingest";
const EVENTS = [{ type: "api_error", message: "boom" }];

beforeEach(() => {
  resetWarnedErrors();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEvents", () => {
  it("mengirim batch sekali bila sukses", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const result = await sendEvents(ENDPOINT, "ww_key_ok", EVENTS, fetchMock, 1);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(ENDPOINT);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer ww_key_ok");
  });

  it("tidak melakukan retry bila ditolak 401", async () => {
    const fetchMock = vi.fn(async () => new Response("invalid_key", { status: 401 }));
    const result = await sendEvents(ENDPOINT, "ww_key_bad", EVENTS, fetchMock, 1);

    expect(result).toEqual({ ok: false, code: "server" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Tolong cek WEBWATCH_KEY"));
  });

  it("melakukan retry terbatas saat 500 lalu berhasil", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await sendEvents(ENDPOINT, "ww_key_ok", EVENTS, fetchMock, 1);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("membuang batch saat jaringan gagal terus", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("failed to fetch");
    });
    const result = await sendEvents(ENDPOINT, "ww_key_ok", EVENTS, fetchMock, 1);

    expect(result).toEqual({ ok: false, code: "network" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tidak melakukan apa pun bila konfigurasinya kosong", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    const noEndpoint = await sendEvents("", "ww_key_ok", EVENTS, fetchMock, 1);
    const noKey = await sendEvents(ENDPOINT, "", EVENTS, fetchMock, 1);

    expect(noEndpoint).toEqual({ ok: false, code: "disabled" });
    expect(noKey).toEqual({ ok: false, code: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
