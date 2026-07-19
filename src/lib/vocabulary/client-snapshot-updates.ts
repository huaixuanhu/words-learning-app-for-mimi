import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import {
  REVIEW_PROFILES,
  type DailyStudyTodayResponse,
} from "@/lib/daily-study/types";
import type { VocabularyData } from "./types";

function isSameReviewState(left: ReviewState, right: ReviewState) {
  return (
    left.personId === right.personId &&
    left.vocabularyItemId === right.vocabularyItemId &&
    left.reviewProfile === right.reviewProfile
  );
}

function newestTimestamp(...values: string[]) {
  return values.reduce((latest, value) =>
    new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
  );
}

function newestReviewEvents(events: ReviewEvent[]) {
  return events.sort(
    (left, right) =>
      right.reviewedAt.localeCompare(left.reviewedAt) ||
      right.id.localeCompare(left.id),
  );
}

export function applyRecordedReviewToClientSnapshot(
  data: VocabularyData,
  result: Readonly<{ event: ReviewEvent; state: ReviewState }>,
) {
  const installedState = data.reviewStates.find((state) =>
    isSameReviewState(state, result.state),
  );
  const shouldReplaceState =
    !installedState ||
    new Date(result.state.updatedAt).getTime() >=
      new Date(installedState.updatedAt).getTime();

  return {
    ...data,
    reviewEvents: newestReviewEvents([
      result.event,
      ...data.reviewEvents.filter((event) => event.id !== result.event.id),
    ]),
    reviewStates: shouldReplaceState
      ? [
          result.state,
          ...data.reviewStates.filter(
            (state) => !isSameReviewState(state, result.state),
          ),
        ]
      : data.reviewStates,
    updatedAt: newestTimestamp(
      data.updatedAt,
      result.event.reviewedAt,
      result.state.updatedAt,
    ),
  } satisfies VocabularyData;
}

export function applyRolledBackReviewToClientSnapshot(
  data: VocabularyData,
  result: Readonly<{ event: ReviewEvent; state: ReviewState | null }>,
) {
  const matchingState = result.state ?? {
    personId: result.event.personId,
    vocabularyItemId: result.event.vocabularyItemId,
    reviewProfile: result.event.reviewProfile,
  };
  const remainingStates = data.reviewStates.filter(
    (state) =>
      !(
        state.personId === matchingState.personId &&
        state.vocabularyItemId === matchingState.vocabularyItemId &&
        state.reviewProfile === matchingState.reviewProfile
      ),
  );
  const installedState = data.reviewStates.find(
    (state) =>
      state.personId === matchingState.personId &&
      state.vocabularyItemId === matchingState.vocabularyItemId &&
      state.reviewProfile === matchingState.reviewProfile,
  );
  const resultStateIsCurrent =
    result.state &&
    (!installedState ||
      new Date(result.state.updatedAt).getTime() >=
        new Date(installedState.updatedAt).getTime());
  const canRemoveInstalledState =
    !result.state &&
    (!installedState ||
      new Date(installedState.updatedAt).getTime() <=
        new Date(result.event.reviewedAt).getTime());

  return {
    ...data,
    reviewEvents: data.reviewEvents.filter(
      (event) => event.id !== result.event.id,
    ),
    reviewStates: result.state && resultStateIsCurrent
      ? [result.state, ...remainingStates]
      : canRemoveInstalledState
        ? remainingStates
        : data.reviewStates,
    updatedAt: newestTimestamp(
      data.updatedAt,
      result.event.reviewedAt,
      result.state?.updatedAt ?? result.event.reviewedAt,
    ),
  } satisfies VocabularyData;
}

export function applyResolvedTodayToClientSnapshot(
  data: VocabularyData,
  today: DailyStudyTodayResponse,
) {
  const missingDefaults = REVIEW_PROFILES.flatMap((reviewProfile) => {
    const track = today.tracks[reviewProfile];

    if (
      track.status !== "available" ||
      data.dailyStudyDefaults.some(
        (entry) =>
          entry.personId === today.personId &&
          entry.reviewProfile === reviewProfile,
      )
    ) {
      return [];
    }

    return [{
      personId: today.personId,
      reviewProfile,
      reviewGoal: track.metrics.reviewGoal,
      newWordGoal: track.metrics.newWordGoal,
      timezone: today.timezone,
      updatedAt: track.calculatedAt,
    }];
  });
  const resolvedPlans = REVIEW_PROFILES.flatMap((reviewProfile) => {
    const track = today.tracks[reviewProfile];

    if (track.status !== "available") {
      return [];
    }

    return [{
      id: track.planId,
      personId: today.personId,
      reviewProfile,
      localDate: today.localDate,
      timezone: today.timezone,
      dayStartsAt: today.dayStartsAt,
      dayEndsAt: today.dayEndsAt,
      suggestedReview: track.metrics.suggestedReview,
      reviewGoal: track.metrics.reviewGoal,
      newWordGoal: track.metrics.newWordGoal,
      planVersion: track.planVersion,
      recommendationVersion: track.recommendationVersion,
      calculatedAt: track.calculatedAt,
      updatedAt: track.calculatedAt,
    }];
  });
  const planScopes = new Set(
    resolvedPlans.map((plan) =>
      [plan.personId, plan.reviewProfile, plan.localDate].join(":"),
    ),
  );
  const retainedPlans = data.dailyStudyPlans.filter((plan) => {
    const scope = [plan.personId, plan.reviewProfile, plan.localDate].join(":");

    if (!planScopes.has(scope)) {
      return true;
    }

    const resolved = resolvedPlans.find(
      (candidate) =>
        candidate.personId === plan.personId &&
        candidate.reviewProfile === plan.reviewProfile &&
        candidate.localDate === plan.localDate,
    );

    return Boolean(resolved && plan.planVersion > resolved.planVersion);
  });
  const currentResolvedPlans = resolvedPlans.filter((resolved) =>
    !data.dailyStudyPlans.some(
      (plan) =>
        plan.personId === resolved.personId &&
        plan.reviewProfile === resolved.reviewProfile &&
        plan.localDate === resolved.localDate &&
        plan.planVersion > resolved.planVersion,
    ),
  );

  if (
    !missingDefaults.length &&
    currentResolvedPlans.every((resolved) =>
      data.dailyStudyPlans.some(
        (plan) =>
          plan.id === resolved.id &&
          plan.personId === resolved.personId &&
          plan.reviewProfile === resolved.reviewProfile &&
          plan.localDate === resolved.localDate &&
          plan.planVersion === resolved.planVersion,
      ),
    )
  ) {
    return data;
  }

  return {
    ...data,
    dailyStudyDefaults: [...missingDefaults, ...data.dailyStudyDefaults],
    dailyStudyPlans: [...currentResolvedPlans, ...retainedPlans],
    updatedAt: newestTimestamp(
      data.updatedAt,
      currentResolvedPlans[0]?.updatedAt ?? data.updatedAt,
      missingDefaults[0]?.updatedAt ?? data.updatedAt,
    ),
  } satisfies VocabularyData;
}
