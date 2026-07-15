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

export const ACTIVE_FSRS_PARAMETERS: FSRSParameters = generatorParameters({
  request_retention: 0.92,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: false,
  learning_steps: [],
  relearning_steps: [],
});

const activeScheduler = fsrs(ACTIVE_FSRS_PARAMETERS);

export type ActiveFsrsOutcome = {
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

export function mapActiveRatingToFsrsRating(rating: ReviewRating): Grade {
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

export function createActiveFsrsCard(now: string | Date = new Date()) {
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

export function createActiveFsrsCardFromReviewState(
  previousState: ReviewState | undefined,
  reviewedAt: string | Date,
): Card {
  if (!previousState) {
    return createActiveFsrsCard(reviewedAt);
  }

  if (previousState.reviewProfile !== "active") {
    throw new Error("Active FSRS cannot consume another Review Profile state");
  }

  const rawDifficulty = previousState.difficulty;
  const rawStability = previousState.stability;
  const hasDifficulty = hasFsrsMetric(rawDifficulty);
  const hasStability = hasFsrsMetric(rawStability);
  const hasFsrsState = hasDifficulty && hasStability;
  const reviewedAtDate = new Date(reviewedAt);

  return {
    due: coerceDate(previousState.dueAt, reviewedAtDate),
    stability: hasStability ? rawStability : 0,
    difficulty: hasDifficulty ? rawDifficulty : 0,
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
    last_review: previousState.lastReviewedAt
      ? coerceDate(previousState.lastReviewedAt, reviewedAtDate)
      : undefined,
  };
}

function toActiveOutcome(
  rating: ReviewRating,
  fsrsRating: Grade,
  result: RecordLogItem,
): ActiveFsrsOutcome {
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

export function applyActiveFsrsRating(
  card: Card,
  rating: ReviewRating,
  reviewedAt: string | Date,
) {
  const fsrsRating = mapActiveRatingToFsrsRating(rating);
  const result = activeScheduler.next(card, reviewedAt, fsrsRating);

  return toActiveOutcome(rating, fsrsRating, result);
}

export function previewActiveFsrsOutcomes(card: Card, reviewedAt: string | Date) {
  const preview = activeScheduler.repeat(card, reviewedAt);

  return {
    forgot: toActiveOutcome("forgot", Rating.Again, preview[Rating.Again]),
    hard: toActiveOutcome("hard", Rating.Hard, preview[Rating.Hard]),
    vague: toActiveOutcome("vague", Rating.Good, preview[Rating.Good]),
    remembered: toActiveOutcome("remembered", Rating.Easy, preview[Rating.Easy]),
  } satisfies Record<ReviewRating, ActiveFsrsOutcome>;
}

export function getActiveFsrsParameterSnapshot() {
  return {
    requestRetention: ACTIVE_FSRS_PARAMETERS.request_retention,
    maximumInterval: ACTIVE_FSRS_PARAMETERS.maximum_interval,
    enableFuzz: ACTIVE_FSRS_PARAMETERS.enable_fuzz,
    enableShortTerm: ACTIVE_FSRS_PARAMETERS.enable_short_term,
    learningSteps: [...ACTIVE_FSRS_PARAMETERS.learning_steps],
    relearningSteps: [...ACTIVE_FSRS_PARAMETERS.relearning_steps],
  };
}
