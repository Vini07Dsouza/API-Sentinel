import { useSyncExternalStore } from "react";

import { getSession, subscribeSession } from "@/lib/auth/session";
import type { AuthSession } from "@/lib/types";

/** Current JWT session; null when signed out (always null during SSR). */
export function useSession(): AuthSession | null {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}
