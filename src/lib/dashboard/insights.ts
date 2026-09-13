import { resolveStudyDay, resolveStudyDayOffset } from "@/lib/daily-study/day-window";
import { resolveRetainedStudyWindow } from "@/lib/daily-study/runtime-engine";
import { getSelectedPersonId } from "@/lib/people/repository";
import { findDailyEpisodePlan } from "@/lib/review/daily-episode";
import { getActiveFsrsRetrievability } from "@/lib/review/fsrs-active";
import { getRecognitionFsrsRetrievability } from "@/lib/review/fsrs-recognition";
import { getSelectedReviewSettings } from "@/lib/review/settings";
import { isPassingSessionRating } from "@/lib/review/session-queue";
import {
  isParameterSetIdForProfile,
  type ReviewProfile,
  type ReviewState,
} from "@/lib/review/types";
import type { VocabularyData } from "@/lib/vocabulary/types";

const RHYTHM_DAY_COUNT = 14;

export type LearningRhythmPoint = Readonly<{
  localDate: string;
  learned: number;
  reviewed: number;
}>;

export type ReviewLoadBucketKey =
  | "ready"
  | "tomorrow"
  | "days_2_3"
  | "days_4_7"
  | "later";

export type ReviewLoadBucket = Readonly<{
  key: ReviewLoadBucketKey;
  label: string;
  count: number;
}>;

export type RetrievabilityBucketKey = "high" | "middle" | "lower";

export type RetrievabilityBucket = Readonly<{
  key: RetrievabilityBucketKey;
  label: string;
  count: number;
  share: number;
}>;

export type DashboardTrackInsights = Readonly<{
  reviewProfile: ReviewProfile;
  rhythm: readonly LearningRhythmPoint[];
  reviewLoad: readonly ReviewLoadBucket[];
  retrievability: readonly RetrievabilityBucket[];
  retrievabilityEligibleCount: number;
}>;

export type DashboardInsightsSnapshot = Readonly<{
  personId: string;
  timezone: string;
  calculatedAt: string;
  tracks: Readonly<Record<ReviewProfile, DashboardTrackInsights>>;
}>;

function timestamp(value: string) {
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}

function buildLearningRhythm(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
  timezone: string,
  now: string,
) {
  const current = resolveRetainedStudyWindow(data, personId, timezone, now);
  const lastInstant = new Date(Date.parse(current.dayEndsAt) - 1);
  const days = Array.from({ length: RHYTHM_DAY_COUNT }, (_, index) =>
    resolveStudyDayOffset(lastInstant, timezone, index - (RHYTHM_DAY_COUNT - 1)),
  );
  const values = new Map(
    days.map((day) => [day.localDate, { learnedIds: new Set<string>(), reviewedIds: new Set<string>() }]),
  );
  const firstHistory = new Map<string, number>();
  for (const state of data.reviewStates) {
    if (state.personId !== personId || state.reviewProfile !== reviewProfile) continue;
    const first = state.historyOrigin === "legacy_unknown"
      ? Number.NEGATIVE_INFINITY
      : state.firstRatedAt ? timestamp(state.firstRatedAt) : null;
    if (first !== null) {
      firstHistory.set(state.vocabularyItemId, Math.min(first, firstHistory.get(state.vocabularyItemId) ?? Infinity));
    }
  }
  const seenEventIds = new Set<string>();
  const events = data.reviewEvents
    .filter(
      (event) =>
        event.personId === personId && event.reviewProfile === reviewProfile,
    )
    .sort(
      (a, b) =>
        a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id),
    );

  for (const event of events) {
    const time = timestamp(event.reviewedAt);
    if (time !== null) {
      firstHistory.set(event.vocabularyItemId, Math.min(time, firstHistory.get(event.vocabularyItemId) ?? Infinity));
    }
  }

  for (const event of events) {
    const reviewedAt = timestamp(event.reviewedAt);
    if (seenEventIds.has(event.id) || reviewedAt === null || reviewedAt > Date.parse(now)) {
      continue;
    }

    seenEventIds.add(event.id);
    const window = findDailyEpisodePlan(event, data.dailyStudyPlans)
      ?? resolveStudyDay(event.reviewedAt, timezone);
    const point = values.get(window.localDate);

    if (!point || !isPassingSessionRating(event.rating)) {
      continue;
    }

    const hadPriorHistory = (firstHistory.get(event.vocabularyItemId) ?? Infinity) < Date.parse(window.dayStartsAt);
    (hadPriorHistory ? point.reviewedIds : point.learnedIds).add(event.vocabularyItemId);
  }

  return days.map((day) => {
    const value = values.get(day.localDate);

    return {
      localDate: day.localDate,
      learned: value?.learnedIds.size ?? 0,
      reviewed: value?.reviewedIds.size ?? 0,
    } satisfies LearningRhythmPoint;
  });
}

function currentTrackStates(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
) {
  const currentItemIds = new Set(
    data.items
      .filter(
        (item) =>
          item.personId === personId &&
          item.status !== "archived" &&
          item.learningTrack === reviewProfile,
      )
      .map((item) => item.id),
  );
  const newestByItem = new Map<string, ReviewState>();
  const states = data.reviewStates
    .filter(
      (state) =>
        state.personId === personId &&
        state.reviewProfile === reviewProfile &&
        isParameterSetIdForProfile(reviewProfile, state.parameterSetId) &&
        currentItemIds.has(state.vocabularyItemId),
    )
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
    );

  for (const state of states) {
    if (!newestByItem.has(state.vocabularyItemId)) {
      newestByItem.set(state.vocabularyItemId, state);
    }
  }

  return [...newestByItem.values()];
}

function buildReviewLoad(
  states: readonly ReviewState[],
  data: VocabularyData,
  personId: string,
  timezone: string,
  now: string,
) {
  const today = resolveRetainedStudyWindow(data, personId, timezone, now);
  const lastInstant = new Date(Date.parse(today.dayEndsAt) - 1);
  const dayTwo = resolveStudyDayOffset(lastInstant, timezone, 2);
  const dayFour = resolveStudyDayOffset(lastInstant, timezone, 4);
  const dayEight = resolveStudyDayOffset(lastInstant, timezone, 8);
  const currentDayEndsAt = timestamp(today.dayEndsAt);
  const dayTwoStartsAt = timestamp(dayTwo.dayStartsAt);
  const dayFourStartsAt = timestamp(dayFour.dayStartsAt);
  const dayEightStartsAt = timestamp(dayEight.dayStartsAt);

  if (
    currentDayEndsAt === null ||
    dayTwoStartsAt === null ||
    dayFourStartsAt === null ||
    dayEightStartsAt === null
  ) {
    throw new Error("Dashboard review-load boundaries are invalid");
  }

  const counts: Record<ReviewLoadBucketKey, number> = {
    ready: 0,
    tomorrow: 0,
    days_2_3: 0,
    days_4_7: 0,
    later: 0,
  };

  for (const state of states) {
    const dueAt = timestamp(state.dueAt);

    if (dueAt === null) {
      continue;
    }

    if (dueAt < currentDayEndsAt) counts.ready += 1;
    else if (dueAt < dayTwoStartsAt) counts.tomorrow += 1;
    else if (dueAt < dayFourStartsAt) counts.days_2_3 += 1;
    else if (dueAt < dayEightStartsAt) counts.days_4_7 += 1;
    else counts.later += 1;
  }

  return [
    { key: "ready", label: "Today", count: counts.ready },
    { key: "tomorrow", label: "Tomorrow", count: counts.tomorrow },
    { key: "days_2_3", label: "2–3d", count: counts.days_2_3 },
    { key: "days_4_7", label: "4–7d", count: counts.days_4_7 },
    { key: "later", label: "Later", count: counts.later },
  ] satisfies ReviewLoadBucket[];
}

function isRetrievabilityEligible(state: ReviewState, nowMs: number) {
  const lastReviewedAt = state.lastReviewedAt ? timestamp(state.lastReviewedAt) : null;

  return (
    state.historyOrigin === "recorded" &&
    lastReviewedAt !== null &&
    lastReviewedAt <= nowMs &&
    typeof state.stability === "number" &&
    Number.isFinite(state.stability) &&
    state.stability > 0 &&
    typeof state.difficulty === "number" &&
    Number.isFinite(state.difficulty) &&
    state.difficulty > 0
  );
}

function stateRetrievability(
  state: ReviewState,
  reviewProfile: ReviewProfile,
  now: string,
) {
  return reviewProfile === "recognition"
    ? getRecognitionFsrsRetrievability(state, now)
    : getActiveFsrsRetrievability(state, now);
}

function buildRetrievability(
  states: readonly ReviewState[],
  reviewProfile: ReviewProfile,
  now: string,
) {
  const nowMs = timestamp(now);

  if (nowMs === null) {
    throw new Error("Dashboard calculatedAt must be a valid timestamp");
  }

  const counts: Record<RetrievabilityBucketKey, number> = {
    high: 0,
    middle: 0,
    lower: 0,
  };

  for (const state of states) {
    if (!isRetrievabilityEligible(state, nowMs)) {
      continue;
    }

    let value: number;
    try {
      value = stateRetrievability(state, reviewProfile, now);
    } catch {
      continue;
    }

    if (!Number.isFinite(value) || value < 0 || value > 1) {
      continue;
    }

    if (value >= 0.9) counts.high += 1;
    else if (value >= 0.8) counts.middle += 1;
    else counts.lower += 1;
  }

  const total = counts.high + counts.middle + counts.lower;
  const share = (count: number) =>
    total > 0 ? Math.round((count / total) * 1_000) / 10 : 0;

  return {
    buckets: [
      { key: "high", label: "90–100%", count: counts.high, share: share(counts.high) },
      { key: "middle", label: "80–89%", count: counts.middle, share: share(counts.middle) },
      { key: "lower", label: "<80%", count: counts.lower, share: share(counts.lower) },
    ] satisfies RetrievabilityBucket[],
    eligibleCount: total,
  };
}

function buildTrackInsights(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
  timezone: string,
  now: string,
): DashboardTrackInsights {
  const states = currentTrackStates(data, personId, reviewProfile);
  const retrievability = buildRetrievability(states, reviewProfile, now);

  return {
    reviewProfile,
    rhythm: buildLearningRhythm(data, personId, reviewProfile, timezone, now),
    reviewLoad: buildReviewLoad(states, data, personId, timezone, now),
    retrievability: retrievability.buckets,
    retrievabilityEligibleCount: retrievability.eligibleCount,
  };
}

export function buildDashboardInsights(
  data: VocabularyData,
  now: string | Date = new Date(),
): DashboardInsightsSnapshot {
  const calculatedAtDate = now instanceof Date ? now : new Date(now);

  if (!Number.isFinite(calculatedAtDate.getTime())) {
    throw new Error("Dashboard calculatedAt must be a valid timestamp");
  }

  const calculatedAt = calculatedAtDate.toISOString();
  const personId = getSelectedPersonId(data);
  const timezone = getSelectedReviewSettings(data).timezone;

  // Resolve once before aggregating so an unsupported timezone fails visibly
  // instead of silently producing UTC-labelled study history.
  resolveStudyDay(calculatedAt, timezone);

  return {
    personId,
    timezone,
    calculatedAt,
    tracks: {
      recognition: buildTrackInsights(
        data,
        personId,
        "recognition",
        timezone,
        calculatedAt,
      ),
      active: buildTrackInsights(
        data,
        personId,
        "active",
        timezone,
        calculatedAt,
      ),
    },
  };
}
