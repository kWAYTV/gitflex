import type { LanguageOverview } from "@gitflex/db/queries/insights";

/** Linguist types these as "programming", but they describe builds rather than application code. */
const BUILD_LANGUAGES = new Set([
  "batchfile",
  "cmake",
  "dockerfile",
  "just",
  "makefile",
  "meson",
  "nix",
  "starlark",
  "xmake",
]);

export function isApplicationLanguage(language: {
  id: string;
  type: string;
}): boolean {
  return language.type === "programming" && !BUILD_LANGUAGES.has(language.id);
}

export type LanguageWeighting = "bytes" | "repositories";

export function languageWeight(
  language: LanguageOverview,
  weighting: LanguageWeighting
): number {
  return weighting === "bytes"
    ? language.bytes
    : language.significantRepositories;
}

const byteFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
});

export function formatBytes(bytes: number): string {
  return byteFormatter.format(bytes);
}
