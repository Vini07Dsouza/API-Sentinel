import { apiRequest } from "@/services/http";
import { compact, toCheck, toMonitor, toMonitorRequest, unwrapList } from "@/services/mappers";
import { ApiError } from "@/services/errors";
import type { CheckDto, ListResponse, MonitorDto } from "@/services/dto";
import type { CheckResult, Monitor, MonitorInput, Period } from "@/lib/types";

const base = "/api/monitors";
const enc = encodeURIComponent;

function requireBody<T>(body: T | null, path: string): T {
  if (body === null) throw new ApiError("parse", "The backend returned an empty response.", { path });
  return body;
}

export const monitorsService = {
  /** GET /api/monitors */
  async list(signal?: AbortSignal): Promise<Monitor[]> {
    return unwrapList(await apiRequest<ListResponse<MonitorDto>>(base, { signal })).map(toMonitor);
  },
  /** GET /api/monitors/{id} */
  async get(id: string, signal?: AbortSignal): Promise<Monitor> {
    const path = `${base}/${enc(id)}`;
    return toMonitor(requireBody(await apiRequest<MonitorDto>(path, { signal }), path));
  },
  /** POST /api/monitors */
  async create(input: MonitorInput): Promise<Monitor | null> {
    const res = await apiRequest<MonitorDto>(base, { method: "POST", body: toMonitorRequest(input) });
    return res ? toMonitor(res) : null;
  },
  /** PUT /api/monitors/{id} */
  async update(id: string, input: MonitorInput): Promise<Monitor | null> {
    const res = await apiRequest<MonitorDto>(`${base}/${enc(id)}`, { method: "PUT", body: toMonitorRequest(input) });
    return res ? toMonitor(res) : null;
  },
  /** DELETE /api/monitors/{id} */
  async remove(id: string): Promise<void> {
    await apiRequest<unknown>(`${base}/${enc(id)}`, { method: "DELETE" });
  },
  /** POST /api/monitors/{id}/pause */
  async pause(id: string): Promise<void> {
    await apiRequest<unknown>(`${base}/${enc(id)}/pause`, { method: "POST" });
  },
  /** POST /api/monitors/{id}/resume */
  async resume(id: string): Promise<void> {
    await apiRequest<unknown>(`${base}/${enc(id)}/resume`, { method: "POST" });
  },
  /** GET /api/monitors/{id}/checks?period= — results sorted oldest first. */
  async checks(id: string, period: Period, signal?: AbortSignal): Promise<CheckResult[]> {
    const body = await apiRequest<ListResponse<CheckDto>>(`${base}/${enc(id)}/checks`, { query: { period }, signal });
    return compact(unwrapList(body).map((c) => toCheck(c, id))).sort((a, b) => a.at - b.at);
  },
};
