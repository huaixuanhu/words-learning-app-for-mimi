import { describe, expect, it } from "vitest";
import { getSelectedPersonId } from "@/lib/people/repository";
import {
  recordDailyReview,
  recordDailyStudyReview,
  recordReview,
  rollbackReviewEvent,
} from "@/lib/review/repository";
import { addVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import {
  getLearningStage,
  createActiveTargetRevision,
  readDailyStudyQueue,
  resetDailyStudyToday,
  resolveDailyStudyToday,
  updateDailyStudyDefaults,
  updateDailyStudyTodayGoals,
} from "./runtime-engine";
import type { PromptSeed } from "./runtime-engine";

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
    expect(second.data).toBe(first.data);
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

  it("keeps Active mixed attempts on the first scheduling anchor", () => {
    let data = configuredData();

    data = addItem(data, {
      id: "active-episode-1",
      surfaceText: "take into account",
      learningTrack: "active",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: (() => {
        let number = 0;
        return () => `active-plan-${++number}`;
      })(),
    });
    const active = resolved.today.tracks.active;

    if (active.status !== "available") {
      throw new Error("Active plan should be available");
    }

    let issuedSeed: PromptSeed | undefined;
    const page = readDailyStudyQueue(
      resolved.data,
      {
        personId: resolved.today.personId,
        planId: active.planId,
        localDate: resolved.today.localDate,
        reviewProfile: "active",
        activityType: "spell",
        expectedPlanVersion: active.planVersion,
        requestedPageSize: 100,
        zone: "new",
        cursor: null,
      },
      (seed) => {
        issuedSeed = seed;
        return "active-prompt";
      },
    );

    expect(page.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "active-episode-1",
    ]);
    expect(issuedSeed!).toMatchObject({
      reviewProfile: "active",
      activityType: "spell",
      targetRevision: createActiveTargetRevision(
        resolved.data.items.find((item) => item.id === "active-episode-1")!,
      ),
    });
    expect(JSON.stringify(issuedSeed!)).not.toContain("take into account");

    const plan = resolved.data.dailyStudyPlans.find(
      (candidate) => candidate.id === active.planId,
    )!;
    const first = recordDailyStudyReview(
      resolved.data,
      {
        plan,
        vocabularyItemId: "active-episode-1",
        rating: "forgot",
        promptId: "active-prompt-1",
        elapsedMs: 1_000,
        activityType: "spell",
        answerOutcome: "different",
        answerNormalizationVersion: "active-answer-v1",
        targetRevision: "target-revision-1",
      },
      "2026-07-14T05:00:00.000Z",
    );
    const recovered = recordDailyStudyReview(
      first.data,
      {
        plan,
        vocabularyItemId: "active-episode-1",
        rating: "remembered",
        promptId: "active-prompt-2",
        elapsedMs: 2_000,
        activityType: "dictation",
        answerOutcome: "exact",
        answerNormalizationVersion: "active-answer-v1",
        targetRevision: "target-revision-1",
      },
      "2026-07-14T05:10:00.000Z",
    );

    expect(recovered.data.reviewEvents).toHaveLength(2);
    expect(recovered.state).toMatchObject({
      reviewProfile: "active",
      parameterSetId: "active-fsrs-v2",
      dueAt: first.state.dueAt,
      lastReviewedAt: first.state.lastReviewedAt,
      reviewCount: first.state.reviewCount,
      lapseCount: first.state.lapseCount,
      difficulty: first.state.difficulty,
      stability: first.state.stability,
    });
    const refreshed = resolveDailyStudyToday(
      recovered.data,
      "2026-07-14T05:11:00.000Z",
    );
    expect(refreshed.today.tracks.active).toMatchObject({
      status: "available",
      metrics: { learnedToday: 1, attemptsToday: 2 },
    });
  });

  it("omits an Active entry without a Chinese meaning without deleting it", () => {
    let data = configuredData();
    data = addVocabularyItem(
      data,
      {
        id: "active-missing-meaning",
        surfaceText: "articulate",
        meaningZh: "",
        meaningsZh: [],
        learningTrack: "active",
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-14T01:00:00.000Z",
    ).data;
    data = addItem(data, {
      id: "active-ready",
      surfaceText: "take into account",
      learningTrack: "active",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "active-meaning-plan",
    });
    const active = resolved.today.tracks.active;

    if (active.status !== "available") {
      throw new Error("Active plan should be available");
    }

    const page = readDailyStudyQueue(resolved.data, {
      personId: resolved.today.personId,
      planId: active.planId,
      localDate: resolved.today.localDate,
      reviewProfile: "active",
      activityType: "say",
      expectedPlanVersion: active.planVersion,
      requestedPageSize: 100,
      zone: "new",
      cursor: null,
    });

    expect(page.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "active-ready",
    ]);
    expect(
      resolved.data.items.some((item) => item.id === "active-missing-meaning"),
    ).toBe(true);
  });

  it("moves the first-rated entry from New to In review and counts one learned entry", () => {
    let data = addItem(configuredData(), {
      id: "phrase-1",
      surfaceText: "a blessing in disguise",
    });
    const first = resolveDailyStudyToday(data, DAY_NOW, { makePlanId: () => "plan-1" });

    const plan = first.data.dailyStudyPlans.find(
      (candidate) =>
        candidate.id === first.today.tracks.recognition.planId &&
        candidate.reviewProfile === "recognition",
    );

    if (!plan) {
      throw new Error("Recognition plan should exist");
    }

    data = recordDailyReview(
      first.data,
      {
        plan,
        vocabularyItemId: "phrase-1",
        rating: "vague",
        promptId: "prompt-1",
      },
      "2026-07-14T05:00:00.000Z",
    ).data;
    const afterRating = resolveDailyStudyToday(data, "2026-07-14T05:01:00.000Z");

    expect(getLearningStage(afterRating.data, "phrase-1", "recognition")).toBe("in_review");
    expect(afterRating.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: { learnedToday: 1, reviewedToday: 0, attemptsToday: 1 },
    });
    expect(afterRating.data.reviewStates[0]?.dueAt).toBe(plan.dayEndsAt);
  });

  it("keeps a failed-only new entry unfinished and returns it after a queue reread", () => {
    let data = addItem(configuredData(), {
      id: "new-fragile",
      surfaceText: "fragile",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "plan-failed-new",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const plan = resolved.data.dailyStudyPlans.find(
      (candidate) => candidate.id === recognition.planId,
    );

    if (!plan) {
      throw new Error("Recognition plan should exist");
    }

    data = recordDailyReview(
      resolved.data,
      { plan, vocabularyItemId: "new-fragile", rating: "hard" },
      "2026-07-14T05:00:00.000Z",
    ).data;
    const refreshed = resolveDailyStudyToday(data, "2026-07-14T05:05:00.000Z");
    const page = readDailyStudyQueue(refreshed.data, {
      personId: refreshed.today.personId,
      planId: recognition.planId,
      localDate: refreshed.today.localDate,
      reviewProfile: "recognition",
      expectedPlanVersion: recognition.planVersion,
      requestedPageSize: 100,
      zone: "new",
      cursor: null,
    });

    expect(refreshed.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: { learnedToday: 0, reviewedToday: 0, attemptsToday: 1 },
    });
    expect(page.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "new-fragile",
    ]);
    expect(refreshed.data.reviewStates[0]).toMatchObject({
      dueAt: plan.dayEndsAt,
      reviewCount: 1,
    });
    expect(refreshed.data.reviewEvents[0]?.rating).toBe("hard");
  });

  it("keeps the first failure as the cross-day anchor after a later pass", () => {
    const data = addItem(configuredData(), {
      id: "new-recovery",
      surfaceText: "recover",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "plan-recovery",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const plan = resolved.data.dailyStudyPlans.find(
      (candidate) => candidate.id === recognition.planId,
    );

    if (!plan) {
      throw new Error("Recognition plan should exist");
    }

    const failed = recordDailyReview(
      resolved.data,
      { plan, vocabularyItemId: "new-recovery", rating: "forgot" },
      "2026-07-14T05:00:00.000Z",
    );
    const passed = recordDailyReview(
      failed.data,
      { plan, vocabularyItemId: "new-recovery", rating: "remembered" },
      "2026-07-14T05:10:00.000Z",
    );
    const afterPass = resolveDailyStudyToday(passed.data, "2026-07-14T05:11:00.000Z");
    const nextNow = new Date(
      new Date(plan.dayEndsAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
    const nextDay = resolveDailyStudyToday(passed.data, nextNow, {
      makePlanId: () => "next-plan",
    });
    const nextRecognition = nextDay.today.tracks.recognition;

    if (nextRecognition.status !== "available") {
      throw new Error("Next Recognition plan should be available");
    }

    const nextPage = readDailyStudyQueue(nextDay.data, {
      personId: nextDay.today.personId,
      planId: nextRecognition.planId,
      localDate: nextDay.today.localDate,
      reviewProfile: "recognition",
      expectedPlanVersion: nextRecognition.planVersion,
      requestedPageSize: 100,
      zone: "review",
      cursor: null,
    });

    expect(passed.state).toMatchObject({
      dueAt: plan.dayEndsAt,
      lastReviewedAt: "2026-07-14T05:00:00.000Z",
      reviewCount: 1,
    });
    expect(passed.data.reviewEvents.map((event) => event.rating)).toEqual([
      "remembered",
      "forgot",
    ]);
    expect(afterPass.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: { learnedToday: 1, reviewedToday: 0, attemptsToday: 2 },
    });
    expect(nextPage.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "new-recovery",
    ]);
  });

  it("reopens an unfinished episode when the later passing attempt is returned", () => {
    const data = addItem(configuredData(), {
      id: "new-rollback",
      surfaceText: "rollback",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "plan-rollback-episode",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const plan = resolved.data.dailyStudyPlans.find(
      (candidate) => candidate.id === recognition.planId,
    );

    if (!plan) {
      throw new Error("Recognition plan should exist");
    }

    const failed = recordDailyReview(
      resolved.data,
      { plan, vocabularyItemId: "new-rollback", rating: "hard" },
      "2026-07-14T05:00:00.000Z",
    );
    const passed = recordDailyReview(
      failed.data,
      { plan, vocabularyItemId: "new-rollback", rating: "vague" },
      "2026-07-14T05:10:00.000Z",
    );
    const rollback = rollbackReviewEvent(
      passed.data,
      passed.event.id,
      "2026-07-14T05:11:00.000Z",
    );
    const afterRollback = resolveDailyStudyToday(
      rollback.data,
      "2026-07-14T05:12:00.000Z",
    );
    const page = readDailyStudyQueue(afterRollback.data, {
      personId: afterRollback.today.personId,
      planId: recognition.planId,
      localDate: afterRollback.today.localDate,
      reviewProfile: "recognition",
      expectedPlanVersion: recognition.planVersion,
      requestedPageSize: 100,
      zone: "new",
      cursor: null,
    });

    expect(rollback.state).toMatchObject({
      dueAt: plan.dayEndsAt,
      reviewCount: 1,
    });
    expect(afterRollback.today.tracks.recognition).toMatchObject({
      status: "available",
      metrics: { learnedToday: 0, attemptsToday: 1 },
    });
    expect(page.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "new-rollback",
    ]);
  });

  it("orders equal next-day checkpoints by retained failure counts", () => {
    let data = addItem(configuredData(), {
      id: "hard-once",
      surfaceText: "hard once",
    });
    data = addItem(data, {
      id: "forgot-twice",
      surfaceText: "forgot twice",
    });
    const resolved = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "plan-weakness-order",
    });
    const recognition = resolved.today.tracks.recognition;

    if (recognition.status !== "available") {
      throw new Error("Recognition plan should be available");
    }

    const plan = resolved.data.dailyStudyPlans.find(
      (candidate) => candidate.id === recognition.planId,
    );

    if (!plan) {
      throw new Error("Recognition plan should exist");
    }

    const hard = recordDailyReview(
      resolved.data,
      { plan, vocabularyItemId: "hard-once", rating: "hard" },
      "2026-07-14T05:00:00.000Z",
    );
    const hardPass = recordDailyReview(
      hard.data,
      { plan, vocabularyItemId: "hard-once", rating: "vague" },
      "2026-07-14T05:01:00.000Z",
    );
    const forgotOne = recordDailyReview(
      hardPass.data,
      { plan, vocabularyItemId: "forgot-twice", rating: "forgot" },
      "2026-07-14T05:02:00.000Z",
    );
    const forgotTwo = recordDailyReview(
      forgotOne.data,
      { plan, vocabularyItemId: "forgot-twice", rating: "forgot" },
      "2026-07-14T05:03:00.000Z",
    );
    const forgotPass = recordDailyReview(
      forgotTwo.data,
      { plan, vocabularyItemId: "forgot-twice", rating: "vague" },
      "2026-07-14T05:04:00.000Z",
    );
    const nextNow = new Date(
      new Date(plan.dayEndsAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
    const nextDay = resolveDailyStudyToday(forgotPass.data, nextNow, {
      makePlanId: () => "next-plan-weakness-order",
    });
    const nextRecognition = nextDay.today.tracks.recognition;

    if (nextRecognition.status !== "available") {
      throw new Error("Next Recognition plan should be available");
    }

    const page = readDailyStudyQueue(nextDay.data, {
      personId: nextDay.today.personId,
      planId: nextRecognition.planId,
      localDate: nextDay.today.localDate,
      reviewProfile: "recognition",
      expectedPlanVersion: nextRecognition.planVersion,
      requestedPageSize: 100,
      zone: "review",
      cursor: null,
    });

    expect(page.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "forgot-twice",
      "hard-once",
    ]);
  });

  it("restores the prior episode anchor when the next study day is reset", () => {
    const data = addItem(configuredData(), {
      id: "reset-episode",
      surfaceText: "reset episode",
    });
    const firstDay = resolveDailyStudyToday(data, DAY_NOW, {
      makePlanId: () => "first-day-plan",
    });
    const firstRecognition = firstDay.today.tracks.recognition;

    if (firstRecognition.status !== "available") {
      throw new Error("First Recognition plan should be available");
    }

    const firstPlan = firstDay.data.dailyStudyPlans.find(
      (candidate) => candidate.id === firstRecognition.planId,
    );

    if (!firstPlan) {
      throw new Error("First Recognition plan should exist");
    }

    const failed = recordDailyReview(
      firstDay.data,
      { plan: firstPlan, vocabularyItemId: "reset-episode", rating: "forgot" },
      "2026-07-14T05:00:00.000Z",
    );
    const firstPass = recordDailyReview(
      failed.data,
      { plan: firstPlan, vocabularyItemId: "reset-episode", rating: "vague" },
      "2026-07-14T05:05:00.000Z",
    );
    const firstState = firstPass.state;
    const nextNow = new Date(
      new Date(firstPlan.dayEndsAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
    const secondDay = resolveDailyStudyToday(firstPass.data, nextNow, {
      makePlanId: () => "second-day-plan",
    });
    const secondRecognition = secondDay.today.tracks.recognition;

    if (secondRecognition.status !== "available") {
      throw new Error("Second Recognition plan should be available");
    }

    const secondPlan = secondDay.data.dailyStudyPlans.find(
      (candidate) => candidate.id === secondRecognition.planId,
    );

    if (!secondPlan) {
      throw new Error("Second Recognition plan should exist");
    }

    const secondPass = recordDailyReview(
      secondDay.data,
      { plan: secondPlan, vocabularyItemId: "reset-episode", rating: "remembered" },
      nextNow,
    );
    const reset = resetDailyStudyToday(
      secondPass.data,
      {
        personId: secondDay.today.personId,
        planId: secondRecognition.planId,
        localDate: secondDay.today.localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: "reset-second-episode",
      },
      new Date(new Date(nextNow).getTime() + 5 * 60 * 1000).toISOString(),
    );

    expect(reset.resetEventsCount).toBe(1);
    expect(reset.data.reviewStates[0]).toMatchObject({
      dueAt: firstState.dueAt,
      lastReviewedAt: firstState.lastReviewedAt,
      reviewCount: firstState.reviewCount,
      lapseCount: firstState.lapseCount,
      difficulty: firstState.difficulty,
      stability: firstState.stability,
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

  it("removes Active events and rebuilds the profile during whole-day reset", () => {
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

    const reset = resetDailyStudyToday(guardedData, {
        personId: resolved.today.personId,
        planId: recognition.planId,
        localDate: resolved.today.localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: "reset-active-guard",
      });

    expect(reset.resetEventsCount).toBe(1);
    expect(reset.resetItemsCount).toBe(1);
    expect(reset.data.reviewEvents).toHaveLength(0);
    expect(reset.data.reviewStates).toHaveLength(0);
    expect(guardedData.reviewEvents).toHaveLength(1);
  });
});
