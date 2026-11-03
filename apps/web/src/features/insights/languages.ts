import type { LanguageOverview } from "@gitflex/db/queries/insights";

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
