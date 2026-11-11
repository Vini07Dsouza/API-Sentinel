import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Clock, KeyRound, PlugZap, RotateCcw, ServerCrash, Unplug, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/services/config";
import { ApiError, isApiError, type ApiErrorKind } from "@/services/errors";
import { cn } from "@/lib/utils";

const COPY: Record<ApiErrorKind, { icon: React.ComponentType<{ className?: string }>; title: string; hint: string }> = {
  not_configured: {
    icon: Unplug,
    title: "Backend not connected",
    hint: "Set VITE_API_BASE_URL to your Spring Boot server's address to load this data.",
  },
  network: {
    icon: WifiOff,
    title: "Can't reach the backend",
    hint: "Check that the server is running and allows requests from this site (CORS).",
  },
  timeout: { icon: Clock, title: "The backend took too long to respond", hint: "Try again in a moment." },
  unauthorized: { icon: KeyRound, title: "Your session has expired", hint: "Sign in again to continue." },
  forbidden: { icon: KeyRound, title: "You don't have access to this", hint: "Ask an administrator for access." },
  not_found: {
    icon: PlugZap,
    title: "Not available on the backend yet",
    hint: "This endpoint returned 404. It may not be implemented yet.",
  },
  validation: { icon: ServerCrash, title: "The backend rejected the request", hint: "" },
  server: { icon: ServerCrash, title: "The backend returned an error", hint: "Try again, or check the server logs." },
  http: { icon: ServerCrash, title: "The request failed", hint: "" },
  parse: { icon: ServerCrash, title: "Unexpected response from the backend", hint: "The response didn't match the expected format." },
};

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return new ApiError("http", error instanceof Error ? error.message : "Something went wrong.");
}

/** Friendly error panel for failed backend requests. Never shows fallback data. */
export function ApiErrorState({
  error,
  onRetry,
  compact = false,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const err = toApiError(error);
  const copy = COPY[err.kind];
  const base = getApiBaseUrl();
  const showMessage = err.kind === "validation" || err.kind === "http" || err.kind === "server";
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12", className)}
    >
      <div className="flex size-10 items-center justify-center rounded-xl border bg-secondary">
        <copy.icon className="size-5 text-secondary-foreground" />
      </div>
      <div className="max-w-md">
        <p className="text-sm font-semibold text-card-foreground">{copy.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{showMessage ? err.message : copy.hint}</p>
        {err.path ? (
          <p className="mt-2 break-all font-mono text-[0.7rem] text-muted-foreground">
            {err.status ? `${err.status} · ` : ""}
            {base ?? ""}
            {err.path}
          </p>
        ) : null}
      </div>
      {onRetry && err.kind !== "not_configured" ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw /> Retry
        </Button>
      ) : null}
    </div>
  );
}

/** Renders loading → error → empty → data for a query, so every view handles all states. */
export function QueryState<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  compact,
  children,
}: {
  query: UseQueryResult<T>;
  skeleton: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  compact?: boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <ApiErrorState error={query.error} onRetry={() => void query.refetch()} compact={compact} />;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
