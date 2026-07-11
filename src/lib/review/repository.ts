import type { ReviewEvent, ReviewRating, ReviewState } from "./types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { makeId } from "@/lib/vocabulary/repository";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getSelectedReviewSettings } from "./settings";
import { getLocalDateKey, scheduleNextReview, selectReviewQueue } from "./scheduler";

export type RecordReviewInput = {
  vocabularyItemId: string;
  rating: ReviewRating;
  elapsedMs?: number | null;
};

export function getReviewState(data: VocabularyData, vocabularyItemId: string) {
  const personId = getSelectedPersonId(data);

  return data.reviewStates.find(
    (state) => state.personId === personId && state.vocabularyItemId === vocabularyItemId,
  );
}

export function getReviewQueue(
  data: VocabularyData,
  now = new Date().toISOString(),
  sessionLimit = getSelectedReviewSettings(data).recognitionSessionLimit,
) {
  return selectReviewQueue(data, now, sessionLimit);
}

function sortReviewEventsByReviewedAt(a: ReviewEvent, b: ReviewEvent) {
  const reviewedAtCompare = a.reviewedAt.localeCompare(b.reviewedAt);

  if (reviewedAtCompare !== 0) {
    return reviewedAtCompare;
  }

  return a.id.localeCompare(b.id);
}

function rebuildStateFromEvents(
  personId: string,
  vocabularyItemId: string,
  events: ReviewEvent[],
  previousState: ReviewState | undefined,
) {
  return events.reduce<ReviewState | undefined>((state, event) => {
    const scheduled = scheduleNextReview(state, event.rating, event.reviewedAt);

    return {
      id: state?.id ?? previousState?.id ?? makeId("review_state"),
      personId,
      vocabularyItemId,
      status: scheduled.status,
      dueAt: scheduled.dueAt,
      lastReviewedAt: event.reviewedAt,
      reviewCount: scheduled.reviewCount,
      lapseCount: scheduled.lapseCount,
      intervalMinutes: scheduled.intervalMinutes,
      difficulty: scheduled.difficulty,
      stability: scheduled.stability,
      updatedAt: event.reviewedAt,
    };
  }, undefined);
}

export function resetTodayReviewTask(data: VocabularyData, now = new Date().toISOString()) {
  const personId = getSelectedPersonId(data);
  const timezone = getSelectedReviewSettings(data).timezone;
  const todayKey = getLocalDateKey(now, timezone);
  const todayEvents = data.reviewEvents.filter(
    (event) =>
      event.personId === personId && getLocalDateKey(event.reviewedAt, timezone) === todayKey,
  );
  const affectedItemIds = new Set(todayEvents.map((event) => event.vocabularyItemId));

  if (!todayEvents.length) {
    return {
      data,
      resetEventsCount: 0,
      resetItemsCount: 0,
    };
  }

  const remainingEvents = data.reviewEvents.filter(
    (event) =>
      !(event.personId === personId && getLocalDateKey(event.reviewedAt, timezone) === todayKey),
  );
  const previousStateByItemId = new Map(
    data.reviewStates
      .filter((state) => state.personId === personId && affectedItemIds.has(state.vocabularyItemId))
      .map((state) => [state.vocabularyItemId, state]),
  );
  const rebuiltStates = Array.from(affectedItemIds)
    .map((vocabularyItemId) => {
      const earlierEvents = remainingEvents
        .filter((event) => event.personId === personId && event.vocabularyItemId === vocabularyItemId)
        .sort(sortReviewEventsByReviewedAt);

      return rebuildStateFromEvents(
        personId,
        vocabularyItemId,
        earlierEvents,
        previousStateByItemId.get(vocabularyItemId),
      );
    })
    .filter((state): state is ReviewState => Boolean(state));

  return {
    data: {
      ...data,
      reviewEvents: remainingEvents,
      reviewStates: [
        ...rebuiltStates,
        ...data.reviewStates.filter(
          (state) => !(state.personId === personId && affectedItemIds.has(state.vocabularyItemId)),
        ),
      ],
      updatedAt: now,
    },
    resetEventsCount: todayEvents.length,
    resetItemsCount: affectedItemIds.size,
  };
}

export function rollbackReviewEvent(
  data: VocabularyData,
  reviewEventId: string,
  now = new Date().toISOString(),
) {
  const personId = getSelectedPersonId(data);
  const event = data.reviewEvents.find(
    (candidate) => candidate.id === reviewEventId && candidate.personId === personId,
  );

  if (!event) {
    throw new Error(`Review event not found: ${reviewEventId}`);
  }

  const remainingEvents = data.reviewEvents.filter(
    (candidate) => !(candidate.id === reviewEventId && candidate.personId === personId),
  );
  const previousState = data.reviewStates.find(
    (state) => state.personId === personId && state.vocabularyItemId === event.vocabularyItemId,
  );
  const earlierEvents = remainingEvents
    .filter(
      (candidate) =>
        candidate.personId === personId && candidate.vocabularyItemId === event.vocabularyItemId,
    )
    .sort(sortReviewEventsByReviewedAt);
  const rebuiltState = rebuildStateFromEvents(
    personId,
    event.vocabularyItemId,
    earlierEvents,
    previousState,
  );

  return {
    data: {
      ...data,
      reviewEvents: remainingEvents,
      reviewStates: [
        ...(rebuiltState ? [rebuiltState] : []),
        ...data.reviewStates.filter(
          (state) =>
            !(state.personId === personId && state.vocabularyItemId === event.vocabularyItemId),
        ),
      ],
      updatedAt: now,
    },
    event,
    state: rebuiltState ?? null,
  };
}

export function recordReview(
  data: VocabularyData,
  input: RecordReviewInput,
  now = new Date().toISOString(),
) {
  const personId = getSelectedPersonId(data);
  const item = data.items.find(
    (candidate) => candidate.id === input.vocabularyItemId && candidate.personId === personId,
  );

  if (!item || item.status === "archived" || item.archivedAt || item.learningTrack !== "recognition") {
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
    personId,
    vocabularyItemId: input.vocabularyItemId,
    status: scheduled.status,
    dueAt: scheduled.dueAt,
    lastReviewedAt: now,
    reviewCount: scheduled.reviewCount,
    lapseCount: scheduled.lapseCount,
    intervalMinutes: scheduled.intervalMinutes,
    difficulty: scheduled.difficulty,
    stability: scheduled.stability,
    updatedAt: now,
  };
  const event = {
    id: makeId("review_event"),
    personId,
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
        state.personId === personId && state.vocabularyItemId === input.vocabularyItemId
          ? nextState
          : state,
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
