import { resolvePersonDayOffset } from "@/lib/daily-study/day-window";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getActiveFsrsRetrievability } from "@/lib/review/fsrs-active";
import { getRecognitionFsrsRetrievability } from "@/lib/review/fsrs-recognition";
import { getLocalDateKey } from "@/lib/review/scheduler";
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
  entries: number;
  attempts: number;
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
  const days = Array.from({ length: RHYTHM_DAY_COUNT }, (_, index) =>
    resolvePersonDayOffset(now, timezone, index - (RHYTHM_DAY_COUNT - 1)),
  );
  const values = new Map(
    days.map((day) => [day.localDate, { attempts: 0, entryIds: new Set<string>() }]),
  );
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
    if (seenEventIds.has(event.id) || timestamp(event.reviewedAt) === null) {
      continue;
    }

    seenEventIds.add(event.id);
    const localDate = getLocalDateKey(event.reviewedAt, timezone);
    const point = values.get(localDate);

    if (!point) {
      continue;
    }

    point.attempts += 1;
    if (isPassingSessionRating(event.rating)) {
      point.entryIds.add(event.vocabularyItemId);
    }
  }

  return days.map((day) => {
    const value = values.get(day.localDate);

    return {
      localDate: day.localDate,
      entries: value?.entryIds.size ?? 0,
      attempts: value?.attempts ?? 0,
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
  timezone: string,
  now: string,
) {
  const today = resolvePersonDayOffset(now, timezone, 0);
  const dayTwo = resolvePersonDayOffset(now, timezone, 2);
  const dayFour = resolvePersonDayOffset(now, timezone, 4);
  const dayEight = resolvePersonDayOffset(now, timezone, 8);
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
    { key: "ready", label: "Ready", count: counts.ready },
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
    reviewLoad: buildReviewLoad(states, timezone, now),
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
  resolvePersonDayOffset(calculatedAt, timezone, 0);

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
