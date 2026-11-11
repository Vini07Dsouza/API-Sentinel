// Pure calculations over real check results returned by the backend.
import type { CheckResult, Period } from "@/lib/types";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export const PERIODS: Record<Period, { label: string; ms: number; bucketMs: number }> = {
  "24h": { label: "Last 24 hours", ms: DAY, bucketMs: HOUR },
  "7d": { label: "Last 7 days", ms: 7 * DAY, bucketMs: 6 * HOUR },
  "30d": { label: "Last 30 days", ms: 30 * DAY, bucketMs: DAY },
};

/** Uptime percentage (0–100) of a set of checks, or null if there are none. */
export function uptimePercent(checks: CheckResult[]): number | null {
  if (checks.length === 0) return null;
  const ok = checks.filter((c) => c.ok).length;
  return (ok / checks.length) * 100;
}

export interface LatencyStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  p95: number | null;
}

export function latencyStats(checks: CheckResult[]): LatencyStats {
  const values = checks
    .map((c) => c.responseMs)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (values.length === 0) return { avg: null, min: null, max: null, p95: null };
  const sum = values.reduce((a, b) => a + b, 0);
  const p95Index = Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1);
  return {
    avg: sum / values.length,
    min: values[0] ?? null,
    max: values[values.length - 1] ?? null,
    p95: values[p95Index] ?? null,
  };
}

/** Counts failed checks grouped by HTTP status code ("Timeout" when no response). */
export function failureDistribution(checks: CheckResult[]): { code: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of checks) {
    if (c.ok) continue;
    const key = c.statusCode === null ? "Timeout" : String(c.statusCode);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export function checksInWindow(checks: CheckResult[], from: number, to = Date.now()) {
  return checks.filter((c) => c.at >= from && c.at <= to);
}
