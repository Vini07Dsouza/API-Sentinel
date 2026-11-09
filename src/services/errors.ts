export type ApiErrorKind =
  | "not_configured"
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server"
  | "http"
  | "parse";

/** Error thrown by every service call. UI states branch on `kind`. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly path: string;
  /** Field-level validation messages, when the backend provides them. */
  readonly fieldErrors: Record<string, string>;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number | null; path?: string; fieldErrors?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status ?? null;
    this.path = options.path ?? "";
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Network errors, timeouts and 5xx are worth retrying; client errors are not. */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.kind === "network" || error.kind === "timeout" || error.kind === "server";
}
