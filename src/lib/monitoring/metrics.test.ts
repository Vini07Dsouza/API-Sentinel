import { describe, expect, it } from "vitest";

import { failureDistribution, latencyStats, uptimePercent } from "@/lib/monitoring/metrics";
import type { CheckResult } from "@/lib/types";

const check = (partial: Partial<CheckResult>): CheckResult => ({
  monitorId: "m1",
  at: 0,
  id: null,
  ok: true,
  statusCode: 200,
  responseMs: 100,
  error: null,
  ...partial,
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
