/**
 * Backend configuration. Set VITE_API_BASE_URL (e.g. http://localhost:8080) to point the
 * app at the Spring Boot backend. It is a public URL, not a secret.
 */
export function getApiBaseUrl(): string | null {
  const raw = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15000;
