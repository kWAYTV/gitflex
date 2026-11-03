import { Octokit } from "@octokit/core";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

const MAX_RATE_LIMIT_WAIT_SECONDS = 60;

const GitHubOctokit = Octokit.plugin(throttling, retry);

export type GitHubClient = InstanceType<typeof GitHubOctokit>;

export interface GitHubClientOptions {
  userAgent?: string;
}

export function createGitHubClient(
  accessToken: string,
  options: GitHubClientOptions = {}
): GitHubClient {
  return new GitHubOctokit({
    auth: accessToken,
    retry: { retries: 2 },
    throttle: {
      onRateLimit: (retryAfter, _options, _octokit, retryCount) =>
        retryCount < 1 && retryAfter <= MAX_RATE_LIMIT_WAIT_SECONDS,
      onSecondaryRateLimit: (retryAfter, _options, _octokit, retryCount) =>
        retryCount < 2 && retryAfter <= MAX_RATE_LIMIT_WAIT_SECONDS,
    },
    userAgent: options.userAgent ?? "gitflex",
  });
}
