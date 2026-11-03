import { DEFAULT_SCORING_CONFIG } from "@gitflex/scoring/config";
import type { Dimension, ProfileScore } from "@gitflex/scoring/types";

import type { ShareSlice } from "@/features/insights/share-chart";

const SAMPLE_DIMENSIONS: [Dimension, number, number][] = [
  ["reliability", 40, 0.7],
  ["security", 19, 0.55],
  ["maintainability", 50, 0.7],
  ["uniqueness", 94, 0.65],
  ["contribution", 87, 0.6],
  ["influence", 41, 0.6],
];

/** A real profile from a scan of 86 repositories, without the account it belongs to. */
export const SAMPLE_SCORE: ProfileScore = {
  confidence: 0.64,
  dimensions: SAMPLE_DIMENSIONS.map(([dimension, score, confidence]) => ({
    confidence,
    dimension,
    metrics: [],
    score,
    weight: DEFAULT_SCORING_CONFIG.dimensionWeights[dimension],
  })),
  grade: "D",
  overall: 5.1,
  version: DEFAULT_SCORING_CONFIG.version,
};

export const SAMPLE_LANGUAGES: ShareSlice[] = [
  { color: "#3572a5", name: "Python", value: 44 },
  { color: "#3178c6", name: "TypeScript", value: 22 },
  { color: "#555555", name: "C", value: 4 },
  { color: "#f1e05a", name: "JavaScript", value: 3 },
  { color: "#f34b7d", name: "C++", value: 3 },
  { color: "#dea584", name: "Rust", value: 3 },
  { color: null, name: "Other", value: 7 },
];

export const SAMPLE_DOMAINS: {
  name: string;
  technologies: [string, number][];
}[] = [
  {
    name: "Backend",
    technologies: [
      ["Node.js", 23],
      ["Zod", 19],
      ["Bun", 7],
      ["Better Auth", 4],
    ],
  },
  {
    name: "Frontend",
    technologies: [
      ["React", 16],
      ["Tailwind CSS", 15],
      ["Next.js", 13],
      ["shadcn/ui", 13],
    ],
  },
  {
    name: "DevOps",
    technologies: [
      ["GitHub Actions", 26],
      ["Dependency automation", 3],
    ],
  },
  {
    name: "Database",
    technologies: [
      ["Drizzle ORM", 6],
      ["PostgreSQL", 4],
      ["Prisma", 3],
    ],
  },
];

export const SAMPLE_EVIDENCE = [
  { kind: "configuration", source: "apps/web/next.config.ts" },
  {
    kind: "dependency-with-structure",
    source: "apps/web/src/app/[locale]/about/page.tsx",
  },
  { kind: "dependency", source: "apps/web/package.json#next" },
];
