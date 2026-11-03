import { getTechnology } from "./lookup";
import type { TechnologyCategory } from "./types";

export interface Practice {
  description: string;
  id: string;
  impliedBy: {
    categories?: readonly TechnologyCategory[];
    technologies?: readonly string[];
  };
  name: string;
}

export const PRACTICES: readonly Practice[] = [
  {
    description: "Builds or checks run automatically on every change.",
    id: "continuous-integration",
    impliedBy: { technologies: ["github-actions", "gitlab-ci"] },
    name: "Continuous integration",
  },
  {
    description: "The project ships with an automated test framework.",
    id: "automated-testing",
    impliedBy: { categories: ["testing"] },
    name: "Automated testing",
  },
  {
    description: "The project is packaged and run as containers.",
    id: "containerization",
    impliedBy: { technologies: ["docker", "kubernetes"] },
    name: "Containerization",
  },
  {
    description: "Infrastructure is declared in version-controlled code.",
    id: "infrastructure-as-code",
    impliedBy: { technologies: ["terraform"] },
    name: "Infrastructure as code",
  },
  {
    description: "Dependency updates are proposed automatically.",
    id: "dependency-automation",
    impliedBy: { technologies: ["dependency-automation"] },
    name: "Dependency automation",
  },
  {
    description: "Code is statically typed or validated against schemas.",
    id: "static-typing",
    impliedBy: { technologies: ["typescript", "pydantic", "zod"] },
    name: "Static typing",
  },
  {
    description: "A linter or formatter enforces a consistent style.",
    id: "linting-and-formatting",
    impliedBy: { technologies: ["eslint", "prettier", "biome"] },
    name: "Linting and formatting",
  },
  {
    description: "Security scanners run against the codebase.",
    id: "security-scanning",
    impliedBy: { technologies: ["security-scanning"] },
    name: "Security scanning",
  },
];

export interface PracticeObservation {
  /** Repository ID mapped to the technology IDs that implied the practice there. */
  evidence: ReadonlyMap<string, readonly string[]>;
  practice: Practice;
}

export function implies(practice: Practice, technologyId: string): boolean {
  const { categories, technologies } = practice.impliedBy;
  if (technologies?.includes(technologyId)) {
    return true;
  }
  const category = getTechnology(technologyId)?.category;
  return category !== undefined && (categories?.includes(category) ?? false);
}

/** Derives practices per repository from detected technologies; practices with no evidence are omitted. */
export function derivePractices(
  detections: readonly { repositoryId: string; technologyId: string }[]
): PracticeObservation[] {
  return PRACTICES.flatMap((practice) => {
    const evidence = new Map<string, string[]>();
    for (const { repositoryId, technologyId } of detections) {
      if (implies(practice, technologyId)) {
        const existing = evidence.get(repositoryId);
        if (existing) {
          existing.push(technologyId);
        } else {
          evidence.set(repositoryId, [technologyId]);
        }
      }
    }
    return evidence.size > 0 ? [{ evidence, practice }] : [];
  });
}
