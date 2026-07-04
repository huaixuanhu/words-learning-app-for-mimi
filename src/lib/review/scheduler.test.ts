import { describe, expect, it } from "vitest";
import { scheduleNextReview, selectReviewQueue } from "./scheduler";
import {
  addVocabularyItem,
  archiveVocabularyItem,
  createEmptyVocabularyData,
} from "@/lib/vocabulary/repository";

function withWord(id: string, surfaceText: string, createdAt: string) {
  return {
    id,
    surfaceText,
    source: "manual" as const,
    createdAt,
    systemCreatedAt: createdAt,
    updatedAt: createdAt,
    timezone: "Australia/Melbourne",
  };
}

describe("review scheduler", () => {
  it("maps ratings to deterministic next due times", () => {
    const reviewedAt = "2026-07-04T00:00:00.000Z";

    expect(scheduleNextReview(undefined, "forgot", reviewedAt)).toMatchObject({
      dueAt: "2026-07-04T00:10:00.000Z",
      intervalMinutes: 10,
      lapseCount: 1,
      reviewCount: 1,
      status: "learning",
    });
    expect(scheduleNextReview(undefined, "remembered", reviewedAt)).toMatchObject({
      dueAt: "2026-07-11T00:00:00.000Z",
      intervalMinutes: 10080,
      lapseCount: 0,
      reviewCount: 1,
      status: "review",
    });
  });

  it("selects due cards before new cards and obeys session limit", () => {
    const first = addVocabularyItem(
      createEmptyVocabularyData(),
      withWord("vocab-a", "alpha", "2026-07-01T00:00:00.000Z"),
      "2026-07-01T00:00:00.000Z",
    ).data;
    const second = addVocabularyItem(
      first,
      withWord("vocab-b", "beta", "2026-07-02T00:00:00.000Z"),
      "2026-07-02T00:00:00.000Z",
    ).data;
    const data = {
      ...second,
      settings: { ...second.settings, sessionLimit: 1 },
      reviewStates: [
        {
          id: "state-b",
          vocabularyItemId: "vocab-b",
          status: "review" as const,
          dueAt: "2026-07-03T00:00:00.000Z",
          lastReviewedAt: "2026-07-02T00:00:00.000Z",
          reviewCount: 1,
          lapseCount: 0,
          intervalMinutes: 1440,
          difficulty: null,
          stability: null,
          updatedAt: "2026-07-02T00:00:00.000Z",
        },
      ],
    };

    expect(selectReviewQueue(data, "2026-07-04T00:00:00.000Z").map((item) => item.id)).toEqual([
      "vocab-b",
    ]);
  });

  it("excludes archived vocabulary from the queue", () => {
    const added = addVocabularyItem(
      createEmptyVocabularyData(),
      withWord("vocab-a", "alpha", "2026-07-01T00:00:00.000Z"),
      "2026-07-01T00:00:00.000Z",
    ).data;
    const archived = archiveVocabularyItem(added, "vocab-a", "2026-07-04T00:00:00.000Z");

    expect(selectReviewQueue(archived, "2026-07-04T00:00:00.000Z")).toHaveLength(0);
  });
});
