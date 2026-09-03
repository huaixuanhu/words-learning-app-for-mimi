export type ReviewRating = "forgot" | "hard" | "vague" | "remembered";

export const LEGACY_RECOGNITION_PARAMETER_SET_ID = "recognition-fsrs-v1" as const;
export const RECOGNITION_PARAMETER_SET_ID = "recognition-fsrs-v2" as const;
export const LEGACY_ACTIVE_PARAMETER_SET_ID = "active-fsrs-v1" as const;
export const ACTIVE_PARAMETER_SET_ID = "active-fsrs-v2" as const;

export const RECOGNITION_PARAMETER_SET_IDS = [
  LEGACY_RECOGNITION_PARAMETER_SET_ID,
  RECOGNITION_PARAMETER_SET_ID,
] as const;
export const ACTIVE_PARAMETER_SET_IDS = [
  LEGACY_ACTIVE_PARAMETER_SET_ID,
  ACTIVE_PARAMETER_SET_ID,
] as const;

export type RecognitionParameterSetId =
  (typeof RECOGNITION_PARAMETER_SET_IDS)[number];
export type ActiveParameterSetId = (typeof ACTIVE_PARAMETER_SET_IDS)[number];
export type ReviewParameterSetId =
  | RecognitionParameterSetId
  | ActiveParameterSetId;

export type ReviewProfile = "recognition" | "active";
export type ReviewActivityType = "recognition_card" | "say" | "spell" | "dictation";
export type ReviewAnswerOutcome =
  | "self_rated"
  | "exact"
  | "normalized_match"
  | "different"
  | "revealed_without_answer";

export type ReviewStateStatus = "learning" | "review";

export function isRecognitionParameterSetId(
  value: string,
): value is RecognitionParameterSetId {
  return RECOGNITION_PARAMETER_SET_IDS.some((candidate) => candidate === value);
}

export function isActiveParameterSetId(
  value: string,
): value is ActiveParameterSetId {
  return ACTIVE_PARAMETER_SET_IDS.some((candidate) => candidate === value);
}

export function isParameterSetIdForProfile(
  reviewProfile: ReviewProfile,
  value: string,
): value is ReviewParameterSetId {
  return reviewProfile === "recognition"
    ? isRecognitionParameterSetId(value)
    : isActiveParameterSetId(value);
}

export function currentParameterSetIdForProfile(
  reviewProfile: ReviewProfile,
): ReviewParameterSetId {
  return reviewProfile === "recognition"
    ? RECOGNITION_PARAMETER_SET_ID
    : ACTIVE_PARAMETER_SET_ID;
}

export type ReviewState = {
  id: string;
  personId: string;
  vocabularyItemId: string;
  reviewProfile: ReviewProfile;
  parameterSetId: string;
  firstRatedAt: string | null;
  historyOrigin: "recorded" | "legacy_unknown";
  status: ReviewStateStatus;
  dueAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  lapseCount: number;
  intervalMinutes: number;
  difficulty: number | null;
  stability: number | null;
  updatedAt: string;
};

export type ReviewEvent = {
  id: string;
  promptId: string | null;
  personId: string;
  vocabularyItemId: string;
  reviewProfile: ReviewProfile;
  activityType: ReviewActivityType;
  answerOutcome: ReviewAnswerOutcome;
  answerNormalizationVersion: "active-answer-v1" | null;
  targetRevision: string | null;
  parameterSetId: string;
  reviewedAt: string;
  rating: ReviewRating;
  previousDueAt: string | null;
  nextDueAt: string;
  previousIntervalMinutes: number | null;
  nextIntervalMinutes: number;
  elapsedMs: number;
};

export type ReviewSettings = {
  sessionLimit: number;
  recognitionSessionLimit: number;
  activeSessionLimit: number;
  timezone: string;
  updatedAt: string;
};

export type PersonReviewSettings = ReviewSettings & {
  personId: string;
};
