import { AppError } from "@gitflex/shared/errors";
import { GraphqlResponseError } from "@octokit/graphql";
import { RequestError } from "@octokit/request-error";

function rateLimitReset(headers: Record<string, unknown>): Date | undefined {
  const reset = Number(headers["x-ratelimit-reset"]);
  return Number.isFinite(reset) && reset > 0
    ? new Date(reset * 1000)
    : undefined;
}

export function toGitHubAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof RequestError) {
    const headers = error.response?.headers ?? {};

    if (error.status === 401) {
      return new AppError(
        "GITHUB_TOKEN_INVALID",
        "GitHub access was revoked or expired. Sign in with GitHub again.",
        { cause: error }
      );
    }

    if (
      error.status === 429 ||
      (error.status === 403 && headers["x-ratelimit-remaining"] === "0")
    ) {
      return new AppError(
        "RATE_LIMITED",
        "GitHub rate limit reached. Try again later.",
        { cause: error, retryAfter: rateLimitReset(headers) }
      );
    }
  }

  if (error instanceof GraphqlResponseError) {
    const rateLimited = error.errors?.some(
      (graphqlError) => graphqlError.type === "RATE_LIMITED"
    );
    if (rateLimited) {
      return new AppError(
        "RATE_LIMITED",
        "GitHub rate limit reached. Try again later.",
        { cause: error }
      );
    }
  }

  return new AppError("INTERNAL_ERROR", "GitHub request failed.", {
    cause: error,
  });
}
