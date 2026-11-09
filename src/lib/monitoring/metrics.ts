import type { CheckResult, Monitor, MonitorStatus, Settings } from "@/lib/types";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export type Period = "24h" | "7d" | "30d";

export const PERIODS: Record<Period, { label: string; ms: number; bucketMs: number }> = {
  "24h": { label: "Last 24 hours", ms: DAY, bucketMs: HOUR },
  "7d": { label: "Last 7 days", ms: 7 * DAY, bucketMs: 6 * HOUR },
  "30d": { label: "Last 30 days", ms: 30 * DAY, bucketMs: DAY },
};

/**
 * Derives a monitor's current status from its latest check.
 * - paused monitors are always "paused"
 * - no checks yet → "pending"
 * - failed check → "down"
 * - successful but slower than the warning threshold → "degraded"
 */
export function deriveStatus(
  monitor: Pick<Monitor, "paused">,
  latest: CheckResult | undefined,
  thresholds: Pick<Settings["thresholds"], "latencyWarningMs">,
): MonitorStatus {
  if (monitor.paused) return "paused";
  if (!latest) return "pending";
  if (!latest.ok) return "down";
  if (latest.responseMs !== null && latest.responseMs > thresholds.latencyWarningMs) {
    return "degraded";
  }
  return "operational";
}

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
    min: values[0],
    max: values[values.length - 1],
    p95: values[p95Index],
  };
}

export interface Bucket {
  t: number;
  avgMs: number | null;
  maxMs: number | null;
  uptime: number | null;
  checks: number;
  failures: number;
}

/** Groups checks into fixed time buckets between `from` and `to`. */
export function bucketize(
  checks: CheckResult[],
  from: number,
  to: number,
  bucketMs: number,
): Bucket[] {
  const count = Math.max(1, Math.ceil((to - from) / bucketMs));
  const groups: CheckResult[][] = Array.from({ length: count }, () => []);
  for (const c of checks) {
    if (c.at < from || c.at > to) continue;
    const idx = Math.min(count - 1, Math.floor((c.at - from) / bucketMs));
    groups[idx].push(c);
  }
  return groups.map((group, i) => {
    const stats = latencyStats(group);
    return {
      t: from + i * bucketMs,
      avgMs: stats.avg === null ? null : Math.round(stats.avg),
      maxMs: stats.max,
      uptime: uptimePercent(group),
      checks: group.length,
      failures: group.filter((c) => !c.ok).length,
    };
  });
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

/** Index of checks by monitor id, sorted ascending by time. */
export function groupChecksByMonitor(checks: CheckResult[]): Map<string, CheckResult[]> {
  const map = new Map<string, CheckResult[]>();
  for (const c of checks) {
    const list = map.get(c.monitorId);
    if (list) list.push(c);
    else map.set(c.monitorId, [c]);
  }
  for (const list of map.values()) list.sort((a, b) => a.at - b.at);
  return map;
}
