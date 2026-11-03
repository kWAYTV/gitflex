// biome-ignore lint/performance/noNamespaceImport: the package only exposes languages as named exports
import * as linguist from "linguist-languages";

export type LanguageType =
  | "programming"
  | "markup"
  | "data"
  | "prose"
  | "unknown";

export type LanguageRole =
  | "primary"
  | "secondary"
  | "configuration"
  | "markup"
  | "documentation";

export interface LanguageStat {
  bytes: number;
  color: string | null;
  name: string;
  /** Share of all classified bytes, 0-100. */
  percentage: number;
  role: LanguageRole;
  type: LanguageType;
}

export interface LanguageAnalysis {
  languages: LanguageStat[];
  primary: string | null;
  totalBytes: number;
}

interface LinguistEntry {
  color?: string;
  name: string;
  type: string;
}

const LANGUAGES = new Map<string, LinguistEntry>(
  Object.values(linguist as Record<string, LinguistEntry>).map((entry) => [
    entry.name.toLowerCase(),
    entry,
  ])
);

const KNOWN_TYPES = new Set<LanguageType>([
  "programming",
  "markup",
  "data",
  "prose",
]);

function lookupType(entry: LinguistEntry | undefined): LanguageType {
  const type = entry?.type as LanguageType | undefined;
  return type && KNOWN_TYPES.has(type) ? type : "unknown";
}

function roleFor(type: LanguageType, isPrimary: boolean): LanguageRole {
  if (isPrimary) {
    return "primary";
  }
  switch (type) {
    case "data":
      return "configuration";
    case "markup":
      return "markup";
    case "prose":
      return "documentation";
    default:
      return "secondary";
  }
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Classifies Linguist byte counts. Linguist already drops vendored, generated and
 * documentation paths, so these counts are used as-is rather than recomputed from extensions.
 */
export function analyzeLanguages(
  bytesByLanguage: Readonly<Record<string, number>>
): LanguageAnalysis {
  const entries = Object.entries(bytesByLanguage)
    .filter(([, bytes]) => bytes > 0)
    .sort(([, a], [, b]) => b - a);
  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  const typed = entries.map(([name, bytes]) => {
    const entry = LANGUAGES.get(name.toLowerCase());
    return {
      bytes,
      color: entry?.color ?? null,
      name,
      type: lookupType(entry),
    };
  });
  const primary =
    typed.find(({ type }) => type === "programming")?.name ??
    typed[0]?.name ??
    null;

  return {
    languages: typed.map((language) => ({
      ...language,
      percentage:
        totalBytes === 0 ? 0 : round((language.bytes / totalBytes) * 100),
      role: roleFor(language.type, language.name === primary),
    })),
    primary,
    totalBytes,
  };
}
