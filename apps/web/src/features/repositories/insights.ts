import type {
  RepositoryAnalysisState,
  RepositoryLanguageRow,
  RepositoryTechnologyRow,
} from "@gitflex/db/queries/insights";

import { isApplicationLanguage } from "@/features/insights/languages";

export type AnalysisStatus =
  | "analyzed"
  | "failed"
  | "skipped"
  | "pending"
  | "not-analyzed";

export interface RepositoryInsight {
  languages: { color: string | null; name: string }[];
  message: string | null;
  status: AnalysisStatus;
  technologies: { id: string; name: string }[];
}

const MAX_LANGUAGES = 3;
const MAX_TECHNOLOGIES = 5;

function toStatus(state: RepositoryAnalysisState | undefined): AnalysisStatus {
  switch (state?.status) {
    case undefined:
      return "not-analyzed";
    case "completed":
      return "analyzed";
    case "failed":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "pending";
  }
}

/** Plain-object map so it can cross the server/client boundary. */
export function buildRepositoryInsights(
  states: readonly RepositoryAnalysisState[],
  languages: readonly RepositoryLanguageRow[],
  technologies: readonly RepositoryTechnologyRow[]
): Record<string, RepositoryInsight> {
  const languagesByRepository = Map.groupBy(
    languages.filter((row) =>
      isApplicationLanguage({ id: row.id, type: "programming" })
    ),
    (row) => row.repositoryId
  );
  const technologiesByRepository = Map.groupBy(
    technologies,
    (row) => row.repositoryId
  );
  return Object.fromEntries(
    states.map((state) => [
      state.repositoryId,
      {
        languages: (languagesByRepository.get(state.repositoryId) ?? [])
          .slice(0, MAX_LANGUAGES)
          .map(({ color, name }) => ({ color, name })),
        message: state.status === "completed" ? null : state.errorMessage,
        status: toStatus(state),
        technologies: (technologiesByRepository.get(state.repositoryId) ?? [])
          .slice(0, MAX_TECHNOLOGIES)
          .map(({ name, technologyId }) => ({ id: technologyId, name })),
      },
    ])
  );
}
