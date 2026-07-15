import { describe, expect, it } from "vitest";
import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import type { ReviewEvent, ReviewState } from "./types";
import {
  findDailyEpisodePlan,
  getDailyEpisodeAttemptSummary,
  getDailyEpisodeEvents,
  scheduleDailyEpisodeAttempt,
} from "./daily-episode";

const PLAN: DailyStudyPlanRecord = {
  id: "plan-recognition-1",
  personId: "person_mimi",
  reviewProfile: "recognition",
  localDate: "2026-07-14",
  timezone: "UTC",
  dayStartsAt: "2026-07-14T00:00:00.000Z",
  dayEndsAt: "2026-07-15T00:00:00.000Z",
  suggestedReview: 0,
  reviewGoal: 10,
  newWordGoal: 10,
  planVersion: 1,
  recommendationVersion: "v2-stage1",
  calculatedAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

function event(
  id: string,
  rating: ReviewEvent["rating"],
  reviewedAt: string,
): ReviewEvent {
  return {
    id,
    promptId: `prompt-${id}`,
    personId: PLAN.personId,
    vocabularyItemId: "vocab-1",
    reviewProfile: "recognition",
    activityType: "recognition_card",
    answerOutcome: "self_rated",
    answerNormalizationVersion: null,
    targetRevision: null,
    parameterSetId: "recognition-fsrs-v1",
    reviewedAt,
    rating,
    previousDueAt: null,
    nextDueAt: PLAN.dayEndsAt,
    previousIntervalMinutes: null,
    nextIntervalMinutes: 840,
    elapsedMs: 1_000,
  };
}

function state(overrides: Partial<ReviewState> = {}): ReviewState {
  return {
    id: "state-1",
    personId: PLAN.personId,
    vocabularyItemId: "vocab-1",
    reviewProfile: "recognition",
    parameterSetId: "recognition-fsrs-v1",
    firstRatedAt: "2026-07-01T00:00:00.000Z",
    historyOrigin: "recorded",
    status: "review",
    dueAt: "2026-07-14T00:00:00.000Z",
    lastReviewedAt: "2026-07-01T00:00:00.000Z",
    reviewCount: 2,
    lapseCount: 0,
    intervalMinutes: 18_720,
    difficulty: 4,
    stability: 3,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("daily Recognition episode scheduling", () => {
  it("caps a new direct vague rating at the next local day", () => {
    const result = scheduleDailyEpisodeAttempt({
      previousState: undefined,
      priorEpisodeEvents: [],
      rating: "vague",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      plan: PLAN,
    });

    expect(result.isSchedulingAnchor).toBe(true);
    expect(result.effectiveRating).toBe("vague");
    expect(result.schedule).toMatchObject({
      dueAt: PLAN.dayEndsAt,
      intervalMinutes: 840,
      reviewCount: 1,
    });
  });

  it("keeps a new direct remembered rating on the normal Easy interval", () => {
    const result = scheduleDailyEpisodeAttempt({
      previousState: undefined,
      priorEpisodeEvents: [],
      rating: "remembered",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      plan: PLAN,
    });

    expect(result.schedule.dueAt).toBe("2026-07-22T10:00:00.000Z");
    expect(result.schedule.intervalMinutes).toBe(11_520);
  });

  it("keeps a mature direct vague rating on its normal FSRS interval", () => {
    const result = scheduleDailyEpisodeAttempt({
      previousState: state(),
      priorEpisodeEvents: [],
      rating: "vague",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      plan: PLAN,
    });

    expect(result.schedule.dueAt).not.toBe(PLAN.dayEndsAt);
    expect(new Date(result.schedule.dueAt).getTime()).toBeGreaterThan(
      new Date(PLAN.dayEndsAt).getTime(),
    );
  });

  it("keeps hard as raw evidence but schedules its anchor as unsuccessful recall", () => {
    const hard = scheduleDailyEpisodeAttempt({
      previousState: state(),
      priorEpisodeEvents: [],
      rating: "hard",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      plan: PLAN,
    });
    const forgot = scheduleDailyEpisodeAttempt({
      previousState: state(),
      priorEpisodeEvents: [],
      rating: "forgot",
      reviewedAt: "2026-07-14T10:00:00.000Z",
      plan: PLAN,
    });

    expect(hard.effectiveRating).toBe("forgot");
    expect(hard.schedule).toEqual(forgot.schedule);
    expect(hard.schedule.dueAt).toBe(PLAN.dayEndsAt);
  });

  it("does not let a later same-day pass advance the anchor state", () => {
    const previousState = state({
      dueAt: PLAN.dayEndsAt,
      lastReviewedAt: "2026-07-14T10:00:00.000Z",
      reviewCount: 3,
      lapseCount: 1,
      intervalMinutes: 840,
      difficulty: 6.2,
      stability: 0.4,
      updatedAt: "2026-07-14T10:00:00.000Z",
    });
    const result = scheduleDailyEpisodeAttempt({
      previousState,
      priorEpisodeEvents: [event("failed", "forgot", "2026-07-14T10:00:00.000Z")],
      rating: "remembered",
      reviewedAt: "2026-07-14T10:10:00.000Z",
      plan: PLAN,
    });

    expect(result.isSchedulingAnchor).toBe(false);
    expect(result.effectiveRating).toBeNull();
    expect(result.schedule).toMatchObject({
      dueAt: PLAN.dayEndsAt,
      reviewCount: 3,
      lapseCount: 1,
      intervalMinutes: 840,
      difficulty: 6.2,
      stability: 0.4,
    });
  });

  it("derives completion and separate weakness counts from immutable attempts", () => {
    const summary = getDailyEpisodeAttemptSummary([
      event("one", "forgot", "2026-07-14T10:00:00.000Z"),
      event("two", "hard", "2026-07-14T10:05:00.000Z"),
      event("three", "forgot", "2026-07-14T10:10:00.000Z"),
      event("four", "vague", "2026-07-14T10:15:00.000Z"),
    ]);

    expect(summary).toMatchObject({
      completed: true,
      forgotCount: 2,
      hardCount: 1,
      attemptCount: 4,
    });
    expect(summary.anchor?.id).toBe("one");
  });

  it("uses the latest already-created plan when timezone changes create overlapping windows", () => {
    const earlierPlan = {
      ...PLAN,
      id: "earlier-plan",
      calculatedAt: "2026-07-14T00:00:00.000Z",
    };
    const laterPlan = {
      ...PLAN,
      id: "later-plan",
      timezone: "America/Los_Angeles",
      calculatedAt: "2026-07-14T08:00:00.000Z",
    };
    const beforeChange = event(
      "before-change",
      "vague",
      "2026-07-14T07:00:00.000Z",
    );
    const afterChange = event(
      "after-change",
      "vague",
      "2026-07-14T09:00:00.000Z",
    );

    expect(findDailyEpisodePlan(beforeChange, [earlierPlan, laterPlan])?.id).toBe(
      "earlier-plan",
    );
    expect(findDailyEpisodePlan(afterChange, [earlierPlan, laterPlan])?.id).toBe(
      "later-plan",
    );
    expect(
      getDailyEpisodeEvents(
        [beforeChange, afterChange],
        laterPlan,
        "vocab-1",
        [earlierPlan, laterPlan],
      ).map((candidate) => candidate.id),
    ).toEqual(["after-change"]);
  });
});
