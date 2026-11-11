import { apiRequest } from "@/services/http";
import { ApiError } from "@/services/errors";
import { compact, toLatencyPoint, toOverview, toUptimePoint, unwrapList } from "@/services/mappers";
import type { AnalyticsOverviewDto, LatencyPointDto, ListResponse, UptimePointDto } from "@/services/dto";
import type { AnalyticsOverview, LatencyPoint, Period, UptimePoint } from "@/lib/types";

export interface AnalyticsQuery {
  period: Period;
  /** Omit for all monitors. */
  monitorId?: string | undefined;
}

export const analyticsService = {
  /** GET /api/analytics/overview?period=&monitorId= */
  async overview(q: AnalyticsQuery, signal?: AbortSignal): Promise<AnalyticsOverview> {
    const path = "/api/analytics/overview";
    const body = await apiRequest<AnalyticsOverviewDto>(path, { query: { ...q }, signal });
    if (!body) throw new ApiError("parse", "The backend returned an empty overview.", { path });
    return toOverview(body);
  },
  /** GET /api/analytics/uptime?period=&monitorId= */
  async uptime(q: AnalyticsQuery, signal?: AbortSignal): Promise<UptimePoint[]> {
    const body = await apiRequest<ListResponse<UptimePointDto>>("/api/analytics/uptime", { query: { ...q }, signal });
    return compact(unwrapList(body).map(toUptimePoint)).sort((a, b) => a.at - b.at);
  },
  /** GET /api/analytics/latency?period=&monitorId= */
  async latency(q: AnalyticsQuery, signal?: AbortSignal): Promise<LatencyPoint[]> {
    const body = await apiRequest<ListResponse<LatencyPointDto>>("/api/analytics/latency", { query: { ...q }, signal });
    return compact(unwrapList(body).map(toLatencyPoint)).sort((a, b) => a.at - b.at);
  },
};
