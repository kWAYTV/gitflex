import type { RepositoryOwnership } from "@gitflex/db/schema/repositories";
import type {
  GitHubRepository,
  GitHubViewer,
} from "@gitflex/github/repositories";

export function classifyOwnership(
  repository: Pick<GitHubRepository, "ownerId" | "ownerType">,
  viewer: GitHubViewer
): RepositoryOwnership {
  if (repository.ownerId === viewer.id) {
    return "owner";
  }
  if (repository.ownerType === "organization") {
    return "organization";
  }
  return "collaborator";
}

/**
 * Initial inclusion for a newly discovered repository. Only public, original,
 * user-owned repositories are included automatically; everything else is opt-in.
 */
export function isIncludedByDefault(
  repository: Pick<GitHubRepository, "isFork" | "isDisabled" | "visibility">,
  ownership: RepositoryOwnership
): boolean {
  return (
    ownership === "owner" &&
    repository.visibility === "public" &&
    !repository.isFork &&
    !repository.isDisabled
  );
}
