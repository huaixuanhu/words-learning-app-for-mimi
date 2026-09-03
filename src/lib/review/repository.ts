import {
  RECOGNITION_PARAMETER_SET_ID,
  currentParameterSetIdForProfile,
  type ReviewActivityType,
  type ReviewAnswerOutcome,
  type ReviewEvent,
  type ReviewProfile,
  type ReviewRating,
  type ReviewState,
} from "./types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import { makeId } from "@/lib/vocabulary/repository";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getSelectedReviewSettings } from "./settings";
import {
  getLocalDateKey,
  scheduleNextReview,
  scheduleNextReviewForProfile,
  selectReviewQueue,
} from "./scheduler";
import {
  findDailyEpisodePlan,
  getDailyEpisodeEvents,
  scheduleDailyEpisodeAttempt,
} from "./daily-episode";

export type RecordReviewInput = {
  vocabularyItemId: string;
  rating: ReviewRating;
  elapsedMs?: number | null;
  promptId?: string | null;
};

export type RecordDailyReviewInput = RecordReviewInput & {
  plan: DailyStudyPlanRecord;
};

export type RecordDailyStudyReviewInput = RecordReviewInput & {
  plan: DailyStudyPlanRecord;
  activityType: ReviewActivityType;
  answerOutcome: ReviewAnswerOutcome;
  answerNormalizationVersion: "active-answer-v1" | null;
  targetRevision: string | null;
};

export function getReviewState(data: VocabularyData, vocabularyItemId: string) {
  const personId = getSelectedPersonId(data);

  return data.reviewStates.find(
    (state) =>
      state.personId === personId &&
      state.vocabularyItemId === vocabularyItemId &&
      state.reviewProfile === "recognition",
  );
}

export function getReviewStateForProfile(
  data: VocabularyData,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile,
) {
  const personId = getSelectedPersonId(data);

  return data.reviewStates.find(
    (state) =>
      state.personId === personId &&
      state.vocabularyItemId === vocabularyItemId &&
      state.reviewProfile === reviewProfile,
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

export function rebuildReviewProfileStateFromEvents(
  personId: string,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile,
  events: ReviewEvent[],
  previousState: ReviewState | undefined,
  options: Readonly<{
    dailyStudyPlans?: readonly DailyStudyPlanRecord[];
    makeStateId?: () => string;
  }> = {},
) {
  if (previousState && previousState.reviewProfile !== reviewProfile) {
    throw new Error("Cannot rebuild one Review Profile from another profile state");
  }

  const orderedEvents = [...events]
    .map((event) => {
      if (event.reviewProfile !== reviewProfile) {
        throw new Error("Cannot rebuild one Review Profile from another profile event");
      }

      return event;
    })
    .sort(sortReviewEventsByReviewedAt);
  const seenPlanIds = new Set<string>();
  let state: ReviewState | undefined;

  for (const event of orderedEvents) {
    const plan = findDailyEpisodePlan(event, options.dailyStudyPlans ?? []);

    if (plan && seenPlanIds.has(plan.id)) {
      if (!state) {
        throw new Error(`Daily episode ${plan.id} is missing its anchor state`);
      }

      continue;
    }

    if (plan) {
      seenPlanIds.add(plan.id);
    }

    const scheduled = plan
      ? scheduleDailyEpisodeAttempt({
          previousState: state,
          priorEpisodeEvents: [],
          rating: event.rating,
          reviewedAt: event.reviewedAt,
          plan,
          parameterSetId: event.parameterSetId,
        }).schedule
      : scheduleNextReviewForProfile(
          reviewProfile,
          state,
          event.rating,
          event.reviewedAt,
          event.parameterSetId,
        );

    state = {
      id:
        state?.id ??
        previousState?.id ??
        (options.makeStateId ?? (() => makeId("review_state")))(),
      personId,
      vocabularyItemId,
      reviewProfile,
      parameterSetId: event.parameterSetId,
      firstRatedAt:
        previousState?.historyOrigin === "legacy_unknown"
          ? null
          : state?.firstRatedAt ?? previousState?.firstRatedAt ?? event.reviewedAt,
      historyOrigin:
        previousState?.historyOrigin === "legacy_unknown" ? "legacy_unknown" : "recorded",
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
  }

  return state;
}

export function rebuildRecognitionStateFromEvents(
  personId: string,
  vocabularyItemId: string,
  events: ReviewEvent[],
  previousState: ReviewState | undefined,
  options: Readonly<{
    dailyStudyPlans?: readonly DailyStudyPlanRecord[];
    makeStateId?: () => string;
  }> = {},
) {
  return rebuildReviewProfileStateFromEvents(
    personId,
    vocabularyItemId,
    "recognition",
    events,
    previousState,
    options,
  );
}

export function rebuildActiveStateFromEvents(
  personId: string,
  vocabularyItemId: string,
  events: ReviewEvent[],
  previousState: ReviewState | undefined,
  options: Readonly<{
    dailyStudyPlans?: readonly DailyStudyPlanRecord[];
    makeStateId?: () => string;
  }> = {},
) {
  return rebuildReviewProfileStateFromEvents(
    personId,
    vocabularyItemId,
    "active",
    events,
    previousState,
    options,
  );
}

export function resetTodayReviewTask(data: VocabularyData, now = new Date().toISOString()) {
  const personId = getSelectedPersonId(data);
  const timezone = getSelectedReviewSettings(data).timezone;
  const todayKey = getLocalDateKey(now, timezone);
  const todayEvents = data.reviewEvents.filter(
    (event) =>
      event.reviewProfile === "recognition" &&
      event.personId === personId &&
      getLocalDateKey(event.reviewedAt, timezone) === todayKey,
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
      !(
        event.reviewProfile === "recognition" &&
        event.personId === personId &&
        getLocalDateKey(event.reviewedAt, timezone) === todayKey
      ),
  );
  const previousStateByItemId = new Map(
    data.reviewStates
      .filter(
        (state) =>
          state.reviewProfile === "recognition" &&
          state.personId === personId &&
          affectedItemIds.has(state.vocabularyItemId),
      )
      .map((state) => [state.vocabularyItemId, state]),
  );
  const rebuiltStates = Array.from(affectedItemIds)
    .map((vocabularyItemId) => {
      const earlierEvents = remainingEvents
        .filter(
          (event) =>
            event.reviewProfile === "recognition" &&
            event.personId === personId &&
            event.vocabularyItemId === vocabularyItemId,
        )
        .sort(sortReviewEventsByReviewedAt);

      return rebuildRecognitionStateFromEvents(
        personId,
        vocabularyItemId,
        earlierEvents,
        previousStateByItemId.get(vocabularyItemId),
        { dailyStudyPlans: data.dailyStudyPlans },
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
          (state) =>
            !(
              state.reviewProfile === "recognition" &&
              state.personId === personId &&
              affectedItemIds.has(state.vocabularyItemId)
            ),
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
    (candidate) =>
      candidate.id === reviewEventId &&
      candidate.personId === personId &&
      candidate.reviewProfile === "recognition",
  );

  if (!event) {
    throw new Error(`Review event not found: ${reviewEventId}`);
  }

  return rollbackStudyReviewEvent(data, reviewEventId, now);
}

export function rollbackStudyReviewEvent(
  data: VocabularyData,
  reviewEventId: string,
  now = new Date().toISOString(),
) {
  const personId = getSelectedPersonId(data);
  const event = data.reviewEvents.find(
    (candidate) =>
      candidate.id === reviewEventId && candidate.personId === personId,
  );

  if (!event) {
    throw new Error(`Review event not found: ${reviewEventId}`);
  }

  const remainingEvents = data.reviewEvents.filter(
    (candidate) => !(candidate.id === reviewEventId && candidate.personId === personId),
  );
  const previousState = data.reviewStates.find(
    (state) =>
      state.personId === personId &&
      state.vocabularyItemId === event.vocabularyItemId &&
      state.reviewProfile === event.reviewProfile,
  );
  const earlierEvents = remainingEvents
    .filter(
      (candidate) =>
        candidate.reviewProfile === event.reviewProfile &&
        candidate.personId === personId &&
        candidate.vocabularyItemId === event.vocabularyItemId,
    )
    .sort(sortReviewEventsByReviewedAt);
  const rebuiltState = rebuildReviewProfileStateFromEvents(
    personId,
    event.vocabularyItemId,
    event.reviewProfile,
    earlierEvents,
    previousState,
    { dailyStudyPlans: data.dailyStudyPlans },
  );

  return {
    data: {
      ...data,
      reviewEvents: remainingEvents,
      reviewStates: [
        ...(rebuiltState ? [rebuiltState] : []),
        ...data.reviewStates.filter(
          (state) =>
            !(
              state.reviewProfile === event.reviewProfile &&
              state.personId === personId &&
              state.vocabularyItemId === event.vocabularyItemId
            ),
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
    reviewProfile: "recognition",
    parameterSetId: RECOGNITION_PARAMETER_SET_ID,
    firstRatedAt:
      previousState?.historyOrigin === "legacy_unknown"
        ? null
        : previousState?.firstRatedAt ?? now,
    historyOrigin:
      previousState?.historyOrigin === "legacy_unknown" ? "legacy_unknown" : "recorded",
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
  const event: ReviewEvent = {
    id: makeId("review_event"),
    promptId: input.promptId ?? null,
    personId,
    vocabularyItemId: input.vocabularyItemId,
    reviewProfile: "recognition",
    activityType: "recognition_card",
    answerOutcome: "self_rated",
    answerNormalizationVersion: null,
    targetRevision: null,
    parameterSetId: RECOGNITION_PARAMETER_SET_ID,
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

export function recordDailyReview(
  data: VocabularyData,
  input: RecordDailyReviewInput,
  now = new Date().toISOString(),
) {
  return recordDailyStudyReview(
    data,
    {
      ...input,
      activityType: "recognition_card",
      answerOutcome: "self_rated",
      answerNormalizationVersion: null,
      targetRevision: null,
    },
    now,
  );
}

function assertDailyEvidence(input: RecordDailyStudyReviewInput) {
  const profile = input.plan.reviewProfile;
  const recognition =
    profile === "recognition" &&
    input.activityType === "recognition_card" &&
    input.answerOutcome === "self_rated" &&
    input.answerNormalizationVersion === null &&
    input.targetRevision === null;
  const activeSay =
    profile === "active" &&
    input.activityType === "say" &&
    input.answerOutcome === "self_rated" &&
    input.answerNormalizationVersion === null &&
    Boolean(input.targetRevision?.trim());
  const activeTyped =
    profile === "active" &&
    (input.activityType === "spell" || input.activityType === "dictation") &&
    (input.answerOutcome === "exact" ||
      input.answerOutcome === "normalized_match" ||
      input.answerOutcome === "different" ||
      input.answerOutcome === "revealed_without_answer") &&
    input.answerNormalizationVersion === "active-answer-v1" &&
    Boolean(input.targetRevision?.trim());

  if (!recognition && !activeSay && !activeTyped) {
    throw new Error("Daily review evidence does not match its Review Profile");
  }
}

export function recordDailyStudyReview(
  data: VocabularyData,
  input: RecordDailyStudyReviewInput,
  now = new Date().toISOString(),
) {
  const personId = getSelectedPersonId(data);
  assertDailyEvidence(input);
  const item = data.items.find(
    (candidate) =>
      candidate.id === input.vocabularyItemId && candidate.personId === personId,
  );

  if (
    !item ||
    item.status === "archived" ||
    item.archivedAt ||
    item.learningTrack !== input.plan.reviewProfile
  ) {
    throw new Error(`Reviewable vocabulary item not found: ${input.vocabularyItemId}`);
  }

  if (
    input.plan.personId !== personId ||
    input.plan.localDate.trim() === ""
  ) {
    throw new Error("Daily review does not match the selected plan");
  }

  const previousState = getReviewStateForProfile(
    data,
    input.vocabularyItemId,
    input.plan.reviewProfile,
  );
  const priorEpisodeEvents = getDailyEpisodeEvents(
    data.reviewEvents,
    input.plan,
    input.vocabularyItemId,
    data.dailyStudyPlans,
  );
  const episodeSchedule = scheduleDailyEpisodeAttempt({
    previousState,
    priorEpisodeEvents,
    rating: input.rating,
    reviewedAt: now,
    plan: input.plan,
  });
  const scheduled = episodeSchedule.schedule;
  const elapsedMs =
    input.elapsedMs === null || input.elapsedMs === undefined
      ? 0
      : Math.max(0, Math.round(input.elapsedMs));
  const nextState: ReviewState = episodeSchedule.isSchedulingAnchor
    ? {
        id: previousState?.id ?? makeId("review_state"),
        personId,
        vocabularyItemId: input.vocabularyItemId,
        reviewProfile: input.plan.reviewProfile,
        parameterSetId: currentParameterSetIdForProfile(input.plan.reviewProfile),
        firstRatedAt:
          previousState?.historyOrigin === "legacy_unknown"
            ? null
            : previousState?.firstRatedAt ?? now,
        historyOrigin:
          previousState?.historyOrigin === "legacy_unknown"
            ? "legacy_unknown"
            : "recorded",
        status: scheduled.status,
        dueAt: scheduled.dueAt,
        lastReviewedAt: now,
        reviewCount: scheduled.reviewCount,
        lapseCount: scheduled.lapseCount,
        intervalMinutes: scheduled.intervalMinutes,
        difficulty: scheduled.difficulty,
        stability: scheduled.stability,
        updatedAt: now,
      }
    : previousState!;
  const event: ReviewEvent = {
    id: makeId("review_event"),
    promptId: input.promptId ?? null,
    personId,
    vocabularyItemId: input.vocabularyItemId,
    reviewProfile: input.plan.reviewProfile,
    activityType: input.activityType,
    answerOutcome: input.answerOutcome,
    answerNormalizationVersion: input.answerNormalizationVersion,
    targetRevision: input.targetRevision,
    parameterSetId: currentParameterSetIdForProfile(input.plan.reviewProfile),
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
        state.personId === personId &&
        state.vocabularyItemId === input.vocabularyItemId &&
        state.reviewProfile === input.plan.reviewProfile
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
