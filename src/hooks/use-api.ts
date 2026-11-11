// TanStack Query hooks over the service layer. Components never call fetch directly.
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { analyticsService, type AnalyticsQuery } from "@/services/analytics";
import { incidentsService } from "@/services/incidents";
import { monitorsService } from "@/services/monitors";
import type { MonitorInput, Period } from "@/lib/types";

const LIVE_REFRESH_MS = 30_000;

export const queryKeys = {
  monitors: ["monitors"] as const,
  monitor: (id: string) => ["monitors", id] as const,
  checks: (id: string, period: Period) => ["monitors", id, "checks", period] as const,
  incidents: ["incidents"] as const,
  analytics: ["analytics"] as const,
  overview: (q: AnalyticsQuery) => ["analytics", "overview", q.period, q.monitorId ?? "all"] as const,
  uptime: (q: AnalyticsQuery) => ["analytics", "uptime", q.period, q.monitorId ?? "all"] as const,
  latency: (q: AnalyticsQuery) => ["analytics", "latency", q.period, q.monitorId ?? "all"] as const,
};

export function useMonitors() {
  return useQuery({
    queryKey: queryKeys.monitors,
    queryFn: ({ signal }) => monitorsService.list(signal),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useMonitor(id: string) {
  return useQuery({ queryKey: queryKeys.monitor(id), queryFn: ({ signal }) => monitorsService.get(id, signal) });
}

export function useMonitorChecks(id: string | undefined, period: Period) {
  return useQuery({
    queryKey: queryKeys.checks(id ?? "", period),
    queryFn: ({ signal }) => monitorsService.checks(id!, period, signal),
    enabled: !!id,
  });
}

/** Check history for several monitors at once (one request per monitor). */
export function useChecksForMonitors(ids: string[], period: Period) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.checks(id, period),
      queryFn: ({ signal }: { signal: AbortSignal }) => monitorsService.checks(id, period, signal),
    })),
  });
}

export function useIncidents() {
  return useQuery({
    queryKey: queryKeys.incidents,
    queryFn: ({ signal }) => incidentsService.list(signal),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useAnalyticsOverview(q: AnalyticsQuery) {
  return useQuery({
    queryKey: queryKeys.overview(q),
    queryFn: ({ signal }) => analyticsService.overview(q, signal),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useUptimeSeries(q: AnalyticsQuery) {
  return useQuery({ queryKey: queryKeys.uptime(q), queryFn: ({ signal }) => analyticsService.uptime(q, signal) });
}

export function useLatencySeries(q: AnalyticsQuery) {
  return useQuery({ queryKey: queryKeys.latency(q), queryFn: ({ signal }) => analyticsService.latency(q, signal) });
}

function useInvalidateMonitorData() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.monitors }),
      qc.invalidateQueries({ queryKey: queryKeys.analytics }),
    ]);
}

export function useCreateMonitor() {
  const invalidate = useInvalidateMonitorData();
  return useMutation({ mutationFn: (input: MonitorInput) => monitorsService.create(input), onSuccess: invalidate });
}

export function useUpdateMonitor(id: string) {
  const invalidate = useInvalidateMonitorData();
  return useMutation({ mutationFn: (input: MonitorInput) => monitorsService.update(id, input), onSuccess: invalidate });
}

export function useDeleteMonitor() {
  const invalidate = useInvalidateMonitorData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => monitorsService.remove(id),
    onSuccess: async () => {
      await invalidate();
      await qc.invalidateQueries({ queryKey: queryKeys.incidents });
    },
  });
}

export function useSetMonitorPaused() {
  const invalidate = useInvalidateMonitorData();
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      paused ? monitorsService.pause(id) : monitorsService.resume(id),
    onSuccess: invalidate,
  });
}
