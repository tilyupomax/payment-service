export type ErrorKind =
  | "validation"
  | "not-found"
  | "conflict"
  | "invariant"
  | "infrastructure"
  | "unexpected";

export interface AppError {
  kind: ErrorKind;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export const createError = (
  kind: ErrorKind,
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown
): AppError => ({
  kind,
  message,
  ...(details ? { details } : {}),
  ...(cause ? { cause } : {})
});
