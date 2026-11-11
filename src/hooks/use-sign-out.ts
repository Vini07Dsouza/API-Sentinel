import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { clearSession } from "@/lib/auth/session";

/** Signs out: stops in-flight requests, drops cached data, clears the token, goes to /login. */
export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    clearSession();
    await navigate({ to: "/login", replace: true });
  };
}
