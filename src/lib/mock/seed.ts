/**
 * SAMPLE DATA — clearly separated from real monitoring.
 *
 * Generates a realistic starting workspace: sample monitors pointing at real public
 * APIs, 30 days of simulated hourly check history, incidents derived from scripted
 * outage windows, and matching notifications. Nothing here is real production data;
 * real checks are performed by `runEndpointCheck` (src/lib/monitoring/checks.functions.ts)
 * and recorded on top of this history.
 */
import type {
  AppData,
  AppNotification,
  CheckResult,
  Incident,
  IncidentSeverity,
  Monitor,
  Settings,
} from "@/lib/types";
import { DAY, HOUR } from "@/lib/monitoring/metrics";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  account: {
    name: "Alex Morgan",
    email: "alex@example.com",
    company: "Acme Platform Team",
    timezone: "UTC",
  },
  notifications: {
    email: true,
    slack: false,
    slackWebhook: "",
    sms: false,
    phone: "",
    onIncidentOpened: true,
    onIncidentResolved: true,
    onDegraded: true,
    weeklyReport: false,
  },
  thresholds: {
    latencyWarningMs: 800,
    latencyCriticalMs: 2000,
    consecutiveFailures: 2,
    uptimeTarget: 99.9,
  },
  monitoring: {
    defaultIntervalSeconds: 60,
    defaultTimeoutMs: 10000,
    followRedirects: true,
    region: "eu-west",
  },
};

interface Profile {
  monitor: Omit<Monitor, "createdAt">;
  baseMs: number;
  jitterMs: number;
  /** Random failure probability per sample. */
  failureRate: number;
}

const PROFILES: Profile[] = [
  {
    monitor: {
      id: "mon_github",
      name: "GitHub REST API",
      url: "https://api.github.com/zen",
      method: "GET",
      intervalSeconds: 60,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [{ key: "Accept", value: "application/vnd.github+json" }],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 180,
    jitterMs: 90,
    failureRate: 0.002,
  },
  {
    monitor: {
      id: "mon_jsonph",
      name: "JSONPlaceholder Users",
      url: "https://jsonplaceholder.typicode.com/users",
      method: "GET",
      intervalSeconds: 60,
      timeoutMs: 8000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 140,
    jitterMs: 70,
    failureRate: 0.001,
  },
  {
    monitor: {
      id: "mon_dummyjson",
      name: "DummyJSON Products",
      url: "https://dummyjson.com/products/1",
      method: "GET",
      intervalSeconds: 120,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 260,
    jitterMs: 120,
    failureRate: 0.004,
  },
  {
    monitor: {
      id: "mon_openmeteo",
      name: "Open-Meteo Forecast",
      url: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m",
      method: "GET",
      intervalSeconds: 300,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 320,
    jitterMs: 160,
    failureRate: 0.003,
  },
  {
    monitor: {
      id: "mon_httpbin",
      name: "httpbin Echo (POST)",
      url: "https://httpbin.org/post",
      method: "POST",
      intervalSeconds: 60,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [{ key: "Content-Type", value: "application/json" }],
      auth: { type: "bearer", token: "sample-token" },
      paused: false,
    },
    baseMs: 520,
    jitterMs: 260,
    failureRate: 0.01,
  },
  {
    monitor: {
      id: "mon_pokeapi",
      name: "PokéAPI Pokémon",
      url: "https://pokeapi.co/api/v2/pokemon/ditto",
      method: "GET",
      intervalSeconds: 300,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 230,
    jitterMs: 110,
    failureRate: 0.002,
  },
  {
    monitor: {
      id: "mon_countries",
      name: "REST Countries",
      url: "https://restcountries.com/v3.1/name/japan",
      method: "GET",
      intervalSeconds: 600,
      timeoutMs: 12000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: false,
    },
    baseMs: 410,
    jitterMs: 200,
    failureRate: 0.006,
  },
  {
    monitor: {
      id: "mon_catfacts",
      name: "Cat Facts API",
      url: "https://catfact.ninja/fact",
      method: "GET",
      intervalSeconds: 900,
      timeoutMs: 10000,
      expectedStatus: 200,
      headers: [],
      auth: { type: "none" },
      paused: true,
    },
    baseMs: 300,
    jitterMs: 140,
    failureRate: 0.005,
  },
];

interface OutageWindow {
  monitorId: string;
  startHoursAgo: number;
  /** null = ongoing */
  durationHours: number | null;
  kind: "down" | "slow";
  statusCode: number | null;
  severity: IncidentSeverity;
  title: string;
  acknowledged?: boolean;
}

const OUTAGES: OutageWindow[] = [
  {
    monitorId: "mon_httpbin",
    startHoursAgo: 2,
    durationHours: null,
    kind: "down",
    statusCode: 503,
    severity: "critical",
    title: "Service unavailable (503) on httpbin Echo",
  },
  {
    monitorId: "mon_countries",
    startHoursAgo: 5,
    durationHours: null,
    kind: "slow",
    statusCode: 200,
    severity: "minor",
    title: "Elevated latency on REST Countries",
    acknowledged: true,
  },
  {
    monitorId: "mon_dummyjson",
    startHoursAgo: 52,
    durationHours: 3,
    kind: "down",
    statusCode: 502,
    severity: "major",
    title: "Bad gateway responses from DummyJSON",
  },
  {
    monitorId: "mon_openmeteo",
    startHoursAgo: 130,
    durationHours: 2,
    kind: "down",
    statusCode: null,
    severity: "major",
    title: "Request timeouts on Open-Meteo Forecast",
  },
  {
    monitorId: "mon_httpbin",
    startHoursAgo: 260,
    durationHours: 4,
    kind: "down",
    statusCode: 500,
    severity: "critical",
    title: "Internal server errors on httpbin Echo",
  },
  {
    monitorId: "mon_github",
    startHoursAgo: 410,
    durationHours: 1,
    kind: "down",
    statusCode: 429,
    severity: "minor",
    title: "Rate limited by GitHub REST API",
  },
  {
    monitorId: "mon_pokeapi",
    startHoursAgo: 600,
    durationHours: 2,
    kind: "down",
    statusCode: 504,
    severity: "major",
    title: "Gateway timeouts on PokéAPI",
  },
];

const SAMPLE_HOURS = 30 * 24;

export function createSampleData(now = Date.now()): AppData {
  const rand = mulberry32(20261109);
  const anchor = Math.floor(now / HOUR) * HOUR;

  const monitors: Monitor[] = PROFILES.map((p, i) => ({
    ...p.monitor,
    createdAt: anchor - SAMPLE_HOURS * HOUR - (i + 1) * DAY,
  }));

  const checks: CheckResult[] = [];
  for (const profile of PROFILES) {
    const id = profile.monitor.id;
    const outages = OUTAGES.filter((o) => o.monitorId === id);
    const pausedFrom = profile.monitor.paused ? 6 * 24 : -1; // paused 6 days ago
    for (let h = SAMPLE_HOURS; h >= 0; h--) {
      if (pausedFrom >= 0 && h < pausedFrom) continue;
      const at = anchor - h * HOUR + Math.floor(rand() * 50) * 60000;
      if (at > now) continue;
      const outage = outages.find(
        (o) => h <= o.startHoursAgo && (o.durationHours === null || h > o.startHoursAgo - o.durationHours),
      );
      // daily wave so charts look natural
      const wave = Math.sin(((anchor - h * HOUR) / DAY) * Math.PI * 2) * profile.baseMs * 0.15;
      let ms = Math.max(30, Math.round(profile.baseMs + wave + (rand() - 0.5) * 2 * profile.jitterMs));

      if (outage?.kind === "down") {
        checks.push({
          monitorId: id,
          at,
          ok: false,
          statusCode: outage.statusCode,
          responseMs: outage.statusCode === null ? null : Math.round(ms * 0.6),
          error: outage.statusCode === null ? "Request timed out" : `Unexpected status ${outage.statusCode}`,
        });
        continue;
      }
      if (outage?.kind === "slow") ms = Math.round(ms * 2.6 + 300);

      if (rand() < profile.failureRate) {
        const codes = [500, 502, 503, 504, null];
        const picked = codes[Math.floor(rand() * codes.length)];
        const code = picked === undefined ? 500 : picked;
        checks.push({
          monitorId: id,
          at,
          ok: false,
          statusCode: code,
          responseMs: code === null ? null : ms,
          error: code === null ? "Request timed out" : `Unexpected status ${code}`,
        });
        continue;
      }
      checks.push({ monitorId: id, at, ok: true, statusCode: 200, responseMs: ms });
    }
  }
  checks.sort((a, b) => a.at - b.at);

  const incidents: Incident[] = [];
  const notifications: AppNotification[] = [];
  OUTAGES.forEach((o, i) => {
    const monitor = monitors.find((m) => m.id === o.monitorId)!;
    const startedAt = anchor - o.startHoursAgo * HOUR + 7 * 60000;
    const id = `inc_${String(i + 1).padStart(3, "0")}`;
    const events: Incident["events"] = [
      { at: startedAt, type: "opened", message: `Incident opened automatically: ${o.title}.` },
    ];
    let acknowledgedAt: number | undefined;
    let resolvedAt: number | undefined;
    if (o.durationHours !== null || o.acknowledged) {
      acknowledgedAt = startedAt + 9 * 60000;
      events.push({ at: acknowledgedAt, type: "acknowledged", message: `Acknowledged by ${DEFAULT_SETTINGS.account.name}.` });
    }
    if (o.durationHours !== null) {
      events.push({
        at: acknowledgedAt! + 20 * 60000,
        type: "update",
        message: "Upstream provider confirmed the issue and is deploying a fix.",
      });
      resolvedAt = startedAt + o.durationHours * HOUR;
      events.push({ at: resolvedAt, type: "resolved", message: "Checks are passing again. Incident resolved." });
    }
    const status = resolvedAt ? "resolved" : acknowledgedAt ? "acknowledged" : "open";
    incidents.push({ id, monitorId: monitor.id, title: o.title, severity: o.severity, status, startedAt, acknowledgedAt, resolvedAt, events });

    notifications.push({
      id: `ntf_${id}_open`,
      at: startedAt,
      kind: o.kind === "slow" ? "degraded" : "incident",
      title: o.kind === "slow" ? `${monitor.name} is degraded` : `${monitor.name} is down`,
      body: o.title,
      read: o.startHoursAgo > 24,
      incidentId: id,
      monitorId: monitor.id,
    });
    if (resolvedAt) {
      notifications.push({
        id: `ntf_${id}_resolved`,
        at: resolvedAt,
        kind: "recovery",
        title: `${monitor.name} recovered`,
        body: `Resolved after ${o.durationHours}h.`,
        read: true,
        incidentId: id,
        monitorId: monitor.id,
      });
    }
  });
  notifications.push({
    id: "ntf_welcome",
    at: anchor - SAMPLE_HOURS * HOUR,
    kind: "system",
    title: "Welcome to API Sentinel",
    body: "This workspace is loaded with sample data. Add your own monitors or reset it in Settings.",
    read: true,
  });
  incidents.sort((a, b) => b.startedAt - a.startedAt);
  notifications.sort((a, b) => b.at - a.at);

  return {
    version: 1,
    monitors,
    checks,
    incidents,
    notifications,
    settings: DEFAULT_SETTINGS,
    isSampleData: true,
  };
}

export function createEmptyData(settings: Settings = DEFAULT_SETTINGS): AppData {
  return {
    version: 1,
    monitors: [],
    checks: [],
    incidents: [],
    notifications: [],
    settings,
    isSampleData: false,
  };
}
