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
import { resolvePersonDay } from "./day-window";
import { parseVocabularyBackupText, serializeVocabularyBackup } from "@/lib/backup/json-backup";
import { findDailyEpisodePlan } from "@/lib/review/daily-episode";

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

function legacyMidnightPlans(data: VocabularyData, now: string) {
  const resolved = resolveDailyStudyToday(data, now);
  const calendarDay = resolvePersonDay(now, "Australia/Melbourne");
  return {
    ...resolved.data,
    dailyStudyPlans: resolved.data.dailyStudyPlans.map((plan) => ({
      ...plan,
      ...calendarDay,
    })),
  };
}

describe("06:00 study-day continuity", () => {
  it("counts both tracks across midnight and starts fresh at exactly 06:00", () => {
    let data = addItem(configuredData(), { id: "night-reading", surfaceText: "midnight" });
    data = addItem(data, {
      id: "night-active",
      surfaceText: "sunrise",
      learningTrack: "active",
    });
    const evening = resolveDailyStudyToday(data, "2026-07-14T13:00:00.000Z");
    const recognitionPlan = evening.data.dailyStudyPlans.find((plan) =>
      plan.reviewProfile === "recognition",
    )!;
    const activePlan = evening.data.dailyStudyPlans.find((plan) =>
      plan.reviewProfile === "active",
    )!;
    const reading = recordDailyReview(evening.data, {
      plan: recognitionPlan,
      vocabularyItemId: "night-reading",
      rating: "remembered",
      elapsedMs: 100,
      promptId: "night-reading-prompt",
    }, "2026-07-14T14:30:00.000Z");
    const active = recordDailyStudyReview(reading.data, {
      plan: activePlan,
      vocabularyItemId: "night-active",
      rating: "remembered",
      elapsedMs: 100,
      promptId: "night-active-prompt",
      activityType: "say",
      answerOutcome: "self_rated",
      answerNormalizationVersion: null,
      targetRevision: "night-active-target",
    }, "2026-07-14T19:59:59.000Z");
    const overnight = resolveDailyStudyToday(active.data, "2026-07-14T19:59:59.999Z");

    expect(overnight.today.localDate).toBe("2026-07-14");
    expect(overnight.data.dailyStudyPlans).toEqual(evening.data.dailyStudyPlans);
    expect(overnight.today.tracks.recognition).toMatchObject({ metrics: { learnedToday: 1 } });
    expect(overnight.today.tracks.active).toMatchObject({ metrics: { learnedToday: 1 } });

    const morning = resolveDailyStudyToday(overnight.data, "2026-07-14T20:00:00.000Z");
    expect(morning.today.localDate).toBe("2026-07-15");
    expect(morning.today.tracks.recognition).toMatchObject({ metrics: { learnedToday: 0 } });
    expect(morning.today.tracks.active).toMatchObject({ metrics: { learnedToday: 0 } });
    expect(morning.data.reviewEvents).toEqual(overnight.data.reviewEvents);
    expect(() => recordDailyReview(morning.data, {
      plan: recognitionPlan,
      vocabularyItemId: "night-reading",
      rating: "remembered",
      elapsedMs: 100,
      promptId: "closed-day-prompt",
    }, "2026-07-14T20:00:00.000Z")).toThrow("supplied plan");

    expect(() => resetDailyStudyToday(morning.data, {
      personId: recognitionPlan.personId,
      planId: recognitionPlan.id,
      localDate: recognitionPlan.localDate,
      contractVersion: "v2-stage1",
      finalConfirmation: "confirmed_after_second_gate",
      idempotencyKey: "closed-day-reset",
    }, morning.today.dayStartsAt)).toThrow("study day has ended");
    expect(() => updateDailyStudyTodayGoals(morning.data, {
      personId: recognitionPlan.personId,
      planId: recognitionPlan.id,
      localDate: recognitionPlan.localDate,
      reviewProfile: "recognition",
      expectedPlanVersion: recognitionPlan.planVersion,
      reviewGoal: 1,
      newWordGoal: 1,
    }, morning.today.dayStartsAt)).toThrow("study day has ended");
  });

  it("preserves old windows and creates a single contiguous transition day for both tracks", () => {
    const data = legacyMidnightPlans(configuredData(), DAY_NOW);
    const retainedPlans = structuredClone(data.dailyStudyPlans);
    const evening = resolveDailyStudyToday(data, "2026-07-14T13:59:59.999Z");
    expect(evening.data).toBe(data);
    expect(evening.today.dayEndsAt).toBe("2026-07-14T14:00:00.000Z");

    const midnight = resolveDailyStudyToday(data, "2026-07-14T14:00:00.000Z");
    expect(midnight.today).toMatchObject({
      localDate: "2026-07-15",
      dayStartsAt: "2026-07-14T14:00:00.000Z",
      dayEndsAt: "2026-07-15T20:00:00.000Z",
    });
    expect(midnight.data.dailyStudyPlans.slice(2)).toEqual(retainedPlans);
    expect(midnight.data.dailyStudyPlans.slice(0, 2).map((plan) => plan.reviewProfile).sort())
      .toEqual(["active", "recognition"]);
    for (const now of ["2026-07-14T20:00:00.000Z", "2026-07-15T19:59:59.999Z"]) {
      const continued = resolveDailyStudyToday(midnight.data, now);
      expect(continued.data).toBe(midnight.data);
      expect(continued.today.dayEndsAt).toBe(midnight.today.dayEndsAt);
    }
    const normal = resolveDailyStudyToday(midnight.data, midnight.today.dayEndsAt);
    expect(normal.today).toMatchObject({
      localDate: "2026-07-16",
      dayStartsAt: midnight.today.dayEndsAt,
      dayEndsAt: "2026-07-16T20:00:00.000Z",
    });
  });

  it.each([
    ["2026-04-04T03:00:00.000Z", 31],
    ["2026-10-03T04:00:00.000Z", 29],
  ])("resolves the one-time midnight transition across DST at %s", (now, hours) => {
    const data = legacyMidnightPlans(configuredData(), now);
    const end = data.dailyStudyPlans[0].dayEndsAt;
    const transition = resolveDailyStudyToday(data, end);
    expect(transition.today.dayStartsAt).toBe(end);
    expect(Date.parse(transition.today.dayEndsAt) - Date.parse(end))
      .toBe(Number(hours) * 60 * 60 * 1000);
    expect(transition.data.dailyStudyPlans.slice(2)).toEqual(data.dailyStudyPlans);
  });

  it("round-trips legacy, transition and 06:00 plans with their original review evidence", () => {
    const data = legacyMidnightPlans(
      addItem(configuredData(), { id: "backup-night", surfaceText: "overnight" }),
      DAY_NOW,
    );
    const legacyPlan = data.dailyStudyPlans.find((plan) => plan.reviewProfile === "recognition")!;
    const beforeMidnight = recordDailyReview(data, {
      plan: legacyPlan,
      vocabularyItemId: "backup-night",
      rating: "forgot",
      promptId: "backup-legacy-prompt",
    }, "2026-07-14T13:30:00.000Z");
    const transition = resolveDailyStudyToday(beforeMidnight.data, legacyPlan.dayEndsAt);
    const transitionPlan = transition.data.dailyStudyPlans.find((plan) =>
      plan.reviewProfile === "recognition" && plan.localDate === transition.today.localDate,
    )!;
    const afterMidnight = recordDailyReview(transition.data, {
      plan: transitionPlan,
      vocabularyItemId: "backup-night",
      rating: "remembered",
      promptId: "backup-transition-prompt",
    }, "2026-07-14T14:30:00.000Z");
    const successor = resolveDailyStudyToday(afterMidnight.data, transition.today.dayEndsAt);
    const serialized = serializeVocabularyBackup(successor.data, {
      exportedAt: "2026-07-15T20:01:00.000Z",
      timezone: "Australia/Melbourne",
    });
    const parsed = parseVocabularyBackupText(serialized, "2026-07-15T20:02:00.000Z");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    expect(JSON.parse(serialized).backupVersion).toBe(4);
    expect(parsed.data.schemaVersion).toBe(6);
    expect(parsed.data.dailyStudyPlans).toEqual(successor.data.dailyStudyPlans);
    expect(parsed.data.dailyStudyPlans).toHaveLength(6);
    expect(parsed.data.reviewEvents).toEqual(successor.data.reviewEvents);
    expect(parsed.data.reviewStates).toEqual(successor.data.reviewStates);
    expect(parsed.data.vocabularyCreationFacts).toEqual(successor.data.vocabularyCreationFacts);
    expect(parsed.data.dailyStudyDefaults).toEqual(successor.data.dailyStudyDefaults);
    expect(findDailyEpisodePlan(beforeMidnight.event, parsed.data.dailyStudyPlans)?.id)
      .toBe(legacyPlan.id);
    expect(findDailyEpisodePlan(afterMidnight.event, parsed.data.dailyStudyPlans)?.id)
      .toBe(transitionPlan.id);
    expect(resolveDailyStudyToday(parsed.data, "2026-07-15T20:02:00.000Z").today)
      .toEqual(successor.today);
  });

  it("reuses an existing legacy successor and fills its missing paired track", () => {
    const previous = legacyMidnightPlans(configuredData(), DAY_NOW);
    const successor = legacyMidnightPlans(configuredData(), "2026-07-14T15:00:00.000Z");
    const retainedSuccessor = successor.dailyStudyPlans.find((plan) =>
      plan.reviewProfile === "recognition",
    )!;
    const data = {
      ...previous,
      dailyStudyPlans: [retainedSuccessor, ...previous.dailyStudyPlans],
    };
    const resolved = resolveDailyStudyToday(data, "2026-07-14T16:00:00.000Z");
    expect(resolved.today.dayEndsAt).toBe(retainedSuccessor.dayEndsAt);
    expect(resolved.data.dailyStudyPlans).toContainEqual(retainedSuccessor);
    expect(resolved.data.dailyStudyPlans.filter((plan) =>
      plan.localDate === retainedSuccessor.localDate,
    )).toHaveLength(2);
  });

  it.each([
    ["Asia/Tokyo", "2026-07-15T21:00:00.000Z"],
    ["Pacific/Auckland", "2026-07-15T18:00:00.000Z"],
  ])("applies timezone %s after the frozen window without a gap or overlap", (timezone, dayEndsAt) => {
    const original = resolveDailyStudyToday(configuredData(), DAY_NOW);
    const changed = updateDailyStudyDefaults(original.data, {
      personId: original.today.personId,
      timezone,
      goals: original.data.dailyStudyDefaults.map((defaults) => ({
        personId: defaults.personId,
        reviewProfile: defaults.reviewProfile,
        reviewGoal: defaults.reviewGoal,
        newWordGoal: defaults.newWordGoal,
      })),
    }, "2026-07-14T10:00:00.000Z");
    const before = resolveDailyStudyToday(changed, "2026-07-14T19:59:59.999Z");
    expect(before.today.timezone).toBe("Australia/Melbourne");

    const after = resolveDailyStudyToday(changed, original.today.dayEndsAt);
    expect(after.today).toMatchObject({
      localDate: "2026-07-15",
      timezone,
      dayStartsAt: original.today.dayEndsAt,
      dayEndsAt,
    });
    expect(after.data.dailyStudyPlans.slice(2)).toEqual(original.data.dailyStudyPlans);
    const next = resolveDailyStudyToday(after.data, dayEndsAt);
    expect(next.today.dayStartsAt).toBe(dayEndsAt);
    expect(next.today.localDate).toBe("2026-07-16");
  });

  it("preserves used date keys when a timezone change crosses the date line", () => {
    const base = configuredData();
    const east = {
      ...base,
      settingsByPerson: base.settingsByPerson.map((settings) => ({
        ...settings, timezone: "Pacific/Kiritimati",
      })),
    };
    const first = resolveDailyStudyToday(east, "2026-07-14T04:00:00.000Z");
    const second = resolveDailyStudyToday(first.data, first.today.dayEndsAt);
    const west = {
      ...second.data,
      settingsByPerson: second.data.settingsByPerson.map((settings) => ({
        ...settings, timezone: "Etc/GMT+12",
      })),
    };
    const after = resolveDailyStudyToday(west, second.today.dayEndsAt);
    expect(after.today).toMatchObject({
      localDate: "2026-07-16",
      dayStartsAt: second.today.dayEndsAt,
      dayEndsAt: "2026-07-17T18:00:00.000Z",
    });
    expect(after.data.dailyStudyPlans.slice(2)).toEqual(second.data.dailyStudyPlans);
    const next = resolveDailyStudyToday(after.data, after.today.dayEndsAt);
    expect(next.today.localDate).toBe("2026-07-17");
    expect(next.today.dayStartsAt).toBe(after.today.dayEndsAt);
  });

  it("rejects retained overlaps and conflicting track windows without changing history", () => {
    const previous = legacyMidnightPlans(configuredData(), DAY_NOW);
    const before = structuredClone(previous);
    const conflict = {
      ...previous,
      dailyStudyPlans: previous.dailyStudyPlans.map((plan, index) => index === 0 ? {
        ...plan,
        dayEndsAt: "2026-07-14T15:00:00.000Z",
      } : plan),
    };
    expect(() => resolveDailyStudyToday(conflict, "2026-07-14T14:30:00.000Z"))
      .toThrow("conflicting daily windows");
    const futureConflict = {
      ...previous,
      dailyStudyPlans: [...previous.dailyStudyPlans, {
        ...previous.dailyStudyPlans[0],
        id: "future-conflict",
        localDate: "2026-07-15",
        dayStartsAt: "2026-07-14T20:00:00.000Z",
        dayEndsAt: "2026-07-15T20:00:00.000Z",
      }],
    };
    expect(() => resolveDailyStudyToday(futureConflict, "2026-07-14T14:30:00.000Z"))
      .toThrow("overlaps a retained plan");
    expect(previous).toEqual(before);
  });
});

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
      }, "2026-07-14T06:00:00.000Z");

    expect(reset.resetEventsCount).toBe(1);
    expect(reset.resetItemsCount).toBe(1);
    expect(reset.data.reviewEvents).toHaveLength(0);
    expect(reset.data.reviewStates).toHaveLength(0);
    expect(guardedData.reviewEvents).toHaveLength(1);
  });
});
