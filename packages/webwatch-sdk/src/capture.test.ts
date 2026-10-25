import { afterEach, describe, expect, it, vi } from "vitest";
import { capture, captureError, resetCaptureState } from "./capture.js";
import { droppedEventCount, queueSize, queueSnapshot, queueStateReset } from "./queue.js";
import { resetConfig, setExplicit } from "./envconfig.js";

afterEach(() => {
  queueStateReset();
  resetCaptureState();
  resetConfig();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("capture", () => {
  it("membangun event lengkap untuk ingest", () => {
    setExplicit("ww_key_test", "https://watch.test");
    vi.stubEnv("NODE_ENV", "staging");

    const accepted = capture("api_error", "boom", "TypeError: boom\n    at x", "/users", "POST");

    expect(accepted).toBe(true);
    const ev = queueSnapshot()[0];
    expect(ev).toMatchObject({
      type: "api_error",
      message: "boom",
      stack_trace: "TypeError: boom\n    at x",
      url: "/users",
      method: "POST",
      environment: "staging",
    });
    expect(ev?.user_agent).toContain("webwatch-sdk/");
  });

  it("tidak mengirim saat konfigurasinya hilang dan memberi peringatan sekali", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(capture("log", "hello")).toBe(false);
    expect(queueSize()).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Peringatan yang sama tidak diulang untuk event berikutnya.
    expect(capture("log", "bye")).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("meng-throttle event duplikat dalam jendela waktu", () => {
    setExplicit("ww_key_test", "https://watch.test");
    // Fake clock only (bukan timer) — interval flush buffer tidak boleh ikut maju.
    vi.useFakeTimers();

    expect(capture("api_error", "boom")).toBe(true);
    expect(capture("api_error", "boom")).toBe(false);
    expect(queueSize()).toBe(1);

    vi.setSystemTime(Date.now() + 6_000);
    expect(capture("api_error", "boom")).toBe(true);
    expect(queueSize()).toBe(2);
  });

  it("tetap menerima event berbeda type walau pesannya sama", () => {
    setExplicit("ww_key_test", "https://watch.test");

    expect(capture("api_error", "boom")).toBe(true);
    expect(capture("frontend_error", "boom")).toBe(true);
    expect(queueSize()).toBe(2);
  });
});

describe("captureError", () => {
  it("mengekstrak pesan dan stack dari Error", () => {
    setExplicit("ww_key_test", "https://watch.test");

    captureError(new TypeError("halo dunia"));

    const ev = queueSnapshot()[0];
    expect(ev?.type).toBe("backend_error");
    expect(ev?.message).toBe("halo dunia");
    expect(ev?.stack_trace).toContain("TypeError: halo dunia");
  });

  it("meng-cause Error ke dalam stack", () => {
    setExplicit("ww_key_test", "https://watch.test");

    const base = new Error("akar masalah");
    const wrapped = new Error("gagal proses", { cause: base });
    captureError(wrapped);

    const ev = queueSnapshot()[0];
    expect(ev?.stack_trace).toContain("caused by: akar masalah");
  });

  it("meneruskan opsi url/method dan degradasi non-Error jadi string", () => {
    setExplicit("ww_key_test", "https://watch.test");

    captureError("revisi gagal", { url: "/worker", method: "GET" });

    const ev = queueSnapshot()[0];
    expect(ev?.message).toBe("revisi gagal");
    expect(ev?.stack_trace).toBeNull();
    expect(ev?.url).toBe("/worker");
    expect(ev?.method).toBe("GET");
  });
});

describe("dedupe counter", () => {
  it("tidak naik saat event diterima", () => {
    setExplicit("ww_key_test", "https://watch.test");
    enqueueOne();
    expect(droppedEventCount()).toBe(0);
  });
});

function enqueueOne(): void {
  capture("log", "drop-check");
}
