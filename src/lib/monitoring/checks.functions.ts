import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { HTTP_METHODS, type EndpointCheckResponse } from "@/lib/types";

/**
 * REAL endpoint check. Runs server-side so requests are not blocked by browser CORS rules.
 */
const authSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("bearer"), token: z.string().max(4096) }),
  z.object({ type: z.literal("basic"), username: z.string().max(512), password: z.string().max(512) }),
  z.object({ type: z.literal("apiKey"), headerName: z.string().max(256), value: z.string().max(4096) }),
]);

const checkSchema = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u), "Only http and https URLs are supported"),
  method: z.enum(HTTP_METHODS),
  timeoutMs: z.number().int().min(1000).max(30000),
  expectedStatus: z.number().int().min(100).max(599),
  headers: z.array(z.object({ key: z.string().max(256), value: z.string().max(4096) })).max(30),
  auth: authSchema,
});

const BLOCKED_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$|172\.(1[6-9]|2\d|3[01])\.)/i;

export const runEndpointCheck = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkSchema.parse(data))
  .handler(async ({ data }): Promise<EndpointCheckResponse> => {
    const checkedAt = Date.now();
    const target = new URL(data.url);
    if (BLOCKED_HOST.test(target.hostname)) {
      return { ok: false, statusCode: null, responseMs: null, error: "Private or local addresses can't be monitored", checkedAt };
    }

    const headers = new Headers();
    for (const h of data.headers) {
      if (h.key.trim()) headers.set(h.key.trim(), h.value);
    }
    if (data.auth.type === "bearer" && data.auth.token) {
      headers.set("Authorization", `Bearer ${data.auth.token}`);
    } else if (data.auth.type === "basic") {
      headers.set("Authorization", `Basic ${btoa(`${data.auth.username}:${data.auth.password}`)}`);
    } else if (data.auth.type === "apiKey" && data.auth.headerName.trim()) {
      headers.set(data.auth.headerName.trim(), data.auth.value);
    }
    if (!headers.has("User-Agent")) headers.set("User-Agent", "API-Sentinel/1.0 (+uptime check)");

    const hasBody = data.method !== "GET" && data.method !== "HEAD";
    const started = Date.now();
    try {
      const res = await fetch(target.toString(), {
        method: data.method,
        headers,
        body: hasBody ? "{}" : undefined,
        redirect: "follow",
        signal: AbortSignal.timeout(data.timeoutMs),
      });
      const responseMs = Date.now() - started;
      await res.body?.cancel().catch(() => undefined);
      const ok = res.status === data.expectedStatus;
      return {
        ok,
        statusCode: res.status,
        responseMs,
        error: ok ? undefined : `Expected ${data.expectedStatus}, received ${res.status}`,
        checkedAt,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      console.error("Endpoint check failed", target.host, err);
      return {
        ok: false,
        statusCode: null,
        responseMs: null,
        error: isTimeout ? `Timed out after ${data.timeoutMs} ms` : "Could not connect to the endpoint",
        checkedAt,
      };
    }
  });
