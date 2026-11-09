import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

import { createEmptyData, createSampleData } from "@/lib/mock/seed";
import { DAY, deriveStatus, groupChecksByMonitor, latencyStats, uptimePercent } from "@/lib/monitoring/metrics";
import type {
  AppData,
  AppNotification,
  CheckResult,
  Incident,
  Monitor,
  MonitorInput,
  MonitorStatus,
  Settings,
} from "@/lib/types";

const STORAGE_KEY = "api-sentinel:v1";
const RETENTION_MS = 31 * DAY;

type State =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: AppData; error: null }
  | { status: "error"; data: null; error: string };

type Action =
  | { type: "loaded"; data: AppData }
  | { type: "failed"; error: string }
  | { type: "replace"; data: AppData }
  | { type: "addMonitor"; monitor: Monitor }
  | { type: "updateMonitor"; id: string; input: MonitorInput }
  | { type: "setPaused"; id: string; paused: boolean; now: number }
  | { type: "deleteMonitor"; id: string }
  | { type: "recordCheck"; check: CheckResult; ids: { incident: string; notification: string } }
  | { type: "acknowledge"; id: string; now: number; by: string }
  | { type: "resolve"; id: string; now: number; by: string; notificationId: string }
  | { type: "note"; id: string; now: number; message: string }
  | { type: "markRead"; id: string }
  | { type: "markAllRead" }
  | { type: "deleteNotification"; id: string }
  | { type: "updateSettings"; settings: Settings };

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function update(data: AppData, patch: Partial<AppData>): AppData {
  return { ...data, ...patch };
}

function consecutiveFailures(checks: CheckResult[], monitorId: string): number {
  let count = 0;
  for (let i = checks.length - 1; i >= 0; i--) {
    const c = checks[i];
    if (!c) continue;
    if (c.monitorId !== monitorId) continue;
    if (c.ok) break;
    count++;
  }
  return count;
}

function applyCheck(data: AppData, check: CheckResult, ids: { incident: string; notification: string }): AppData {
  const cutoff = check.at - RETENTION_MS;
  const checks = [...data.checks.filter((c) => c.at >= cutoff), check];
  const monitor = data.monitors.find((m) => m.id === check.monitorId);
  if (!monitor) return update(data, { checks });

  const { thresholds, notifications: prefs } = data.settings;
  const openIncident = data.incidents.find((i) => i.monitorId === monitor.id && i.status !== "resolved");
  let incidents = data.incidents;
  const notifications = [...data.notifications];

  if (!check.ok) {
    const failures = consecutiveFailures(checks, monitor.id);
    if (!openIncident && failures >= thresholds.consecutiveFailures) {
      const severity = check.statusCode === null || check.statusCode >= 500 ? "critical" : "major";
      const title = check.statusCode
        ? `${monitor.name} returned ${check.statusCode}`
        : `${monitor.name} is unreachable`;
      const incident: Incident = {
        id: ids.incident,
        monitorId: monitor.id,
        title,
        severity,
        status: "open",
        startedAt: check.at,
        events: [
          {
            at: check.at,
            type: "opened",
            message: `Opened after ${failures} consecutive failed check${failures === 1 ? "" : "s"}: ${check.error ?? "check failed"}.`,
          },
        ],
      };
      incidents = [incident, ...incidents];
      if (prefs.onIncidentOpened) {
        notifications.unshift({
          id: ids.notification,
          at: check.at,
          kind: "incident",
          title: `${monitor.name} is down`,
          body: title,
          read: false,
          incidentId: incident.id,
          monitorId: monitor.id,
        });
      }
    }
  } else if (openIncident) {
    incidents = incidents.map((i) =>
      i.id === openIncident.id
        ? {
            ...i,
            status: "resolved",
            resolvedAt: check.at,
            events: [...i.events, { at: check.at, type: "resolved", message: "Check passed. Incident resolved automatically." }],
          }
        : i,
    );
    if (prefs.onIncidentResolved) {
      notifications.unshift({
        id: ids.notification,
        at: check.at,
        kind: "recovery",
        title: `${monitor.name} recovered`,
        body: `Responded with ${check.statusCode} in ${check.responseMs} ms.`,
        read: false,
        incidentId: openIncident.id,
        monitorId: monitor.id,
      });
    }
  } else if (check.responseMs !== null && check.responseMs > thresholds.latencyWarningMs && prefs.onDegraded) {
    notifications.unshift({
      id: ids.notification,
      at: check.at,
      kind: "degraded",
      title: `${monitor.name} is degraded`,
      body: `Responded in ${check.responseMs} ms (threshold ${thresholds.latencyWarningMs} ms).`,
      read: false,
      monitorId: monitor.id,
    });
  }

  return update(data, { checks, incidents, notifications });
}

function reducer(state: State, action: Action): State {
  if (action.type === "loaded" || action.type === "replace") {
    return { status: "ready", data: action.data, error: null };
  }
  if (action.type === "failed") return { status: "error", data: null, error: action.error };
  if (state.status !== "ready") return state;
  const data = state.data;
  const next = (d: AppData): State => ({ status: "ready", data: d, error: null });

  switch (action.type) {
    case "addMonitor":
      return next(update(data, { monitors: [...data.monitors, action.monitor] }));
    case "updateMonitor":
      return next(
        update(data, {
          monitors: data.monitors.map((m) => (m.id === action.id ? { ...m, ...action.input } : m)),
        }),
      );
    case "setPaused":
      return next(
        update(data, {
          monitors: data.monitors.map((m) => (m.id === action.id ? { ...m, paused: action.paused } : m)),
        }),
      );
    case "deleteMonitor": {
      return next(
        update(data, {
          monitors: data.monitors.filter((m) => m.id !== action.id),
          checks: data.checks.filter((c) => c.monitorId !== action.id),
          incidents: data.incidents.filter((i) => i.monitorId !== action.id),
          notifications: data.notifications.filter((n) => n.monitorId !== action.id),
        }),
      );
    }
    case "recordCheck":
      return next(applyCheck(data, action.check, action.ids));
    case "acknowledge":
      return next(
        update(data, {
          incidents: data.incidents.map((i) =>
            i.id === action.id && i.status === "open"
              ? {
                  ...i,
                  status: "acknowledged",
                  acknowledgedAt: action.now,
                  events: [...i.events, { at: action.now, type: "acknowledged", message: `Acknowledged by ${action.by}.` }],
                }
              : i,
          ),
        }),
      );
    case "resolve": {
      const incident = data.incidents.find((i) => i.id === action.id);
      if (!incident || incident.status === "resolved") return state;
      const monitor = data.monitors.find((m) => m.id === incident.monitorId);
      const notifications: AppNotification[] = data.settings.notifications.onIncidentResolved
        ? [
            {
              id: action.notificationId,
              at: action.now,
              kind: "recovery",
              title: `${monitor?.name ?? "Incident"} resolved`,
              body: `${incident.title} was marked resolved by ${action.by}.`,
              read: false,
              incidentId: incident.id,
              monitorId: incident.monitorId,
            },
            ...data.notifications,
          ]
        : data.notifications;
      return next(
        update(data, {
          notifications,
          incidents: data.incidents.map((i) =>
            i.id === action.id
              ? {
                  ...i,
                  status: "resolved",
                  resolvedAt: action.now,
                  acknowledgedAt: i.acknowledgedAt ?? action.now,
                  events: [...i.events, { at: action.now, type: "resolved", message: `Resolved by ${action.by}.` }],
                }
              : i,
          ),
        }),
      );
    }
    case "note":
      return next(
        update(data, {
          incidents: data.incidents.map((i) =>
            i.id === action.id ? { ...i, events: [...i.events, { at: action.now, type: "note", message: action.message }] } : i,
          ),
        }),
      );
    case "markRead":
      return next(
        update(data, {
          notifications: data.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
        }),
      );
    case "markAllRead":
      return next(update(data, { notifications: data.notifications.map((n) => ({ ...n, read: true })) }));
    case "deleteNotification":
      return next(update(data, { notifications: data.notifications.filter((n) => n.id !== action.id) }));
    case "updateSettings":
      return next(update(data, { settings: action.settings }));
    default:
      return state;
  }
}

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppData>;
  return (
    v.version === 1 &&
    Array.isArray(v.monitors) &&
    Array.isArray(v.checks) &&
    Array.isArray(v.incidents) &&
    Array.isArray(v.notifications) &&
    typeof v.settings === "object"
  );
}

export interface SentinelActions {
  addMonitor: (input: MonitorInput) => string;
  updateMonitor: (id: string, input: MonitorInput) => void;
  setPaused: (id: string, paused: boolean) => void;
  deleteMonitor: (id: string) => void;
  recordCheck: (check: CheckResult) => void;
  acknowledgeIncident: (id: string) => void;
  resolveIncident: (id: string) => void;
  addIncidentNote: (id: string, message: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  updateSettings: (settings: Settings) => void;
  resetSampleData: () => void;
  clearAllData: () => void;
}

interface ContextValue {
  state: State;
  actions: SentinelActions;
  retry: () => void;
}

const SentinelContext = createContext<ContextValue | null>(null);

function loadFromStorage(): AppData {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createSampleData();
  const parsed: unknown = JSON.parse(raw);
  if (!isAppData(parsed)) throw new Error("Saved workspace data is in an unexpected format.");
  return parsed;
}

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { status: "loading", data: null, error: null } as State);

  const load = useCallback(() => {
    try {
      dispatch({ type: "loaded", data: loadFromStorage() });
    } catch (err) {
      dispatch({ type: "failed", error: err instanceof Error ? err.message : "Could not load workspace data." });
    }
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (state.status !== "ready") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (err) {
      console.error("Failed to persist workspace", err);
    }
  }, [state]);

  const userName = state.status === "ready" ? state.data.settings.account.name : "You";

  const actions = useMemo<SentinelActions>(
    () => ({
      addMonitor: (input) => {
        const monitor: Monitor = { ...input, id: uid("mon"), paused: false, createdAt: Date.now() };
        dispatch({ type: "addMonitor", monitor });
        return monitor.id;
      },
      updateMonitor: (id, input) => dispatch({ type: "updateMonitor", id, input }),
      setPaused: (id, paused) => dispatch({ type: "setPaused", id, paused, now: Date.now() }),
      deleteMonitor: (id) => dispatch({ type: "deleteMonitor", id }),
      recordCheck: (check) =>
        dispatch({ type: "recordCheck", check, ids: { incident: uid("inc"), notification: uid("ntf") } }),
      acknowledgeIncident: (id) => dispatch({ type: "acknowledge", id, now: Date.now(), by: userName }),
      resolveIncident: (id) =>
        dispatch({ type: "resolve", id, now: Date.now(), by: userName, notificationId: uid("ntf") }),
      addIncidentNote: (id, message) => dispatch({ type: "note", id, now: Date.now(), message }),
      markNotificationRead: (id) => dispatch({ type: "markRead", id }),
      markAllNotificationsRead: () => dispatch({ type: "markAllRead" }),
      deleteNotification: (id) => dispatch({ type: "deleteNotification", id }),
      updateSettings: (settings) => dispatch({ type: "updateSettings", settings }),
      resetSampleData: () => dispatch({ type: "replace", data: createSampleData() }),
      clearAllData: () =>
        dispatch({
          type: "replace",
          data: createEmptyData(state.status === "ready" ? state.data.settings : undefined),
        }),
    }),
    [userName, state.status, state.data?.settings],
  );

  const value = useMemo<ContextValue>(() => ({ state, actions, retry: load }), [state, actions, load]);
  return <SentinelContext.Provider value={value}>{children}</SentinelContext.Provider>;
}

export function useSentinel() {
  const ctx = useContext(SentinelContext);
  if (!ctx) throw new Error("useSentinel must be used within <SentinelProvider>");
  return ctx;
}

export interface MonitorSummary {
  monitor: Monitor;
  status: MonitorStatus;
  latest?: CheckResult | undefined;
  checks: CheckResult[];
  uptime24h: number | null;
  uptime30d: number | null;
  avg24h: number | null;
  openIncident?: Incident | undefined;
}

export function summarizeMonitors(data: AppData, now = Date.now()): MonitorSummary[] {
  const byMonitor = groupChecksByMonitor(data.checks);
  return data.monitors.map((monitor) => {
    const checks = byMonitor.get(monitor.id) ?? [];
    const latest = checks[checks.length - 1];
    const last24 = checks.filter((c) => c.at >= now - DAY);
    const last30 = checks.filter((c) => c.at >= now - 30 * DAY);
    return {
      monitor,
      checks,
      latest,
      status: deriveStatus(monitor, latest, data.settings.thresholds),
      uptime24h: uptimePercent(last24),
      uptime30d: uptimePercent(last30),
      avg24h: latencyStats(last24).avg,
      openIncident: data.incidents.find((i) => i.monitorId === monitor.id && i.status !== "resolved"),
    };
  });
}

export function useMonitorSummaries(data: AppData | null): MonitorSummary[] {
  return useMemo(() => (data ? summarizeMonitors(data) : []), [data]);
}
