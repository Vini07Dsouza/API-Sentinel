import { formatDistanceToNowStrict, format } from "date-fns";

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${Math.round(ms)} ms`;
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatRelative(ts: number | null | undefined): string {
  if (!ts) return "Never";
  return `${formatDistanceToNowStrict(ts)} ago`;
}

export function formatDateTime(ts: number): string {
  return format(ts, "MMM d, HH:mm");
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 1) return "< 1m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
