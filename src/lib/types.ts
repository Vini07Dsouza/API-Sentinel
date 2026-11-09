// Core domain types for API Sentinel.

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type MonitorStatus = "operational" | "degraded" | "down" | "paused" | "pending";

export interface HeaderPair {
  key: string;
  value: string;
}

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
  auth: AuthConfig;
  paused: boolean;
  createdAt: number;
}

export type MonitorInput = Omit<Monitor, "id" | "createdAt" | "paused">;

export interface CheckResult {
  monitorId: string;
  at: number;
  /** null when the request never produced a response (timeout / network error). */
  responseMs: number | null;
  statusCode: number | null;
  ok: boolean;
  error?: string | undefined;
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
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startedAt: number;
  acknowledgedAt?: number | undefined;
  resolvedAt?: number | undefined;
  events: IncidentEvent[];
}

export type NotificationKind = "incident" | "recovery" | "degraded" | "system";

export interface AppNotification {
  id: string;
  at: number;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  incidentId?: string | undefined;
  monitorId?: string | undefined;
}

export interface Settings {
  account: {
    name: string;
    email: string;
    company: string;
    timezone: string;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    slackWebhook: string;
    sms: boolean;
    phone: string;
    onIncidentOpened: boolean;
    onIncidentResolved: boolean;
    onDegraded: boolean;
    weeklyReport: boolean;
  };
  thresholds: {
    /** Responses slower than this mark a monitor as degraded. */
    latencyWarningMs: number;
    /** Responses slower than this open a major incident. */
    latencyCriticalMs: number;
    /** Failed checks in a row before an incident opens. */
    consecutiveFailures: number;
    /** Target uptime percentage (SLO). */
    uptimeTarget: number;
  };
  monitoring: {
    defaultIntervalSeconds: number;
    defaultTimeoutMs: number;
    followRedirects: boolean;
    region: string;
  };
}

export interface AppData {
  version: 1;
  monitors: Monitor[];
  checks: CheckResult[];
  incidents: Incident[];
  notifications: AppNotification[];
  settings: Settings;
  /** True while the workspace still contains generated sample data. */
  isSampleData: boolean;
}

export interface EndpointCheckRequest {
  url: string;
  method: HttpMethod;
  timeoutMs: number;
  expectedStatus: number;
  headers: HeaderPair[];
  auth: AuthConfig;
}

export interface EndpointCheckResponse {
  ok: boolean;
  statusCode: number | null;
  responseMs: number | null;
  error?: string | undefined;
  checkedAt: number;
}
