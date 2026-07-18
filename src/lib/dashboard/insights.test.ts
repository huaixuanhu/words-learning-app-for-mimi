import { describe, expect, it } from "vitest";
import { DEFAULT_PERSON_ID } from "@/lib/people/repository";
import type { ReviewEvent, ReviewProfile, ReviewRating, ReviewState } from "@/lib/review/types";
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

describe("V2-8-1 Dashboard insights", () => {
  it("counts distinct passed entries and every attempt in 14 local-day buckets", () => {
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
    ];

    const result = buildDashboardInsights(data, NOW);
    const recognition = result.tracks.recognition.rhythm;
    const active = result.tracks.active.rhythm;

    expect(recognition).toHaveLength(14);
    expect(recognition.at(-1)?.localDate).toBe("2026-07-18");
    expect(recognition.at(-2)).toEqual({
      localDate: "2026-07-17",
      entries: 1,
      attempts: 3,
    });
    expect(active.at(-2)).toMatchObject({ entries: 1, attempts: 1 });
  });

  it("places current Track states into calm local-calendar review-load buckets", () => {
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
