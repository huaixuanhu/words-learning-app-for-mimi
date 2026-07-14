import { describe, expect, it } from "vitest";
import { getSelectedPersonId } from "@/lib/people/repository";
import { recordReview } from "@/lib/review/repository";
import { addVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import {
  getLearningStage,
  readDailyStudyQueue,
  resetDailyStudyToday,
  resolveDailyStudyToday,
  updateDailyStudyDefaults,
  updateDailyStudyTodayGoals,
} from "./runtime-engine";

const DAY_NOW = "2026-07-14T04:00:00.000Z";

function addItem(
  data: VocabularyData,
  input: Readonly<{
    id: string;
    surfaceText: string;
    learningTrack?: "recognition" | "active";
    systemCreatedAt?: string;
  }>,
) {
  return addVocabularyItem(
    data,
    {
      id: input.id,
      surfaceText: input.surfaceText,
      meaningZh: "测试",
      example: "A test example.",
      learningTrack: input.learningTrack ?? "recognition",
      source: "manual",
      systemCreatedAt: input.systemCreatedAt ?? "2026-07-14T01:00:00.000Z",
      timezone: "Australia/Melbourne",
    },
    input.systemCreatedAt ?? "2026-07-14T01:00:00.000Z",
  ).data;
}

function configuredData() {
  let data = createEmptyVocabularyData("2026-07-13T00:00:00.000Z");
  const personId = getSelectedPersonId(data);

  data = updateDailyStudyDefaults(
    data,
    {
      personId,
      timezone: "Australia/Melbourne",
      goals: [
        { personId, reviewProfile: "recognition", reviewGoal: 3, newWordGoal: 2 },
        { personId, reviewProfile: "active", reviewGoal: 4, newWordGoal: 1 },
      ],
    },
    "2026-07-13T01:00:00.000Z",
  );

  return data;
}

describe("daily study runtime engine", () => {
  it("resolves both Track plans once and counts a phrase as one added entry", () => {
    let data = configuredData();

    data = addItem(data, { id: "phrase-1", surfaceText: "take into account" });
    data = addItem(data, {
      id: "active-1",
      surfaceText: "articulate",
      learningTrack: "active",
    });

    const first = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: (() => {
        let number = 0;
        return () => `plan-${++number}`;
      })(),
    });
    const second = resolveDailyStudyToday(first.data, "2026-07-14T08:00:00.000Z");

    expect(first.data.dailyStudyPlans).toHaveLength(2);
    expect(second.data.dailyStudyPlans).toEqual(first.data.dailyStudyPlans);
    expect(first.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: {
        addedToday: 1,
        reviewGoal: 3,
        newWordGoal: 2,
        learnedToday: 0,
        reviewedToday: 0,
      },
    });
    expect(first.today.tracks.active).toMatchObject({
      status: "available",
      metrics: {
        addedToday: 1,
        reviewGoal: 4,
        newWordGoal: 1,
      },
    });
  });

  it("keeps New Words and Review queues independent", () => {
    let data = configuredData();

    data = addItem(data, { id: "new-1", surfaceText: "new one" });
    data = addItem(data, { id: "new-2", surfaceText: "new two" });
    data = addItem(data, {
      id: "review-1",
      surfaceText: "review one",
      systemCreatedAt: "2026-07-10T01:00:00.000Z",
    });
    data = recordReview(
      data,
      { vocabularyItemId: "review-1", rating: "forgot" },
      "2026-07-12T01:00:00.000Z",
    ).data;
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "recognition-or-active-plan",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const base = {
      personId: resolved.today.personId,
      planId: recognition.planId,
      localDate: resolved.today.localDate,
      reviewProfile: "recognition" as const,
      expectedPlanVersion: recognition.planVersion,
      requestedPageSize: 100,
      cursor: null,
    };
    const newPage = readDailyStudyQueue(resolved.data, { ...base, zone: "new" });
    const reviewPage = readDailyStudyQueue(resolved.data, { ...base, zone: "review" });

    expect(newPage.entries.map((entry) => entry.vocabularyItemId)).toEqual(["new-1", "new-2"]);
    expect(reviewPage.entries.map((entry) => entry.vocabularyItemId)).toEqual(["review-1"]);
  });

  it("issues prompt evidence only for the bounded selected page", () => {
    let data = configuredData();

    for (let index = 0; index < 150; index += 1) {
      data = addItem(data, {
        id: `new-${String(index).padStart(3, "0")}`,
        surfaceText: `new entry ${index}`,
      });
    }

    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "bounded-prompt-plan",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    let issued = 0;
    const page = readDailyStudyQueue(
      resolved.data,
      {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        reviewProfile: "recognition",
        expectedPlanVersion: recognition.planVersion,
        requestedPageSize: 100,
        zone: "new",
        cursor: null,
      },
      () => `prompt-${++issued}`,
    );

    expect(page.entries).toHaveLength(2);
    expect(issued).toBe(2);
    expect(page.entries.map((entry) => entry.promptToken)).toEqual([
      "prompt-1",
      "prompt-2",
    ]);
  });

  it("moves the first-rated entry from New to In review and counts one learned entry", () => {
    let data = addItem(configuredData(), {
      id: "phrase-1",
      surfaceText: "a blessing in disguise",
    });
    const first = resolveDailyStudyToday(data, DAY_NOW, { makePlanId: () => "plan-1" });

    data = recordReview(
      first.data,
      { vocabularyItemId: "phrase-1", rating: "vague", promptId: "prompt-1" },
      "2026-07-14T05:00:00.000Z",
    ).data;
    const afterRating = resolveDailyStudyToday(data, "2026-07-14T05:01:00.000Z");

    expect(getLearningStage(afterRating.data, "phrase-1", "recognition")).toBe("in_review");
    expect(afterRating.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: { learnedToday: 1, reviewedToday: 0, attemptsToday: 1 },
    });
  });

  it("stores zero and very large today goals without clamping", () => {
    const resolved = resolveDailyStudyToday(configuredData(), DAY_NOW, {
      makePlanId: () => "plan-goals",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const result = updateDailyStudyTodayGoals(
      resolved.data,
      {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        reviewProfile: "recognition",
        reviewGoal: 0,
        newWordGoal: 2_147_483_647,
        expectedPlanVersion: recognition.planVersion,
      },
      "2026-07-14T05:00:00.000Z",
    );

    expect(result.plan).toMatchObject({
      reviewGoal: 0,
      newWordGoal: 2_147_483_647,
      planVersion: recognition.planVersion + 1,
    });
    expect(() =>
      updateDailyStudyTodayGoals(result.data, {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        reviewProfile: "recognition",
        reviewGoal: 1,
        newWordGoal: 1,
        expectedPlanVersion: recognition.planVersion,
      }),
    ).toThrow("changed elsewhere");
  });

  it("resets Recognition events only after the final command and preserves the plans", () => {
    let data = addItem(configuredData(), { id: "new-1", surfaceText: "reset me" });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, { makePlanId: () => "plan-reset" });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    data = recordReview(
      resolved.data,
      { vocabularyItemId: "new-1", rating: "remembered" },
      "2026-07-14T05:00:00.000Z",
    ).data;
    const beforePlans = data.dailyStudyPlans;
    const reset = resetDailyStudyToday(
      data,
      {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: "reset-command-1",
      },
      "2026-07-14T05:05:00.000Z",
    );

    expect(reset.resetEventsCount).toBe(1);
    expect(reset.data.reviewEvents).toHaveLength(0);
    expect(reset.data.reviewStates).toHaveLength(0);
    expect(reset.data.dailyStudyPlans).toEqual(beforePlans);
    expect(reset.data.vocabularyCreationFacts).toHaveLength(1);
  });

  it("fails closed when an Active event exists inside the target day", () => {
    const resolved = resolveDailyStudyToday(configuredData(), DAY_NOW, {
      makePlanId: () => "plan-active-guard",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const guardedData: VocabularyData = {
      ...resolved.data,
      reviewEvents: [{
        id: "active-event-1",
        promptId: "active-prompt-1",
        personId: resolved.today.personId,
        vocabularyItemId: "active-item-1",
        reviewProfile: "active",
        activityType: "say",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        targetRevision: "target-revision-1",
        parameterSetId: "active-fsrs-v1",
        reviewedAt: "2026-07-14T05:00:00.000Z",
        rating: "hard",
        previousDueAt: null,
        nextDueAt: "2026-07-15T05:00:00.000Z",
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 1000,
      }],
    };

    expect(() =>
      resetDailyStudyToday(guardedData, {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: "reset-active-guard",
      }),
    ).toThrow("Reset is paused");
    expect(guardedData.reviewEvents).toHaveLength(1);
  });
});
