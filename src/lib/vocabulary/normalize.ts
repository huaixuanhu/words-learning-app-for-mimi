import type { LearningTrack, VocabularyTag } from "./types";

const EDGE_PUNCTUATION = /^[\s"'“”‘’.,;:!?()[\]{}<>]+|[\s"'“”‘’.,;:!?()[\]{}<>]+$/g;

export const DEFAULT_LEARNING_TRACK: LearningTrack = "recognition";
export const VOCABULARY_TAGS = ["PTE", "IELTS", "Listening", "Writing", "Spelling Risk"] as const;

const VOCABULARY_TAG_SET = new Set<string>(VOCABULARY_TAGS);

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

export function normalizeLearningTrack(input: unknown): LearningTrack {
  return input === "active" ? "active" : DEFAULT_LEARNING_TRACK;
}

export function isLearningTrack(input: unknown): input is LearningTrack {
  return input === "recognition" || input === "active";
}

export function normalizeVocabularyTags(input: unknown): VocabularyTag[] | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  if (!Array.isArray(input)) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      input
        .map((tag) => normalizeOptionalText(typeof tag === "string" ? tag : ""))
        .filter((tag): tag is VocabularyTag => VOCABULARY_TAG_SET.has(tag)),
    ),
  );

  return normalized.length ? normalized : null;
}

export function validateVocabularyTags(input: unknown) {
  if (input === null || input === undefined || input === "") {
    return {
      tags: null,
      errors: [] as string[],
    };
  }

  if (!Array.isArray(input)) {
    return {
      tags: null,
      errors: ["invalid_tags"],
    };
  }

  const errors: string[] = [];
  const tags: VocabularyTag[] = [];
  const seen = new Set<string>();

  for (const rawTag of input) {
    const tag = normalizeOptionalText(typeof rawTag === "string" ? rawTag : "");

    if (!VOCABULARY_TAG_SET.has(tag)) {
      errors.push("unsupported_tag");
      continue;
    }

    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag as VocabularyTag);
    }
  }

  return {
    tags: tags.length ? tags : null,
    errors,
  };
}
