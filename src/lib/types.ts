// UI domain types for API Sentinel. Backend payload shapes live in src/services/dto.ts
// and are converted to these types in src/services/mappers.ts.

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type MonitorStatus = "operational" | "degraded" | "down" | "paused" | "pending";

export interface HeaderPair {
  key: string;
  value: string;
}

export type AuthType = "none" | "bearer" | "basic" | "apiKey";

/** Monitor credentials as sent to the backend. Secret fields are never returned by GET. */
export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | { type: "apiKey"; headerName: string; value: string };

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  headers: HeaderPair[];
  authType: AuthType;
  /** Non-secret auth details the backend may echo back (basic username, API key header). */
  authUsername: string | null;
  apiKeyHeader: string | null;
  paused: boolean;
  status: MonitorStatus;
  lastResponseMs: number | null;
  uptimePercent: number | null;
  lastCheckedAt: number | null;
  createdAt: number | null;
}

export interface MonitorInput {
  name: string;
  url: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  headers: HeaderPair[];
  /** Empty secret values mean "keep the current secret" when updating. */
  auth: AuthConfig;
}

export interface CheckResult {
  id: string | null;
  monitorId: string;
  at: number;
  /** null when the request produced no response (timeout / network error). */
  responseMs: number | null;
  statusCode: number | null;
  ok: boolean;
  error: string | null;
}

export type IncidentSeverity = "critical" | "major" | "minor";
export type IncidentStatus = "open" | "acknowledged" | "resolved";

export interface IncidentEvent {
  at: number;
  type: "opened" | "acknowledged" | "resolved" | "note" | "update";
  message: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  monitorName: string | null;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  events: IncidentEvent[];
}

export type Period = "24h" | "7d" | "30d";

export interface AnalyticsOverview {
  totalMonitors: number;
  operationalMonitors: number;
  degradedMonitors: number;
  downMonitors: number;
  pausedMonitors: number;
  activeIncidents: number;
  uptimePercent: number | null;
  avgResponseMs: number | null;
  minResponseMs: number | null;
  maxResponseMs: number | null;
}

export interface UptimePoint {
  at: number;
  uptimePercent: number | null;
}

export interface LatencyPoint {
  at: number;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
}

export interface AuthUser {
  id: string | null;
  name: string | null;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser | null;
  /** Epoch ms; null when the backend doesn't say. */
  expiresAt: number | null;
}

/** Preferences kept in this browser only (no backend endpoint yet). */
export interface LocalPreferences {
  defaultIntervalSeconds: number;
  defaultTimeoutMs: number;
  /** Draws a reference line on latency charts. */
  latencyWarningMs: number;
  /** Highlights uptime below this value. */
  uptimeTarget: number;
}
