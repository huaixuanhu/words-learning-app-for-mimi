import { describe, expect, it } from "vitest";
import { resolveDailyStudyToday } from "@/lib/daily-study/runtime-engine";
import type { DailyStudyTodayResponse } from "@/lib/daily-study/types";
import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import { createEmptyVocabularyData } from "./repository";
import {
  applyRecordedReviewToClientSnapshot,
  applyResolvedTodayToClientSnapshot,
  applyRolledBackReviewToClientSnapshot,
} from "./client-snapshot-updates";

const personId = "person_mimi";

function todayResponse(
  responsePersonId: string,
  planPrefix: string,
  planVersion = 1,
): DailyStudyTodayResponse {
  const metrics = {
    addedToday: 0,
    suggestedReview: 0,
    reviewGoal: 20,
    newWordGoal: 5,
    reviewedToday: 0,
    learnedToday: 0,
    attemptsToday: 0,
  };

  return {
    personId: responsePersonId,
    localDate: "2026-07-19",
    timezone: "Australia/Melbourne",
    dayStartsAt: "2026-07-18T14:00:00.000Z",
    dayEndsAt: "2026-07-19T14:00:00.000Z",
    tracks: {
      recognition: {
        reviewProfile: "recognition",
        status: "available",
        planId: `${planPrefix}-recognition`,
        planVersion,
        metrics,
        recommendationVersion: "v2-stage1",
        calculatedAt: "2026-07-19T01:00:00.000Z",
        unavailableReason: null,
      },
      active: {
        reviewProfile: "active",
        status: "available",
        planId: `${planPrefix}-active`,
        planVersion,
        metrics: { ...metrics, reviewGoal: 8, newWordGoal: 2 },
        recommendationVersion: "v2-stage1",
        calculatedAt: "2026-07-19T01:00:00.000Z",
        unavailableReason: null,
      },
    },
  };
}

function event(
  id: string,
  reviewProfile: "recognition" | "active" = "recognition",
): ReviewEvent {
  return {
    id,
    promptId: `prompt-${id}`,
    personId,
    vocabularyItemId: "entry-1",
    reviewProfile,
    activityType: reviewProfile === "recognition" ? "recognition_card" : "spell",
    answerOutcome: reviewProfile === "recognition" ? "self_rated" : "exact",
    answerNormalizationVersion: reviewProfile === "recognition" ? null : "active-answer-v1",
    targetRevision: reviewProfile === "recognition" ? null : "revision-1",
    parameterSetId: `${reviewProfile}-fsrs-v1`,
    reviewedAt: "2026-07-19T01:00:00.000Z",
    rating: "vague",
    previousDueAt: null,
    nextDueAt: "2026-07-20T01:00:00.000Z",
    previousIntervalMinutes: null,
    nextIntervalMinutes: 1440,
    elapsedMs: 800,
  };
}

function state(
  id: string,
  reviewProfile: "recognition" | "active" = "recognition",
): ReviewState {
  return {
    id,
    personId,
    vocabularyItemId: "entry-1",
    reviewProfile,
    parameterSetId: `${reviewProfile}-fsrs-v1`,
    firstRatedAt: "2026-07-19T01:00:00.000Z",
    historyOrigin: "recorded",
    status: "review",
    dueAt: "2026-07-20T01:00:00.000Z",
    lastReviewedAt: "2026-07-19T01:00:00.000Z",
    reviewCount: 1,
    lapseCount: 0,
    intervalMinutes: 1440,
    difficulty: 3,
    stability: 1,
    updatedAt: "2026-07-19T01:00:00.000Z",
  };
}

describe("client review snapshot updates", () => {
  it("applies a rating idempotently and keeps the other Track isolated", () => {
    const recognitionEvent = event("recognition-event");
    const recognitionState = state("recognition-state");
    const activeEvent = event("active-event", "active");
    const activeState = state("active-state", "active");
    const data = {
      ...createEmptyVocabularyData(),
      reviewEvents: [activeEvent],
      reviewStates: [activeState],
    };

    const first = applyRecordedReviewToClientSnapshot(data, {
      event: recognitionEvent,
      state: recognitionState,
    });
    const replay = applyRecordedReviewToClientSnapshot(first, {
      event: recognitionEvent,
      state: recognitionState,
    });

    expect(replay.reviewEvents.map((entry) => entry.id)).toEqual([
      "recognition-event",
      "active-event",
    ]);
    expect(replay.reviewStates).toEqual([recognitionState, activeState]);
  });

  it("does not let a delayed replay regress a newer event order or state", () => {
    const olderEvent = event("older-event");
    const olderState = state("older-state");
    const newerEvent = {
      ...event("newer-event"),
      reviewedAt: "2026-07-19T02:00:00.000Z",
    };
    const newerState = {
      ...state("newer-state"),
      dueAt: "2026-07-22T02:00:00.000Z",
      updatedAt: "2026-07-19T02:00:00.000Z",
    };
    const data = {
      ...createEmptyVocabularyData("2026-07-19T02:00:00.000Z"),
      reviewEvents: [newerEvent],
      reviewStates: [newerState],
    };

    const updated = applyRecordedReviewToClientSnapshot(data, {
      event: olderEvent,
      state: olderState,
    });

    expect(updated.reviewEvents.map((entry) => entry.id)).toEqual([
      "newer-event",
      "older-event",
    ]);
    expect(updated.reviewStates).toEqual([newerState]);
    expect(updated.updatedAt).toBe("2026-07-19T02:00:00.000Z");
  });

  it("removes the rolled-back event and replaces only its matching state", () => {
    const removedEvent = event("remove-me");
    const activeEvent = event("keep-active", "active");
    const oldRecognitionState = state("old-recognition");
    const rebuiltRecognitionState = {
      ...state("rebuilt-recognition"),
      reviewCount: 2,
    };
    const activeState = state("keep-active-state", "active");
    const data = {
      ...createEmptyVocabularyData(),
      reviewEvents: [removedEvent, activeEvent],
      reviewStates: [oldRecognitionState, activeState],
    };

    const updated = applyRolledBackReviewToClientSnapshot(data, {
      event: removedEvent,
      state: rebuiltRecognitionState,
    });

    expect(updated.reviewEvents).toEqual([activeEvent]);
    expect(updated.reviewStates).toEqual([rebuiltRecognitionState, activeState]);
  });

  it("removes only the matching state when rollback has no rebuilt state", () => {
    const removedEvent = event("remove-final");
    const activeState = state("keep-active-state", "active");
    const data = {
      ...createEmptyVocabularyData(),
      reviewEvents: [removedEvent],
      reviewStates: [state("remove-state"), activeState],
    };

    const updated = applyRolledBackReviewToClientSnapshot(data, {
      event: removedEvent,
      state: null,
    });

    expect(updated.reviewEvents).toEqual([]);
    expect(updated.reviewStates).toEqual([activeState]);
  });

  it("keeps a newer matching state when an older rollback response arrives late", () => {
    const removedEvent = event("remove-old");
    const newerState = {
      ...state("newer-state"),
      updatedAt: "2026-07-19T03:00:00.000Z",
    };
    const data = {
      ...createEmptyVocabularyData("2026-07-19T03:00:00.000Z"),
      reviewEvents: [removedEvent],
      reviewStates: [newerState],
    };

    const updated = applyRolledBackReviewToClientSnapshot(data, {
      event: removedEvent,
      state: null,
    });

    expect(updated.reviewStates).toEqual([newerState]);
    expect(updated.updatedAt).toBe("2026-07-19T03:00:00.000Z");
  });

  it("installs server-owned first-day plans once without replacing existing rows", () => {
    const data = createEmptyVocabularyData("2026-07-18T00:00:00.000Z");
    const today = {
      personId,
      localDate: "2026-07-19",
      timezone: "Australia/Melbourne",
      dayStartsAt: "2026-07-18T14:00:00.000Z",
      dayEndsAt: "2026-07-19T14:00:00.000Z",
      tracks: {
        recognition: {
          reviewProfile: "recognition" as const,
          status: "available" as const,
          planId: "recognition-plan",
          planVersion: 1,
          metrics: {
            addedToday: 0,
            suggestedReview: 3,
            reviewGoal: 20,
            newWordGoal: 5,
            reviewedToday: 0,
            learnedToday: 0,
            attemptsToday: 0,
          },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
        active: {
          reviewProfile: "active" as const,
          status: "available" as const,
          planId: "active-plan",
          planVersion: 1,
          metrics: {
            addedToday: 0,
            suggestedReview: 1,
            reviewGoal: 8,
            newWordGoal: 2,
            reviewedToday: 0,
            learnedToday: 0,
            attemptsToday: 0,
          },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
      },
    };

    const first = applyResolvedTodayToClientSnapshot(data, today);
    const second = applyResolvedTodayToClientSnapshot(first, today);

    expect(first.dailyStudyPlans.map((plan) => plan.id)).toEqual([
      "recognition-plan",
      "active-plan",
    ]);
    expect(first.dailyStudyDefaults).toHaveLength(2);
    expect(second).toBe(first);
  });

  it("does not replace a newer same-day plan with a delayed resolution", () => {
    const empty = createEmptyVocabularyData("2026-07-19T00:00:00.000Z");
    const initial = applyResolvedTodayToClientSnapshot(empty, {
      personId,
      localDate: "2026-07-19",
      timezone: "Australia/Melbourne",
      dayStartsAt: "2026-07-18T14:00:00.000Z",
      dayEndsAt: "2026-07-19T14:00:00.000Z",
      tracks: {
        recognition: {
          reviewProfile: "recognition",
          status: "available",
          planId: "recognition-v1",
          planVersion: 1,
          metrics: { addedToday: 0, suggestedReview: 0, reviewGoal: 20, newWordGoal: 5, reviewedToday: 0, learnedToday: 0, attemptsToday: 0 },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
        active: {
          reviewProfile: "active",
          status: "available",
          planId: "active-v1",
          planVersion: 1,
          metrics: { addedToday: 0, suggestedReview: 0, reviewGoal: 8, newWordGoal: 2, reviewedToday: 0, learnedToday: 0, attemptsToday: 0 },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
      },
    });
    const recognition = initial.dailyStudyPlans.find(
      (plan) => plan.reviewProfile === "recognition",
    );
    const newer = {
      ...initial,
      dailyStudyPlans: initial.dailyStudyPlans.map((plan) =>
        plan.reviewProfile === "recognition"
          ? { ...plan, id: "recognition-v2", planVersion: 2, reviewGoal: 30 }
          : plan,
      ),
    };
    const delayed = applyResolvedTodayToClientSnapshot(newer, {
      personId,
      localDate: "2026-07-19",
      timezone: "Australia/Melbourne",
      dayStartsAt: "2026-07-18T14:00:00.000Z",
      dayEndsAt: "2026-07-19T14:00:00.000Z",
      tracks: {
        recognition: {
          reviewProfile: "recognition",
          status: "available",
          planId: recognition!.id,
          planVersion: 1,
          metrics: { addedToday: 0, suggestedReview: 0, reviewGoal: 20, newWordGoal: 5, reviewedToday: 0, learnedToday: 0, attemptsToday: 0 },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
        active: {
          reviewProfile: "active",
          status: "available",
          planId: "active-v1",
          planVersion: 1,
          metrics: { addedToday: 0, suggestedReview: 0, reviewGoal: 8, newWordGoal: 2, reviewedToday: 0, learnedToday: 0, attemptsToday: 0 },
          recommendationVersion: "v2-stage1",
          calculatedAt: "2026-07-19T01:00:00.000Z",
          unavailableReason: null,
        },
      },
    });

    expect(
      delayed.dailyStudyPlans.find((plan) => plan.reviewProfile === "recognition"),
    ).toMatchObject({ id: "recognition-v2", planVersion: 2, reviewGoal: 30 });
    expect(
      resolveDailyStudyToday(
        delayed,
        "2026-07-19T02:00:00.000Z",
      ).today.tracks.recognition,
    ).toMatchObject({ planId: "recognition-v2", planVersion: 2 });
  });

  it("derives visible Today from the newly selected learner after an old response", () => {
    const base = createEmptyVocabularyData("2026-07-19T00:00:00.000Z");
    const secondPersonId = "person_anoria";
    const secondPerson = {
      ...base.people[0],
      id: secondPersonId,
      slug: "anoria",
      displayName: "Anoria",
    };
    const multiPerson = {
      ...base,
      people: [...base.people, secondPerson],
      selectedPersonId: secondPersonId,
      settingsByPerson: [
        ...base.settingsByPerson,
        { ...base.settingsByPerson[0], personId: secondPersonId },
      ],
    };
    const current = applyResolvedTodayToClientSnapshot(
      multiPerson,
      todayResponse(secondPersonId, "new-person"),
    );
    const afterOldResponse = applyResolvedTodayToClientSnapshot(
      current,
      todayResponse(personId, "old-person"),
    );
    const visible = resolveDailyStudyToday(
      afterOldResponse,
      "2026-07-19T02:00:00.000Z",
    );

    expect(visible.today.personId).toBe(secondPersonId);
    expect(visible.today.tracks.recognition).toMatchObject({
      planId: "new-person-recognition",
      planVersion: 1,
    });
  });
});
