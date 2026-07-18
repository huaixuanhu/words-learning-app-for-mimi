import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
  type RecordLogItem,
  Rating,
  State,
  type FSRSParameters,
} from "ts-fsrs";
import type { ReviewRating, ReviewState } from "./types";

export const RECOGNITION_FSRS_PARAMETERS: FSRSParameters = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: false,
  learning_steps: [],
  relearning_steps: [],
});

const recognitionScheduler = fsrs(RECOGNITION_FSRS_PARAMETERS);

export type RecognitionFsrsOutcome = {
  rating: ReviewRating;
  fsrsRating: Grade;
  dueAt: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: Card["state"];
};

export function mapReviewRatingToFsrsRating(rating: ReviewRating): Grade {
  switch (rating) {
    case "forgot":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "vague":
      return Rating.Good;
    case "remembered":
      return Rating.Easy;
  }
}

export function createRecognitionFsrsCard(now: string | Date = new Date()) {
  return createEmptyCard(now);
}

function coerceDate(input: string | null | undefined, fallback: string | Date) {
  if (!input) {
    return new Date(fallback);
  }

  const date = new Date(input);

  return Number.isNaN(date.getTime()) ? new Date(fallback) : date;
}

function hasFsrsMetric(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function createRecognitionFsrsCardFromReviewState(
  previousState: ReviewState | undefined,
  reviewedAt: string | Date,
): Card {
  if (!previousState) {
    return createRecognitionFsrsCard(reviewedAt);
  }

  const rawDifficulty = previousState.difficulty;
  const rawStability = previousState.stability;
  const hasDifficulty = hasFsrsMetric(rawDifficulty);
  const hasStability = hasFsrsMetric(rawStability);
  const hasFsrsState = hasDifficulty && hasStability;
  const difficulty = hasDifficulty ? rawDifficulty : 0;
  const stability = hasStability ? rawStability : 0;
  const reviewedAtDate = new Date(reviewedAt);
  const due = coerceDate(previousState.dueAt, reviewedAtDate);
  const lastReview = coerceDate(previousState.lastReviewedAt, reviewedAtDate);

  return {
    due,
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round(previousState.intervalMinutes / 1440)),
    learning_steps: 0,
    reps: previousState.reviewCount,
    lapses: previousState.lapseCount,
    state: hasFsrsState
      ? previousState.status === "learning"
        ? State.Relearning
        : State.Review
      : State.New,
    last_review: previousState.lastReviewedAt ? lastReview : undefined,
  };
}

function toRecognitionOutcome(
  rating: ReviewRating,
  fsrsRating: Grade,
  result: RecordLogItem,
): RecognitionFsrsOutcome {
  return {
    rating,
    fsrsRating,
    dueAt: result.card.due.toISOString(),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    scheduledDays: result.card.scheduled_days,
    reps: result.card.reps,
    lapses: result.card.lapses,
    state: result.card.state,
  };
}

export function applyRecognitionFsrsRating(
  card: Card,
  rating: ReviewRating,
  reviewedAt: string | Date,
) {
  const fsrsRating = mapReviewRatingToFsrsRating(rating);
  const result = recognitionScheduler.next(card, reviewedAt, fsrsRating);

  return toRecognitionOutcome(rating, fsrsRating, result);
}

export function previewRecognitionFsrsOutcomes(card: Card, reviewedAt: string | Date) {
  const preview = recognitionScheduler.repeat(card, reviewedAt);

  return {
    forgot: toRecognitionOutcome("forgot", Rating.Again, preview[Rating.Again]),
    hard: toRecognitionOutcome("hard", Rating.Hard, preview[Rating.Hard]),
    vague: toRecognitionOutcome("vague", Rating.Good, preview[Rating.Good]),
    remembered: toRecognitionOutcome("remembered", Rating.Easy, preview[Rating.Easy]),
  } satisfies Record<ReviewRating, RecognitionFsrsOutcome>;
}

export function getRecognitionFsrsRetrievability(
  state: ReviewState,
  now: string | Date,
) {
  if (state.reviewProfile !== "recognition") {
    throw new Error("Recognition FSRS cannot consume another Review Profile state");
  }

  return recognitionScheduler.get_retrievability(
    createRecognitionFsrsCardFromReviewState(state, now),
    now,
    false,
  );
}

export function getRecognitionFsrsParameterSnapshot() {
  return {
    requestRetention: RECOGNITION_FSRS_PARAMETERS.request_retention,
    maximumInterval: RECOGNITION_FSRS_PARAMETERS.maximum_interval,
    enableFuzz: RECOGNITION_FSRS_PARAMETERS.enable_fuzz,
    enableShortTerm: RECOGNITION_FSRS_PARAMETERS.enable_short_term,
    learningSteps: [...RECOGNITION_FSRS_PARAMETERS.learning_steps],
    relearningSteps: [...RECOGNITION_FSRS_PARAMETERS.relearning_steps],
  };
}
