import { describe, expect, it } from "vitest";
import { DEFAULT_PERSON_ID } from "@/lib/people/repository";
import type { ReviewEvent, ReviewProfile, ReviewRating, ReviewState } from "@/lib/review/types";
import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";
import { buildDashboardInsights } from "./insights";

const NOW = "2026-07-18T04:00:00.000Z";

function item(
  id: string,
  learningTrack: ReviewProfile = "recognition",
  status: VocabularyItem["status"] = "new",
): VocabularyItem {
  return {
    id,
    personId: DEFAULT_PERSON_ID,
    surfaceText: id,
    normalizedText: id,
    meaningZh: "测试",
    meaningsZh: ["测试"],
    example: "A test example.",
    examples: ["A test example."],
    notes: "",
    rarityScore: null,
    learningTrack,
    tags: null,
    source: "manual",
    importBatchId: null,
    status,
    createdAt: "2026-07-01T00:00:00.000Z",
    systemCreatedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    timezone: "Australia/Melbourne",
    archivedAt: status === "archived" ? "2026-07-10T00:00:00.000Z" : null,
  };
}

function event(input: {
  id: string;
  vocabularyItemId: string;
  reviewedAt: string;
  rating: ReviewRating;
  reviewProfile?: ReviewProfile;
  personId?: string;
}): ReviewEvent {
  const reviewProfile = input.reviewProfile ?? "recognition";

  return {
    id: input.id,
    promptId: null,
    personId: input.personId ?? DEFAULT_PERSON_ID,
    vocabularyItemId: input.vocabularyItemId,
    reviewProfile,
    activityType: reviewProfile === "recognition" ? "recognition_card" : "say",
    answerOutcome: "self_rated",
    answerNormalizationVersion: null,
    targetRevision: reviewProfile === "active" ? "active-revision" : null,
    parameterSetId:
      reviewProfile === "recognition" ? "recognition-fsrs-v1" : "active-fsrs-v1",
    reviewedAt: input.reviewedAt,
    rating: input.rating,
    previousDueAt: null,
    nextDueAt: "2026-07-19T14:00:00.000Z",
    previousIntervalMinutes: null,
    nextIntervalMinutes: 1440,
    elapsedMs: 1000,
  };
}

function state(input: {
  id: string;
  vocabularyItemId: string;
  dueAt: string;
  reviewProfile?: ReviewProfile;
  parameterSetId?: string;
  historyOrigin?: ReviewState["historyOrigin"];
  lastReviewedAt?: string | null;
  stability?: number | null;
  difficulty?: number | null;
}): ReviewState {
  const reviewProfile = input.reviewProfile ?? "recognition";
  const historyOrigin = input.historyOrigin ?? "recorded";

  return {
    id: input.id,
    personId: DEFAULT_PERSON_ID,
    vocabularyItemId: input.vocabularyItemId,
    reviewProfile,
    parameterSetId:
      input.parameterSetId ??
      (reviewProfile === "recognition" ? "recognition-fsrs-v1" : "active-fsrs-v1"),
    firstRatedAt: historyOrigin === "recorded" ? "2026-07-01T00:00:00.000Z" : null,
    historyOrigin,
    status: "review",
    dueAt: input.dueAt,
    lastReviewedAt:
      input.lastReviewedAt === undefined
        ? "2026-07-17T04:00:00.000Z"
        : input.lastReviewedAt,
    reviewCount: 2,
    lapseCount: 0,
    intervalMinutes: 1440,
    difficulty: input.difficulty === undefined ? 4 : input.difficulty,
    stability: input.stability === undefined ? 3 : input.stability,
    updatedAt: "2026-07-17T04:00:00.000Z",
  };
}

function baseData(): VocabularyData {
  const data = createEmptyVocabularyData("2026-07-01T00:00:00.000Z");
  data.settingsByPerson = [{
    personId: DEFAULT_PERSON_ID,
    sessionLimit: 20,
    recognitionSessionLimit: 20,
    activeSessionLimit: 8,
    timezone: "Australia/Melbourne",
    updatedAt: "2026-07-01T00:00:00.000Z",
  }];
  return data;
}

function plan(input: Pick<DailyStudyPlanRecord, "localDate" | "dayStartsAt" | "dayEndsAt"> &
  Partial<DailyStudyPlanRecord>): DailyStudyPlanRecord {
  return {
    id: `plan-${input.localDate}`,
    personId: DEFAULT_PERSON_ID,
    reviewProfile: "recognition",
    timezone: "Australia/Melbourne",
    suggestedReview: 20,
    reviewGoal: 20,
    newWordGoal: 10,
    planVersion: 1,
    recommendationVersion: "daily-study-v1",
    calculatedAt: input.dayStartsAt,
    updatedAt: input.dayStartsAt,
    ...input,
  };
}

describe("V2.3 Dashboard insights", () => {
  it("counts distinct successfully learned and reviewed words without counting repeated attempts", () => {
    const data = baseData();
    data.items = [item("take-into-account"), item("active-word", "active")];
    data.reviewEvents = [
      event({
        id: "event-forgot",
        vocabularyItemId: "take-into-account",
        reviewedAt: "2026-07-17T00:00:00.000Z",
        rating: "forgot",
      }),
      event({
        id: "event-pass",
        vocabularyItemId: "take-into-account",
        reviewedAt: "2026-07-17T00:05:00.000Z",
        rating: "vague",
      }),
      event({
        id: "event-pass-two",
        vocabularyItemId: "take-into-account",
        reviewedAt: "2026-07-17T00:10:00.000Z",
        rating: "remembered",
      }),
      event({
        id: "event-pass-two",
        vocabularyItemId: "take-into-account",
        reviewedAt: "2026-07-17T00:10:00.000Z",
        rating: "remembered",
      }),
      event({
        id: "active-event",
        vocabularyItemId: "active-word",
        reviewedAt: "2026-07-17T00:00:00.000Z",
        rating: "remembered",
        reviewProfile: "active",
      }),
      event({
        id: "other-person-event",
        vocabularyItemId: "take-into-account",
        reviewedAt: "2026-07-17T00:00:00.000Z",
        rating: "remembered",
        personId: "person-other",
      }),
      event({
        id: "only-forgot", vocabularyItemId: "unfinished",
        reviewedAt: "2026-07-17T01:00:00.000Z", rating: "forgot",
      }),
      event({
        id: "only-hard", vocabularyItemId: "unfinished",
        reviewedAt: "2026-07-17T01:01:00.000Z", rating: "hard",
      }),
      event({
        id: "old-forgot", vocabularyItemId: "old-word",
        reviewedAt: "2026-07-17T01:00:00.000Z", rating: "forgot",
      }),
      event({
        id: "old-pass", vocabularyItemId: "old-word",
        reviewedAt: "2026-07-17T01:01:00.000Z", rating: "remembered",
      }),
      event({
        id: "old-pass-again", vocabularyItemId: "old-word",
        reviewedAt: "2026-07-17T01:02:00.000Z", rating: "vague",
      }),
    ];
    data.reviewStates = [state({
      id: "old-state", vocabularyItemId: "old-word", dueAt: NOW,
    })];

    const result = buildDashboardInsights(data, NOW);
    const recognition = result.tracks.recognition.rhythm;
    const active = result.tracks.active.rhythm;

    expect(recognition).toHaveLength(14);
    expect(recognition.at(-1)?.localDate).toBe("2026-07-18");
    expect(recognition.at(-2)).toEqual({
      localDate: "2026-07-17",
      learned: 1,
      reviewed: 1,
    });
    expect(active.at(-2)).toMatchObject({ learned: 1, reviewed: 0 });
  });

  it("uses earlier retained events or firstRatedAt and treats unknown legacy history as reviewed", () => {
    const data = baseData();
    data.reviewStates = [
      state({ id: "state-only", vocabularyItemId: "state-only", dueAt: NOW }),
      state({ id: "legacy", vocabularyItemId: "legacy", dueAt: NOW, historyOrigin: "legacy_unknown" }),
      { ...state({ id: "boundary", vocabularyItemId: "boundary", dueAt: NOW }), firstRatedAt: "2026-07-16T20:00:00.000Z" },
    ];
    data.reviewEvents = [
      event({ id: "outside-chart", vocabularyItemId: "event-only", reviewedAt: "2026-06-01T00:00:00.000Z", rating: "forgot" }),
      ...["event-only", "state-only", "legacy", "boundary"].map((id) =>
        event({ id: `pass-${id}`, vocabularyItemId: id, reviewedAt: "2026-07-17T00:00:00.000Z", rating: "remembered" })),
    ];

    expect(buildDashboardInsights(data, NOW).tracks.recognition.rhythm.at(-2)).toEqual({
      localDate: "2026-07-17", learned: 1, reviewed: 3,
    });
  });

  it("keeps midnight attempts in one learning day and starts the next day exactly at 06:00", () => {
    const data = baseData();
    data.reviewEvents = [
      event({ id: "late", vocabularyItemId: "night-word", reviewedAt: "2026-07-17T13:59:00.000Z", rating: "remembered" }),
      event({ id: "midnight", vocabularyItemId: "night-word", reviewedAt: "2026-07-17T14:01:00.000Z", rating: "remembered" }),
      event({ id: "before-six", vocabularyItemId: "before-six-word", reviewedAt: "2026-07-17T19:59:59.999Z", rating: "vague" }),
      event({ id: "at-six-review", vocabularyItemId: "night-word", reviewedAt: "2026-07-17T20:00:00.000Z", rating: "remembered" }),
      event({ id: "at-six-new", vocabularyItemId: "morning-word", reviewedAt: "2026-07-17T20:00:00.000Z", rating: "remembered" }),
    ];

    const before = buildDashboardInsights(data, "2026-07-17T19:59:59.999Z").tracks.recognition.rhythm;
    expect(before.at(-1)).toEqual({ localDate: "2026-07-17", learned: 2, reviewed: 0 });
    const after = buildDashboardInsights(data, "2026-07-17T20:00:00.000Z").tracks.recognition.rhythm;
    expect(after.slice(-2)).toEqual([
      { localDate: "2026-07-17", learned: 2, reviewed: 0 },
      { localDate: "2026-07-18", learned: 1, reviewed: 1 },
    ]);
  });

  it("isolates each learner and profile when deciding whether a word has previous history", () => {
    const data = baseData();
    data.items = [item("shared", "active"), item("other-history")];
    data.reviewStates = [
      {
        ...state({ id: "other-legacy", vocabularyItemId: "other-history", dueAt: NOW, historyOrigin: "legacy_unknown" }),
        personId: "person-other",
      },
      state({ id: "other-profile-legacy", vocabularyItemId: "other-history", dueAt: NOW, reviewProfile: "active", historyOrigin: "legacy_unknown" }),
    ];
    data.reviewEvents = [
      event({ id: "past-recognition", vocabularyItemId: "shared", reviewedAt: "2026-07-01T00:00:00.000Z", rating: "forgot" }),
      event({ id: "past-other-person", vocabularyItemId: "other-history", reviewedAt: "2026-07-01T00:00:00.000Z", rating: "remembered", personId: "person-other" }),
      event({ id: "current-recognition", vocabularyItemId: "shared", reviewedAt: NOW, rating: "remembered" }),
      event({ id: "current-active", vocabularyItemId: "shared", reviewedAt: NOW, rating: "remembered", reviewProfile: "active" }),
      event({ id: "current-no-history", vocabularyItemId: "other-history", reviewedAt: NOW, rating: "remembered" }),
      event({ id: "current-other-person", vocabularyItemId: "other-only", reviewedAt: NOW, rating: "remembered", personId: "person-other" }),
    ];

    const result = buildDashboardInsights(data, NOW);
    expect(result.tracks.recognition.rhythm.at(-1)).toEqual({ localDate: "2026-07-18", learned: 1, reviewed: 1 });
    expect(result.tracks.active.rhythm.at(-1)).toEqual({ localDate: "2026-07-18", learned: 1, reviewed: 0 });
  });

  it("preserves attribution to a retained midnight plan instead of relabelling its early morning history", () => {
    const data = baseData();
    data.dailyStudyPlans = [plan({
      localDate: "2026-07-18",
      dayStartsAt: "2026-07-17T14:00:00.000Z",
      dayEndsAt: "2026-07-18T14:00:00.000Z",
    })];
    data.reviewEvents = [
      event({ id: "before-midnight", vocabularyItemId: "old-word", reviewedAt: "2026-07-17T13:30:00.000Z", rating: "forgot" }),
      event({ id: "after-midnight-review", vocabularyItemId: "old-word", reviewedAt: "2026-07-17T14:30:00.000Z", rating: "remembered" }),
      event({ id: "after-midnight-new", vocabularyItemId: "new-word", reviewedAt: "2026-07-17T14:30:00.000Z", rating: "remembered" }),
    ];
    data.items = [item("before-legacy-end"), item("at-legacy-end")];
    data.reviewStates = [
      state({ id: "before-end", vocabularyItemId: "before-legacy-end", dueAt: "2026-07-18T13:59:59.999Z" }),
      state({ id: "at-end", vocabularyItemId: "at-legacy-end", dueAt: "2026-07-18T14:00:00.000Z" }),
    ];
    const before = structuredClone(data);
    const result = buildDashboardInsights(data, "2026-07-17T15:00:00.000Z");

    expect(result.tracks.recognition.rhythm.slice(-2)).toEqual([
      { localDate: "2026-07-17", learned: 0, reviewed: 0 },
      { localDate: "2026-07-18", learned: 1, reviewed: 1 },
    ]);
    expect(result.tracks.recognition.reviewLoad.slice(0, 2)).toEqual([
      { key: "ready", label: "Today", count: 1 },
      { key: "tomorrow", label: "Tomorrow", count: 1 },
    ]);
    expect(data).toEqual(before);
  });

  it("uses a retained transition plan date for a 30-hour day crossing the old midnight boundary", () => {
    const data = baseData();
    data.dailyStudyPlans = [plan({
      localDate: "2026-07-19",
      dayStartsAt: "2026-07-18T14:00:00.000Z",
      dayEndsAt: "2026-07-19T20:00:00.000Z",
    })];
    data.reviewEvents = [event({
      id: "transition-event", vocabularyItemId: "transition-word",
      reviewedAt: "2026-07-18T14:30:00.000Z", rating: "remembered",
    })];
    data.items = [item("transition-due"), item("next-day-due")];
    data.reviewStates = [
      state({ id: "transition-due", vocabularyItemId: "transition-due", dueAt: "2026-07-19T19:59:59.999Z" }),
      state({ id: "next-day-due", vocabularyItemId: "next-day-due", dueAt: "2026-07-19T20:00:00.000Z" }),
    ];

    const result = buildDashboardInsights(data, "2026-07-18T15:00:00.000Z");
    expect(result.tracks.recognition.rhythm.at(-1)).toEqual({ localDate: "2026-07-19", learned: 1, reviewed: 0 });
    expect(result.tracks.recognition.reviewLoad.slice(0, 2)).toEqual([
      { key: "ready", label: "Today", count: 1 },
      { key: "tomorrow", label: "Tomorrow", count: 1 },
    ]);
  });

  it("excludes future and invalid events, including later successes on the current study day", () => {
    const data = baseData();
    data.reviewEvents = [
      event({ id: "at-now", vocabularyItemId: "now-word", reviewedAt: NOW, rating: "remembered" }),
      event({ id: "future-same-day", vocabularyItemId: "later-word", reviewedAt: "2026-07-18T04:00:00.001Z", rating: "remembered" }),
      event({ id: "future-next-day", vocabularyItemId: "tomorrow-word", reviewedAt: "2026-07-19T04:00:00.000Z", rating: "remembered" }),
      event({ id: "invalid", vocabularyItemId: "invalid-word", reviewedAt: "not-a-date", rating: "remembered" }),
    ];

    const rhythm = buildDashboardInsights(data, NOW).tracks.recognition.rhythm;
    expect(rhythm.at(-1)).toEqual({ localDate: "2026-07-18", learned: 1, reviewed: 0 });
    expect(rhythm.reduce((total, day) => total + day.learned + day.reviewed, 0)).toBe(1);
  });

  it("places current Track states into study-day review-load buckets", () => {
    const data = baseData();
    data.items = [
      item("ready"),
      item("tomorrow"),
      item("two-days"),
      item("five-days"),
      item("later"),
      item("archived", "recognition", "archived"),
      item("active-word", "active"),
    ];
    data.reviewStates = [
      state({ id: "s-ready", vocabularyItemId: "ready", dueAt: "2026-07-18T13:59:00.000Z" }),
      state({ id: "s-tomorrow", vocabularyItemId: "tomorrow", dueAt: "2026-07-19T04:00:00.000Z" }),
      state({ id: "s-two", vocabularyItemId: "two-days", dueAt: "2026-07-20T04:00:00.000Z" }),
      state({ id: "s-five", vocabularyItemId: "five-days", dueAt: "2026-07-23T04:00:00.000Z" }),
      state({ id: "s-later", vocabularyItemId: "later", dueAt: "2026-08-01T04:00:00.000Z" }),
      state({ id: "s-archived", vocabularyItemId: "archived", dueAt: "2026-07-18T04:00:00.000Z" }),
      state({
        id: "s-active",
        vocabularyItemId: "active-word",
        reviewProfile: "active",
        dueAt: "2026-07-18T04:00:00.000Z",
      }),
    ];

    const result = buildDashboardInsights(data, NOW);

    expect(result.tracks.recognition.reviewLoad.map(({ key, count }) => [key, count]))
      .toEqual([
        ["ready", 1],
        ["tomorrow", 1],
        ["days_2_3", 1],
        ["days_4_7", 1],
        ["later", 1],
      ]);
    expect(result.tracks.active.reviewLoad[0]).toMatchObject({ key: "ready", count: 1 });
  });

  it("uses exact 06:00 review-load boundaries and labels the ready key Today", () => {
    const data = baseData();
    const dueDates = [
      "2026-07-17T20:00:00.000Z", // Overdue.
      "2026-07-18T19:59:59.999Z", // Today, just before next 06:00.
      "2026-07-18T20:00:00.000Z", // Tomorrow starts.
      "2026-07-19T19:59:59.999Z", // Tomorrow ends.
      "2026-07-19T20:00:00.000Z", // Day 2 starts.
      "2026-07-21T19:59:59.999Z", // Day 3 ends.
      "2026-07-21T20:00:00.000Z", // Day 4 starts.
      "2026-07-25T19:59:59.999Z", // Day 7 ends.
      "2026-07-25T20:00:00.000Z", // Later starts.
    ];
    data.items = dueDates.map((_dueAt, index) => item(`due-${index}`));
    data.reviewStates = dueDates.map((dueAt, index) => state({
      id: `state-${index}`, vocabularyItemId: `due-${index}`, dueAt,
    }));

    expect(buildDashboardInsights(data, NOW).tracks.recognition.reviewLoad).toEqual([
      { key: "ready", label: "Today", count: 2 },
      { key: "tomorrow", label: "Tomorrow", count: 2 },
      { key: "days_2_3", label: "2–3d", count: 2 },
      { key: "days_4_7", label: "4–7d", count: 2 },
      { key: "later", label: "Later", count: 1 },
    ]);
  });

  it("keeps FSRS estimates profile-scoped and excludes incomplete or future states", () => {
    const data = baseData();
    data.items = [
      item("recognition-high"),
      item("recognition-low"),
      item("legacy"),
      item("future"),
      item("wrong-parameter"),
      item("active-high", "active"),
      item("new-without-state"),
    ];
    data.reviewStates = [
      state({
        id: "rec-high",
        vocabularyItemId: "recognition-high",
        dueAt: "2026-07-20T04:00:00.000Z",
        lastReviewedAt: NOW,
        stability: 10,
      }),
      state({
        id: "rec-low",
        vocabularyItemId: "recognition-low",
        dueAt: "2026-07-18T04:00:00.000Z",
        lastReviewedAt: "2026-06-01T04:00:00.000Z",
        stability: 1,
      }),
      state({
        id: "legacy",
        vocabularyItemId: "legacy",
        dueAt: "2026-07-18T04:00:00.000Z",
        historyOrigin: "legacy_unknown",
        lastReviewedAt: null,
        stability: null,
        difficulty: null,
      }),
      state({
        id: "future",
        vocabularyItemId: "future",
        dueAt: "2026-07-20T04:00:00.000Z",
        lastReviewedAt: "2026-07-19T04:00:00.000Z",
      }),
      state({
        id: "wrong-parameter",
        vocabularyItemId: "wrong-parameter",
        dueAt: "2026-07-20T04:00:00.000Z",
        parameterSetId: "active-fsrs-v1",
      }),
      state({
        id: "active-high",
        vocabularyItemId: "active-high",
        reviewProfile: "active",
        dueAt: "2026-07-20T04:00:00.000Z",
        lastReviewedAt: NOW,
        stability: 10,
      }),
    ];

    const result = buildDashboardInsights(data, NOW);
    const recognition = result.tracks.recognition;
    const active = result.tracks.active;

    expect(recognition.retrievabilityEligibleCount).toBe(2);
    expect(recognition.retrievability.find((bucket) => bucket.key === "high")?.count)
      .toBe(1);
    expect(recognition.retrievability.find((bucket) => bucket.key === "lower")?.count)
      .toBe(1);
    expect(active.retrievabilityEligibleCount).toBe(1);
    expect(active.retrievability.find((bucket) => bucket.key === "high")?.count)
      .toBe(1);
  });

  it("keeps 14 calendar dates contiguous across Melbourne daylight saving", () => {
    const result = buildDashboardInsights(baseData(), "2026-04-06T02:00:00.000Z");
    const dates = result.tracks.recognition.rhythm.map((point) => point.localDate);

    expect(dates).toHaveLength(14);
    expect(dates.slice(-3)).toEqual(["2026-04-04", "2026-04-05", "2026-04-06"]);
  });

  it("fails visibly for an unsupported learner timezone", () => {
    const data = baseData();
    data.settingsByPerson[0] = { ...data.settingsByPerson[0], timezone: "Mars/Mimi" };

    expect(() => buildDashboardInsights(data, NOW)).toThrow("Unsupported timezone");
  });
});
