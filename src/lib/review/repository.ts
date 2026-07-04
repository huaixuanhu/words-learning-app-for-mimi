import type { ReviewRating, ReviewState } from "./types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { makeId } from "@/lib/vocabulary/repository";
import { scheduleNextReview, selectReviewQueue } from "./scheduler";

export type RecordReviewInput = {
  vocabularyItemId: string;
  rating: ReviewRating;
  elapsedMs?: number | null;
};

export function getReviewState(data: VocabularyData, vocabularyItemId: string) {
  return data.reviewStates.find((state) => state.vocabularyItemId === vocabularyItemId);
}

export function getReviewQueue(
  data: VocabularyData,
  now = new Date().toISOString(),
  sessionLimit = data.settings.sessionLimit,
) {
  return selectReviewQueue(data, now, sessionLimit);
}

export function recordReview(
  data: VocabularyData,
  input: RecordReviewInput,
  now = new Date().toISOString(),
) {
  const item = data.items.find((candidate) => candidate.id === input.vocabularyItemId);

  if (!item || item.status === "archived" || item.archivedAt) {
    throw new Error(`Reviewable vocabulary item not found: ${input.vocabularyItemId}`);
  }

  const previousState = getReviewState(data, input.vocabularyItemId);
  const scheduled = scheduleNextReview(previousState, input.rating, now);
  const elapsedMs =
    input.elapsedMs === null || input.elapsedMs === undefined
      ? 0
      : Math.max(0, Math.round(input.elapsedMs));
  const nextState: ReviewState = {
    id: previousState?.id ?? makeId("review_state"),
    vocabularyItemId: input.vocabularyItemId,
    status: scheduled.status,
    dueAt: scheduled.dueAt,
    lastReviewedAt: now,
    reviewCount: scheduled.reviewCount,
    lapseCount: scheduled.lapseCount,
    intervalMinutes: scheduled.intervalMinutes,
    difficulty: previousState?.difficulty ?? null,
    stability: previousState?.stability ?? null,
    updatedAt: now,
  };
  const event = {
    id: makeId("review_event"),
    vocabularyItemId: input.vocabularyItemId,
    reviewedAt: now,
    rating: input.rating,
    previousDueAt: previousState?.dueAt ?? null,
    nextDueAt: scheduled.dueAt,
    previousIntervalMinutes: previousState?.intervalMinutes ?? null,
    nextIntervalMinutes: scheduled.intervalMinutes,
    elapsedMs,
  };
  const nextReviewStates = previousState
    ? data.reviewStates.map((state) =>
        state.vocabularyItemId === input.vocabularyItemId ? nextState : state,
      )
    : [nextState, ...data.reviewStates];

  return {
    data: {
      ...data,
      reviewStates: nextReviewStates,
      reviewEvents: [event, ...data.reviewEvents],
      updatedAt: now,
    },
    event,
    state: nextState,
  };
}
