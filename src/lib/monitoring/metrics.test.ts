import { describe, expect, it } from "vitest";

import { deriveStatus, failureDistribution, latencyStats, uptimePercent } from "@/lib/monitoring/metrics";
import type { CheckResult } from "@/lib/types";

const check = (partial: Partial<CheckResult>): CheckResult => ({
  monitorId: "m1",
  at: 0,
  ok: true,
  statusCode: 200,
  responseMs: 100,
  ...partial,
});

const thresholds = { latencyWarningMs: 800 };

describe("deriveStatus", () => {
  it("is paused when the monitor is paused, even if the last check failed", () => {
    expect(deriveStatus({ paused: true }, check({ ok: false }), thresholds)).toBe("paused");
  });
  it("is down when the latest check failed", () => {
    expect(deriveStatus({ paused: false }, check({ ok: false, statusCode: 503 }), thresholds)).toBe("down");
  });
  it("is degraded when a successful check is slower than the warning threshold", () => {
    expect(deriveStatus({ paused: false }, check({ responseMs: 801 }), thresholds)).toBe("degraded");
  });
  it("is operational at exactly the warning threshold", () => {
    expect(deriveStatus({ paused: false }, check({ responseMs: 800 }), thresholds)).toBe("operational");
  });
  it("is pending when there are no checks yet", () => {
    expect(deriveStatus({ paused: false }, undefined, thresholds)).toBe("pending");
  });
});

describe("uptime and latency", () => {
  it("computes uptime as the share of successful checks", () => {
    expect(uptimePercent([check({}), check({}), check({}), check({ ok: false })])).toBe(75);
  });
  it("returns null uptime when there are no checks", () => {
    expect(uptimePercent([])).toBeNull();
  });
  it("ignores timeouts when computing latency", () => {
    const stats = latencyStats([check({ responseMs: 100 }), check({ responseMs: 300 }), check({ ok: false, responseMs: null })]);
    expect(stats).toMatchObject({ avg: 200, min: 100, max: 300 });
  });
  it("groups failures by status code with timeouts labelled", () => {
    const dist = failureDistribution([
      check({ ok: false, statusCode: 503 }),
      check({ ok: false, statusCode: 503 }),
      check({ ok: false, statusCode: null, responseMs: null }),
      check({}),
    ]);
    expect(dist).toEqual([
      { code: "503", count: 2 },
      { code: "Timeout", count: 1 },
    ]);
  });
});
