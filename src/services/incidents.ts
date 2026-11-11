import { apiRequest } from "@/services/http";
import { compact, toIncident, unwrapList } from "@/services/mappers";
import type { IncidentDto, ListResponse } from "@/services/dto";
import type { Incident } from "@/lib/types";

export const incidentsService = {
  /** GET /api/incidents — newest first. */
  async list(signal?: AbortSignal): Promise<Incident[]> {
    const body = await apiRequest<ListResponse<IncidentDto>>("/api/incidents", { signal });
    return compact(unwrapList(body).map(toIncident)).sort((a, b) => b.startedAt - a.startedAt);
  },
};
