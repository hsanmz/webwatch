import { describe, expect, it } from "vitest";
import { evaluateStatus, isInCooldown, shouldWarnSsl } from "@/lib/monitor-core";

describe("evaluateStatus", () => {
  it("mengubah situs baru (unknown) jadi up saat cek pertama sukses", () => {
    const result = evaluateStatus({
      currentStatus: "unknown",
      isUp: true,
      consecutiveFailures: 0,
      failThreshold: 2,
    });
    expect(result).toEqual({
      status: "up",
      consecutiveFailures: 0,
      becameDown: false,
      becameUp: false,
    });
  });

  it("tetap up saat gagal sekali tapi belum mencapai threshold", () => {
    const result = evaluateStatus({
      currentStatus: "up",
      isUp: false,
      consecutiveFailures: 0,
      failThreshold: 2,
    });
    expect(result.status).toBe("up");
    expect(result.consecutiveFailures).toBe(1);
    expect(result.becameDown).toBe(false);
  });

  it("berubah down setelah kegagalan mencapai threshold", () => {
    const result = evaluateStatus({
      currentStatus: "up",
      isUp: false,
      consecutiveFailures: 1,
      failThreshold: 2,
    });
    expect(result.status).toBe("down");
    expect(result.consecutiveFailures).toBe(2);
    expect(result.becameDown).toBe(true);
  });

  it("tetap down saat sudah down dan terus gagal", () => {
    const result = evaluateStatus({
      currentStatus: "down",
      isUp: false,
      consecutiveFailures: 5,
      failThreshold: 2,
    });
    expect(result.status).toBe("down");
    expect(result.becameDown).toBe(false);
  });

  it("tidak mengubah status unknown saat gagal di bawah threshold", () => {
    const result = evaluateStatus({
      currentStatus: "unknown",
      isUp: false,
      consecutiveFailures: 0,
      failThreshold: 3,
    });
    expect(result.status).toBe("unknown");
    expect(result.becameDown).toBe(false);
  });

  it("berubah kembali up saat situs down dicek sukses", () => {
    const result = evaluateStatus({
      currentStatus: "down",
      isUp: true,
      consecutiveFailures: 2,
      failThreshold: 2,
    });
    expect(result.status).toBe("up");
    expect(result.consecutiveFailures).toBe(0);
    expect(result.becameUp).toBe(true);
  });

  it("me-reset counter kegagalan saat berhasil lagi", () => {
    const result = evaluateStatus({
      currentStatus: "down",
      isUp: true,
      consecutiveFailures: 4,
      failThreshold: 2,
    });
    expect(result.consecutiveFailures).toBe(0);
  });
});

describe("isInCooldown", () => {
  const now = new Date("2026-08-31T12:00:00Z").getTime();
  const cooldown = 10 * 60 * 1000;

  it("false saat tidak pernah diberitahu", () => {
    expect(isInCooldown(null, now, cooldown)).toBe(false);
  });

  it("true saat notifikasi terakhir kurang dari cooldown yang lalu", () => {
    expect(isInCooldown(new Date(now - 5 * 60 * 1000).toISOString(), now, cooldown)).toBe(true);
  });

  it("false saat sudah melewati cooldown", () => {
    expect(isInCooldown(new Date(now - 11 * 60 * 1000).toISOString(), now, cooldown)).toBe(false);
  });
});

describe("shouldWarnSsl", () => {
  const now = new Date("2026-08-31T12:00:00Z").getTime();

  it("false saat sertifikat masih jauh dari kedaluwarsa", () => {
    expect(shouldWarnSsl({ daysLeft: 10, lastWarnedAt: null, now, warnThresholdDays: 7 })).toBe(
      false,
    );
  });

  it("true saat mendekati kedaluwarsa dan belum pernah diperingatkan", () => {
    expect(shouldWarnSsl({ daysLeft: 5, lastWarnedAt: null, now, warnThresholdDays: 7 })).toBe(
      true,
    );
  });

  it("false saat sudah diperingatkan dalam 24 jam terakhir", () => {
    expect(
      shouldWarnSsl({
        daysLeft: 4,
        lastWarnedAt: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        now,
        warnThresholdDays: 7,
      }),
    ).toBe(false);
  });

  it("true saat peringatan terakhir lebih dari 24 jam lalu", () => {
    expect(
      shouldWarnSsl({
        daysLeft: 4,
        lastWarnedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        now,
        warnThresholdDays: 7,
      }),
    ).toBe(true);
  });

  it("false saat sertifikat sudah expired (ditangani sebagai down oleh caller)", () => {
    expect(shouldWarnSsl({ daysLeft: -1, lastWarnedAt: null, now, warnThresholdDays: 7 })).toBe(
      false,
    );
  });
});
