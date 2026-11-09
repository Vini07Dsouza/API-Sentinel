/**
 * Expected Spring Boot request/response shapes. These describe the planned contract and are
 * the single place to adjust when the real backend's JSON differs. Dates may be ISO strings
 * or epoch milliseconds; enums are expected in Java's UPPER_CASE style.
 */

export type Timestamp = string | number;

/** Spring Data `Page<T>` wrapper; list endpoints may return this or a plain array. */
export interface PageDto<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export type ListResponse<T> = T[] | PageDto<T>;

/** Spring Boot default error body (plus common validation-error extensions). */
export interface SpringErrorDto {
  timestamp?: Timestamp;
  status?: number;
  error?: string;
  message?: string;
  detail?: string;
  path?: string;
  errors?: { field?: string; defaultMessage?: string; message?: string }[];
}

// ---- Auth ----
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
}

export interface UserDto {
  id?: number | string;
  name?: string | null;
  fullName?: string | null;
  email: string;
}

export interface AuthResponseDto {
  token?: string;
  accessToken?: string;
  tokenType?: string;
  /** Seconds until expiry. */
  expiresIn?: number;
  user?: UserDto;
}

// ---- Monitors ----
export type MonitorStatusDto = "OPERATIONAL" | "UP" | "DEGRADED" | "DOWN" | "PAUSED" | "PENDING" | "UNKNOWN";
export type AuthTypeDto = "NONE" | "BEARER" | "BASIC" | "API_KEY";

export interface MonitorDto {
  id: number | string;
  name: string;
  url: string;
  method?: string;
  intervalSeconds?: number;
  timeoutMs?: number;
  expectedStatusCode?: number;
  headers?: Record<string, string> | { key: string; value: string }[] | null;
  authType?: AuthTypeDto | null;
  authUsername?: string | null;
  apiKeyHeader?: string | null;
  paused?: boolean;
  status?: MonitorStatusDto | string | null;
  lastResponseTimeMs?: number | null;
  uptimePercentage?: number | null;
  lastCheckedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

export interface MonitorRequestDto {
  name: string;
  url: string;
  method: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatusCode: number;
  headers: Record<string, string>;
  authType: AuthTypeDto;
  /** Secret fields are omitted when unchanged during an update. */
  authToken?: string;
  authUsername?: string;
  authPassword?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
}

export interface CheckDto {
  id?: number | string;
  monitorId?: number | string;
  checkedAt: Timestamp;
  responseTimeMs?: number | null;
  statusCode?: number | null;
  success: boolean;
  errorMessage?: string | null;
}

// ---- Incidents ----
export interface IncidentEventDto {
  timestamp: Timestamp;
  type?: string;
  message: string;
}

export interface IncidentDto {
  id: number | string;
  monitorId: number | string;
  monitorName?: string | null;
  title?: string | null;
  description?: string | null;
  severity?: "CRITICAL" | "MAJOR" | "MINOR" | string;
  status?: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | string;
  startedAt: Timestamp;
  acknowledgedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;
  events?: IncidentEventDto[] | null;
}

// ---- Analytics ----
export interface AnalyticsOverviewDto {
  totalMonitors: number;
  operationalMonitors?: number;
  degradedMonitors?: number;
  downMonitors?: number;
  pausedMonitors?: number;
  activeIncidents?: number;
  uptimePercentage?: number | null;
  averageResponseTimeMs?: number | null;
  minResponseTimeMs?: number | null;
  maxResponseTimeMs?: number | null;
}

export interface UptimePointDto {
  timestamp: Timestamp;
  uptimePercentage: number | null;
}

export interface LatencyPointDto {
  timestamp: Timestamp;
  averageResponseTimeMs: number | null;
  minResponseTimeMs?: number | null;
  maxResponseTimeMs?: number | null;
}
