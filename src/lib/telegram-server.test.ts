import { describe, expect, it } from "vitest";
import { escapeHtml, formatApmErrorMessage, formatOtpMessage } from "@/lib/telegram.server";

describe("escapeHtml", () => {
  it("meng-escape karakter HTML", () => {
    expect(escapeHtml(`<a href="x">&`)).toBe(`&lt;a href="x"&gt;&amp;`);
  });
});

describe("formatOtpMessage", () => {
  it("memuat kode OTP dan men-escape email", () => {
    const msg = formatOtpMessage("user@<domain>.com", "123456");
    expect(msg).toContain("🔐 <b>Kode masuk WebWatch</b>");
    expect(msg).toContain("<code>123456</code>");
    expect(msg).toContain("user@&lt;domain&gt;.com");
  });
});

describe("formatApmErrorMessage", () => {
  it("memuat info lengkap dan men-escape input", () => {
    const msg = formatApmErrorMessage({
      label: "Situs <ku>",
      url: "https://example.com/?a=1&b=2",
      environment: "production",
      eventType: "api_error",
      message: "Failed to fetch <users>",
      endpoint: "GET /api/users",
    });
    expect(msg).toContain("🚨 <b>APM ALERT</b> — Situs &lt;ku&gt;");
    expect(msg).toContain("<code>https://example.com/?a=1&amp;b=2</code>");
    expect(msg).toContain("Tipe: <b>api_error</b> (production)");
    expect(msg).toContain("Pesan: Failed to fetch &lt;users&gt;");
    expect(msg).toContain("Endpoint: GET /api/users");
  });
});
