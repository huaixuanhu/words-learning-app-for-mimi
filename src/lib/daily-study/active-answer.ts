import { ACTIVE_ANSWER_NORMALIZATION_VERSION, MEMORY_RATINGS } from "./types";
import type { AnswerOutcome, MemoryRating } from "./types";

export { ACTIVE_ANSWER_NORMALIZATION_VERSION };
export const MAX_ACTIVE_ANSWER_CODE_POINTS = 160;
export const MAX_ACTIVE_TARGET_CODE_POINTS = 160;

const CURVED_APOSTROPHES = /[\u2018\u2019\u02bc\uff07]/gu;
const DASH_VARIANTS = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\ufe63\uff0d]/gu;
const UNICODE_WHITESPACE = /\s+/gu;

export class ActiveAnswerContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActiveAnswerContractError";
  }
}

function codePointLength(value: string) {
  return Array.from(value).length;
}

function requireBoundedText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") {
    throw new ActiveAnswerContractError(`${label} must be text`);
  }

  if (codePointLength(value) > maximum) {
    throw new ActiveAnswerContractError(
      `${label} must be at most ${maximum} characters`,
    );
  }

  return value;
}

export function normalizeActiveAnswer(value: unknown) {
  return requireBoundedText(value, "Answer", MAX_ACTIVE_ANSWER_CODE_POINTS)
    .normalize("NFKC")
    .replace(CURVED_APOSTROPHES, "'")
    .replace(DASH_VARIANTS, "-")
    .replace(UNICODE_WHITESPACE, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function getAllowedRatingsForOutcome(outcome: AnswerOutcome): readonly MemoryRating[] {
  void outcome;
  return MEMORY_RATINGS;
}

export function isRatingAllowedForOutcome(outcome: AnswerOutcome, rating: MemoryRating) {
  return getAllowedRatingsForOutcome(outcome).includes(rating);
}

export function compareActiveTypedAnswer(input: {
  answer: unknown;
  target: unknown;
  revealedWithoutAnswer?: boolean;
}) {
  const answer = requireBoundedText(
    input.answer,
    "Answer",
    MAX_ACTIVE_ANSWER_CODE_POINTS,
  );
  const target = requireBoundedText(
    input.target,
    "Target",
    MAX_ACTIVE_TARGET_CODE_POINTS,
  );
  const normalizedTarget = normalizeActiveAnswer(target);

  if (!normalizedTarget) {
    throw new ActiveAnswerContractError("Target must not be blank");
  }

  const normalizedAnswer = normalizeActiveAnswer(answer);

  if (input.revealedWithoutAnswer) {
    if (normalizedAnswer) {
      throw new ActiveAnswerContractError(
        "Reveal-without-answer evidence requires a blank answer",
      );
    }

    return {
      outcome: "revealed_without_answer" as const,
      normalizationVersion: ACTIVE_ANSWER_NORMALIZATION_VERSION,
      allowedRatings: getAllowedRatingsForOutcome("revealed_without_answer"),
    };
  }

  if (!normalizedAnswer) {
    throw new ActiveAnswerContractError(
      "Answer must not be blank unless the user explicitly reveals without answering",
    );
  }

  const outcome: AnswerOutcome =
    answer.trim() === target.trim()
      ? "exact"
      : normalizedAnswer === normalizedTarget
        ? "normalized_match"
        : "different";

  return {
    outcome,
    normalizationVersion: ACTIVE_ANSWER_NORMALIZATION_VERSION,
    allowedRatings: getAllowedRatingsForOutcome(outcome),
  };
}

export function createSayAnswerEvidence() {
  return {
    outcome: "self_rated" as const,
    normalizationVersion: null,
    allowedRatings: getAllowedRatingsForOutcome("self_rated"),
  };
}
