import { describe, expect, it } from "vitest";
import {
  describeSslDaysLeft,
  escapeHtml,
  formatDownMessage,
  formatRecoveryMessage,
  formatSslWarningMessage,
  humanDuration,
} from "@/lib/telegram.server";

describe("escapeHtml", () => {
  it("meng-escape karakter HTML", () => {
    expect(escapeHtml(`<a href="x">&`)).toBe(`&lt;a href="x"&gt;&amp;`);
  });
});

describe("humanDuration", () => {
  it("menampilkan menit untuk durasi pendek", () => {
    expect(humanDuration(90_000)).toBe("2 menit");
  });

  it("menampilkan jam & menit untuk durasi panjang", () => {
    expect(humanDuration(5_400_000)).toBe("1 jam 30 menit");
  });

  it("membulatkan ke atas minimal 1 menit", () => {
    expect(humanDuration(10_000)).toBe("1 menit");
  });
});

describe("describeSslDaysLeft", () => {
  it("menyebut 'hari ini' saat sudah expired/hari ini", () => {
    expect(describeSslDaysLeft(0)).toBe("hari ini");
    expect(describeSslDaysLeft(-2)).toBe("hari ini");
  });

  it("merender jumlah hari (pembulatan ke atas)", () => {
    expect(describeSslDaysLeft(6.9)).toBe("7 hari");
    expect(describeSslDaysLeft(5)).toBe("5 hari");
  });

  it("menyebut '1 hari' untuk mendekati 1 hari", () => {
    expect(describeSslDaysLeft(1.2)).toBe("2 hari");
  });
});

describe("formatDownMessage", () => {
  it("memuat info lengkap dan men-escape input", () => {
    const msg = formatDownMessage({
      label: "Situs <ku>",
      url: "https://example.com/?a=1&b=2",
      errorMessage: "HTTP <500>",
      failures: 3,
      at: "2026-08-31T12:00:00.000Z",
    });
    expect(msg).toContain("🔴 <b>DOWN</b> — Situs &lt;ku&gt;");
    expect(msg).toContain("<code>https://example.com/?a=1&amp;b=2</code>");
    expect(msg).toContain("Error: HTTP &lt;500&gt;");
    expect(msg).toContain("Gagal berturut-turut: 3x");
    expect(msg).toContain("Waktu: 2026-08-31 12:00:00 UTC");
  });
});

describe("formatRecoveryMessage", () => {
  it("memuat durasi downtime dan waktu pemulihan", () => {
    const msg = formatRecoveryMessage({
      label: "Contoh",
      url: "https://example.com",
      downtime: "12 menit",
      at: "2026-08-31T12:05:00.000Z",
    });
    expect(msg).toContain("🟢 <b>RECOVERED</b> — Contoh");
    expect(msg).toContain("Durasi downtime: 12 menit");
    expect(msg).toContain("Pulih: 2026-08-31 12:05:00 UTC");
  });
});

describe("formatSslWarningMessage", () => {
  it("memuat peringatan kedaluwarsa SSL", () => {
    const msg = formatSslWarningMessage({
      label: "Contoh",
      url: "https://example.com",
      daysLeft: 3,
      at: "2026-08-31T12:00:00.000Z",
    });
    expect(msg).toContain("⚠️ <b>SSL CERTIFICATE</b> — Contoh");
    expect(msg).toContain("kedaluwarsa dalam 3 hari");
    expect(msg).toContain("Waktu: 2026-08-31 12:00:00 UTC");
  });
});
