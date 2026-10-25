import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INGEST_PATH,
  joinEndpoint,
  resetConfig,
  resolveEndpoint,
  resolveEnvironment,
  resolveKey,
  setExplicit,
} from "./envconfig.js";

afterEach(() => {
  resetConfig();
  vi.unstubAllEnvs();
});

describe("joinEndpoint", () => {
  it("menambahkan /api/ingest pada URL dasar", () => {
    expect(joinEndpoint("https://watch.id")).toBe(`https://watch.id${INGEST_PATH}`);
  });

  it("membiarkan URL yang sudah menuju ingest apa adanya", () => {
    expect(joinEndpoint("https://watch.id/api/ingest")).toBe("https://watch.id/api/ingest");
  });

  it("memangkas garis miring ganda", () => {
    expect(joinEndpoint("https://watch.id//")).toBe(`https://watch.id${INGEST_PATH}`);
  });

  it("menyerahkan path relatif apa adanya", () => {
    expect(joinEndpoint("/api/ingest")).toBe("/api/ingest");
  });
});

describe("resolveEnvironment", () => {
  it("memakai NODE_ENV bila tersedia", () => {
    vi.stubEnv("NODE_ENV", "staging");
    expect(resolveEnvironment()).toBe("staging");
  });

  it("fallback ke production tanpa NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "");
    expect(resolveEnvironment()).toBe("production");
  });

  it("override manual menang", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveEnvironment("staging")).toBe("staging");
  });
});

describe("resolveConfig", () => {
  it("membaca WEBWATCH_KEY dan WEBWATCH_URL dari env", () => {
    vi.stubEnv("WEBWATCH_KEY", "ww_key_env");
    vi.stubEnv("WEBWATCH_URL", "https://watch.env.test");
    expect(resolveKey()).toBe("ww_key_env");
    expect(resolveEndpoint()).toBe(`https://watch.env.test${INGEST_PATH}`);
  });

  it("nilai dari init() menang atas env", () => {
    vi.stubEnv("WEBWATCH_KEY", "ww_key_env");
    vi.stubEnv("WEBWATCH_URL", "https://watch.env.test");
    setExplicit("ww_key_manual", "https://watch.manual.test");

    expect(resolveKey()).toBe("ww_key_manual");
    expect(resolveEndpoint()).toBe(`https://watch.manual.test${INGEST_PATH}`);
  });

  it("mengabaikan env kosong", () => {
    vi.stubEnv("WEBWATCH_KEY", "   ");
    vi.stubEnv("WEBWATCH_URL", "");
    expect(resolveKey()).toBeNull();
    expect(resolveEndpoint()).toBeNull();
  });
});
