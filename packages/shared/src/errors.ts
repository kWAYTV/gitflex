export const APP_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "GITHUB_NOT_CONNECTED",
  "GITHUB_TOKEN_INVALID",
  "SCAN_ALREADY_RUNNING",
  "SCAN_NOT_AVAILABLE",
  "REPOSITORY_ACCESS_REVOKED",
  "ANALYSIS_FAILED",
  "INTERNAL_ERROR",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryAfter?: Date;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { cause?: unknown; retryAfter?: Date }
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.retryAfter = options?.retryAfter;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string };

export function toActionError(error: unknown): {
  ok: false;
  code: AppErrorCode;
  message: string;
} {
  if (isAppError(error)) {
    return { code: error.code, message: error.message, ok: false };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again.",
    ok: false,
  };
}
