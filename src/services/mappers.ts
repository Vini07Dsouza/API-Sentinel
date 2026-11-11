// Converts backend DTOs into UI domain types. Adjust here if the real JSON differs.
import type {
  AnalyticsOverviewDto,
  AuthResponseDto,
  CheckDto,
  IncidentDto,
  LatencyPointDto,
  ListResponse,
  MonitorDto,
  MonitorRequestDto,
  Timestamp,
  UptimePointDto,
} from "@/services/dto";
import { ApiError } from "@/services/errors";
import {
  HTTP_METHODS,
  type AnalyticsOverview,
  type AuthSession,
  type AuthType,
  type CheckResult,
  type HeaderPair,
  type HttpMethod,
  type Incident,
  type IncidentEvent,
  type IncidentSeverity,
  type IncidentStatus,
  type LatencyPoint,
  type Monitor,
  type MonitorInput,
  type MonitorStatus,
  type UptimePoint,
} from "@/lib/types";

/** Parses ISO strings or epoch ms. Returns null for missing/invalid values. */
export function toEpoch(value: Timestamp | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(n) ? n : null;
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Accepts a plain array or a Spring `Page<T>`; anything else is treated as an empty list. */
export function unwrapList<T>(body: ListResponse<T> | null): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.content)) return body.content;
  return [];
}

export function toMonitorStatus(status: string | null | undefined, paused: boolean): MonitorStatus {
  if (paused) return "paused";
  switch ((status ?? "").toUpperCase()) {
    case "OPERATIONAL":
    case "UP":
      return "operational";
    case "DEGRADED":
      return "degraded";
    case "DOWN":
      return "down";
    case "PAUSED":
      return "paused";
    default:
      return "pending";
  }
}

const AUTH_FROM_DTO: Record<string, AuthType> = { NONE: "none", BEARER: "bearer", BASIC: "basic", API_KEY: "apiKey" };
const AUTH_TO_DTO = { none: "NONE", bearer: "BEARER", basic: "BASIC", apiKey: "API_KEY" } as const;

function toHeaders(headers: MonitorDto["headers"]): HeaderPair[] {
  if (!headers) return [];
  if (Array.isArray(headers)) return headers.filter((h) => h && h.key).map((h) => ({ key: h.key, value: h.value ?? "" }));
  return Object.entries(headers).map(([key, value]) => ({ key, value: String(value) }));
}

function toMethod(method: string | undefined): HttpMethod {
  const upper = (method ?? "GET").toUpperCase();
  return (HTTP_METHODS as readonly string[]).includes(upper) ? (upper as HttpMethod) : "GET";
}

export function toMonitor(dto: MonitorDto): Monitor {
  const paused = dto.paused === true || (dto.status ?? "").toUpperCase() === "PAUSED";
  return {
    id: String(dto.id),
    name: dto.name,
    url: dto.url,
    method: toMethod(dto.method),
    intervalSeconds: dto.intervalSeconds ?? 60,
    timeoutMs: dto.timeoutMs ?? 10000,
    expectedStatus: dto.expectedStatusCode ?? 200,
    headers: toHeaders(dto.headers),
    authType: AUTH_FROM_DTO[(dto.authType ?? "NONE").toUpperCase()] ?? "none",
    authUsername: dto.authUsername ?? null,
    apiKeyHeader: dto.apiKeyHeader ?? null,
    paused,
    status: toMonitorStatus(dto.status, paused),
    lastResponseMs: num(dto.lastResponseTimeMs),
    uptimePercent: num(dto.uptimePercentage),
    lastCheckedAt: toEpoch(dto.lastCheckedAt),
    createdAt: toEpoch(dto.createdAt),
  };
}

export function toMonitorRequest(input: MonitorInput): MonitorRequestDto {
  const req: MonitorRequestDto = {
    name: input.name,
    url: input.url,
    method: input.method,
    intervalSeconds: input.intervalSeconds,
    timeoutMs: input.timeoutMs,
    expectedStatusCode: input.expectedStatus,
    headers: Object.fromEntries(input.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value])),
    authType: AUTH_TO_DTO[input.auth.type],
  };
  const auth = input.auth;
  if (auth.type === "bearer" && auth.token) req.authToken = auth.token;
  if (auth.type === "basic") {
    req.authUsername = auth.username;
    if (auth.password) req.authPassword = auth.password;
  }
  if (auth.type === "apiKey") {
    req.apiKeyHeader = auth.headerName;
    if (auth.value) req.apiKeyValue = auth.value;
  }
  return req;
}

export function toCheck(dto: CheckDto, monitorId: string): CheckResult | null {
  const at = toEpoch(dto.checkedAt);
  if (at === null) return null;
  return {
    id: dto.id === undefined ? null : String(dto.id),
    monitorId: dto.monitorId === undefined ? monitorId : String(dto.monitorId),
    at,
    responseMs: num(dto.responseTimeMs),
    statusCode: num(dto.statusCode),
    ok: dto.success === true,
    error: dto.errorMessage ?? null,
  };
}

function toSeverity(value: string | undefined): IncidentSeverity {
  const v = (value ?? "").toUpperCase();
  return v === "CRITICAL" ? "critical" : v === "MINOR" ? "minor" : "major";
}

function toIncidentStatus(value: string | undefined, resolvedAt: number | null, acknowledgedAt: number | null): IncidentStatus {
  const v = (value ?? "").toUpperCase();
  if (v === "RESOLVED" || (!v && resolvedAt)) return "resolved";
  if (v === "ACKNOWLEDGED" || (!v && acknowledgedAt)) return "acknowledged";
  return "open";
}

const EVENT_TYPES: IncidentEvent["type"][] = ["opened", "acknowledged", "resolved", "note", "update"];

export function toIncident(dto: IncidentDto): Incident | null {
  const startedAt = toEpoch(dto.startedAt);
  if (startedAt === null) return null;
  const acknowledgedAt = toEpoch(dto.acknowledgedAt);
  const resolvedAt = toEpoch(dto.resolvedAt);
  const title = dto.title || dto.description || `Incident on ${dto.monitorName ?? `monitor ${dto.monitorId}`}`;

  let events: IncidentEvent[] = [];
  for (const e of dto.events ?? []) {
    const at = toEpoch(e.timestamp);
    if (at === null) continue;
    const t = (e.type ?? "update").toLowerCase() as IncidentEvent["type"];
    events.push({ at, type: EVENT_TYPES.includes(t) ? t : "update", message: e.message });
  }
  // Without an events list, build the timeline only from timestamps the backend provided.
  if (events.length === 0) {
    events = [{ at: startedAt, type: "opened", message: dto.description || title }];
    if (acknowledgedAt) events.push({ at: acknowledgedAt, type: "acknowledged", message: "Incident acknowledged." });
    if (resolvedAt) events.push({ at: resolvedAt, type: "resolved", message: "Incident resolved." });
  }
  events.sort((a, b) => a.at - b.at);

  return {
    id: String(dto.id),
    monitorId: String(dto.monitorId),
    monitorName: dto.monitorName ?? null,
    title,
    severity: toSeverity(dto.severity),
    status: toIncidentStatus(dto.status, resolvedAt, acknowledgedAt),
    startedAt,
    acknowledgedAt,
    resolvedAt,
    events,
  };
}

export function toOverview(dto: AnalyticsOverviewDto): AnalyticsOverview {
  return {
    totalMonitors: dto.totalMonitors ?? 0,
    operationalMonitors: dto.operationalMonitors ?? 0,
    degradedMonitors: dto.degradedMonitors ?? 0,
    downMonitors: dto.downMonitors ?? 0,
    pausedMonitors: dto.pausedMonitors ?? 0,
    activeIncidents: dto.activeIncidents ?? 0,
    uptimePercent: num(dto.uptimePercentage),
    avgResponseMs: num(dto.averageResponseTimeMs),
    minResponseMs: num(dto.minResponseTimeMs),
    maxResponseMs: num(dto.maxResponseTimeMs),
  };
}

export function toUptimePoint(dto: UptimePointDto): UptimePoint | null {
  const at = toEpoch(dto.timestamp);
  return at === null ? null : { at, uptimePercent: num(dto.uptimePercentage) };
}

export function toLatencyPoint(dto: LatencyPointDto): LatencyPoint | null {
  const at = toEpoch(dto.timestamp);
  return at === null
    ? null
    : { at, avgMs: num(dto.averageResponseTimeMs), minMs: num(dto.minResponseTimeMs), maxMs: num(dto.maxResponseTimeMs) };
}

export function toSession(dto: AuthResponseDto | null): AuthSession {
  const token = dto?.token ?? dto?.accessToken;
  if (!token) throw new ApiError("parse", "The login response didn't include a token.");
  const user = dto?.user;
  return {
    token,
    user: user
      ? { id: user.id === undefined ? null : String(user.id), name: user.name ?? user.fullName ?? null, email: user.email }
      : null,
    expiresAt: typeof dto?.expiresIn === "number" ? Date.now() + dto.expiresIn * 1000 : null,
  };
}

export function compact<T>(items: (T | null)[]): T[] {
  return items.filter((x): x is T => x !== null);
}
