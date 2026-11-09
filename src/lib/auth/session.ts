// JWT session storage. Plain module (no React) so route guards can read it.
import type { AuthSession } from "@/lib/types";

const STORAGE_KEY = "api-sentinel:session";
type Listener = () => void;
const listeners = new Set<Listener>();

let cachedRaw: string | null | undefined;
let cachedSession: AuthSession | null = null;

function decodeJwtExpiry(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Returns the current session, or null when signed out or the token has expired. */
export function getSession(): AuthSession | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed && typeof parsed.token === "string" && parsed.token) cachedSession = parsed;
      } catch {
        cachedSession = null;
      }
    }
  }
  if (cachedSession?.expiresAt && cachedSession.expiresAt <= Date.now()) return null;
  return cachedSession;
}

export function setSession(session: AuthSession): void {
  const expiresAt = session.expiresAt ?? decodeJwtExpiry(session.token);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, expiresAt }));
  listeners.forEach((l) => l());
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
