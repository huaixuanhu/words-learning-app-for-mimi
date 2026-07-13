export type ReviewRating = "forgot" | "hard" | "vague" | "remembered";

export const RECOGNITION_PARAMETER_SET_ID = "recognition-fsrs-v1" as const;
export const ACTIVE_PARAMETER_SET_ID = "active-fsrs-v1" as const;

export type ReviewProfile = "recognition" | "active";
export type ReviewActivityType = "recognition_card" | "say" | "spell" | "dictation";
export type ReviewAnswerOutcome =
  | "self_rated"
  | "exact"
  | "normalized_match"
  | "different"
  | "revealed_without_answer";

export type ReviewStateStatus = "learning" | "review";

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
