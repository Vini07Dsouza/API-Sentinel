import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { runEndpointCheck } from "@/lib/monitoring/checks.functions";
import { useSentinel } from "@/lib/store/sentinel-store";
import type { EndpointCheckRequest, EndpointCheckResponse, Monitor } from "@/lib/types";

/** Runs a real HTTP check against an endpoint via the server. */
export function useEndpointCheck() {
  const run = useServerFn(runEndpointCheck);
  return (request: EndpointCheckRequest): Promise<EndpointCheckResponse> => run({ data: request });
}

/** Runs a real check for a saved monitor and records the result in the workspace. */
export function useRunMonitorCheck() {
  const check = useEndpointCheck();
  const { actions } = useSentinel();
  const [runningId, setRunningId] = useState<string | null>(null);

  const runCheck = async (monitor: Monitor) => {
    setRunningId(monitor.id);
    try {
      const result = await check({
        url: monitor.url,
        method: monitor.method,
        timeoutMs: monitor.timeoutMs,
        expectedStatus: monitor.expectedStatus,
        headers: monitor.headers,
        auth: monitor.auth,
      });
      actions.recordCheck({
        monitorId: monitor.id,
        at: result.checkedAt,
        ok: result.ok,
        statusCode: result.statusCode,
        responseMs: result.responseMs,
        error: result.error,
      });
      if (result.ok) {
        toast.success(`${monitor.name} is responding`, {
          description: `HTTP ${result.statusCode} in ${result.responseMs} ms`,
        });
      } else {
        toast.error(`${monitor.name} check failed`, { description: result.error });
      }
      return result;
    } catch (err) {
      console.error(err);
      toast.error("Couldn't run the check", { description: "Please try again in a moment." });
      return null;
    } finally {
      setRunningId(null);
    }
  };

  return { runCheck, runningId };
}
