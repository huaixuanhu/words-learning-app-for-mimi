const EDGE_PUNCTUATION = /^[\s"'“”‘’.,;:!?()[\]{}<>]+|[\s"'“”‘’.,;:!?()[\]{}<>]+$/g;

export function cleanSurfaceText(input: string) {
  return input.normalize("NFKC").replace(/\s+/g, " ").trim().replace(EDGE_PUNCTUATION, "");
}

export function normalizeSurfaceText(input: string) {
  return cleanSurfaceText(input).toLocaleLowerCase("en-US");
}

export function isSentenceLikeText(surfaceText: string) {
  const words = cleanSurfaceText(surfaceText).split(/\s+/).filter(Boolean);
  const hasSentenceEnding = /[.!?。！？]$/.test(surfaceText.trim());

  return words.length > 8 || (words.length > 5 && hasSentenceEnding);
}

export function validateSurfaceText(input: string) {
  const surfaceText = cleanSurfaceText(input);
  const errors: string[] = [];

  if (!surfaceText) {
    errors.push("empty");
  }

  if (surfaceText.length > 80) {
    errors.push("too_long");
  }

  if (isSentenceLikeText(surfaceText)) {
    errors.push("sentence_like");
  }

  return {
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    errors,
  };
}

export function normalizeOptionalText(input: string | undefined | null) {
  return (input ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeRarityScore(input: number | string | null | undefined) {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  const numeric = Number(input);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(5, Math.max(1, Math.round(numeric)));
}
