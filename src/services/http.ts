import { clearSession, getSession } from "@/lib/auth/session";
import { DEFAULT_TIMEOUT_MS, getApiBaseUrl } from "@/services/config";
import { ApiError } from "@/services/errors";
import type { SpringErrorDto } from "@/services/dto";

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
  /** Attach the JWT bearer token (default true). */
  auth?: boolean;
}

function buildUrl(base: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function messageFrom(body: SpringErrorDto | null, fallback: string): string {
  if (!body) return fallback;
  return body.message || body.detail || body.error || fallback;
}

function fieldErrorsFrom(body: SpringErrorDto | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of body?.errors ?? []) {
    if (e.field) out[e.field] = e.defaultMessage ?? e.message ?? "Invalid value";
  }
  return out;
}

/**
 * Central HTTP client for the Spring Boot backend.
 * Resolves with the parsed JSON body, or null for empty responses (e.g. 204).
 * Rejects with ApiError for every failure — callers never receive invented data.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError("not_configured", "The backend URL (VITE_API_BASE_URL) is not set.", { path });
  }
  const { method = "GET", body, query, signal, timeoutMs = DEFAULT_TIMEOUT_MS, auth = true } = options;

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (auth) {
    const session = getSession();
    if (session) headers.set("Authorization", `Bearer ${session.token}`);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let response: Response;
  try {
    response = await fetch(buildUrl(base, path, query), {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) throw new ApiError("timeout", `The backend didn't respond within ${timeoutMs / 1000}s.`, { path });
    if (signal?.aborted) throw err;
    throw new ApiError("network", "Couldn't reach the backend.", { path });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (response.ok) throw new ApiError("parse", "The backend returned a response that isn't JSON.", { status: response.status, path });
    }
  }

  if (!response.ok) {
    const errBody = parsed && typeof parsed === "object" ? (parsed as SpringErrorDto) : null;
    const status = response.status;
    const opts = { status, path, fieldErrors: fieldErrorsFrom(errBody) };
    if (status === 401) {
      if (auth) clearSession();
      throw new ApiError("unauthorized", messageFrom(errBody, "Your session has expired. Please sign in again."), opts);
    }
    if (status === 403) throw new ApiError("forbidden", messageFrom(errBody, "You don't have access to this."), opts);
    if (status === 404) throw new ApiError("not_found", messageFrom(errBody, "Not found."), opts);
    if (status === 400 || status === 409 || status === 422) {
      throw new ApiError("validation", messageFrom(errBody, "The backend rejected the request."), opts);
    }
    if (status >= 500) throw new ApiError("server", messageFrom(errBody, `The backend returned an error (${status}).`), opts);
    throw new ApiError("http", messageFrom(errBody, `Request failed with status ${status}.`), opts);
  }

  return (parsed as T | null) ?? null;
}
