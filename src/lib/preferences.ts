// Display/form preferences stored in this browser only (the backend has no settings endpoint yet).
import { useSyncExternalStore } from "react";

import type { LocalPreferences } from "@/lib/types";

const KEY = "api-sentinel:preferences";

export const DEFAULT_PREFERENCES: LocalPreferences = {
  defaultIntervalSeconds: 60,
  defaultTimeoutMs: 10000,
  latencyWarningMs: 800,
  uptimeTarget: 99.5,
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: LocalPreferences = DEFAULT_PREFERENCES;

function read(): LocalPreferences {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<LocalPreferences>) } : DEFAULT_PREFERENCES;
    } catch {
      cached = DEFAULT_PREFERENCES;
    }
  }
  return cached;
}

export function savePreferences(prefs: LocalPreferences) {
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePreferences(): LocalPreferences {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES);
}
