export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Maps a count onto 0-1 logarithmically, reaching 1 at `cap`. */
export function logScale(value: number, cap: number): number {
  if (value <= 0) {
    return 0;
  }
  return clamp(Math.log1p(value) / Math.log1p(cap));
}

/** Confidence from sample size: grows linearly until `enough` observations. */
export function sampleConfidence(observations: number, enough: number): number {
  return clamp(observations / enough);
}

/** Larger repositories count more, logarithmically, so many tiny experiments cannot outweigh a substantial project. */
export function repositoryWeight(sizeKb: number): number {
  return 1 + Math.log10(1 + Math.max(0, sizeKb));
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
