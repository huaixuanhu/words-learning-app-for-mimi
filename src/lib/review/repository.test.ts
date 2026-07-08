import { describe, expect, it } from "vitest";
import { getReviewQueue, recordReview, resetTodayReviewTask, rollbackReviewEvent } from "./repository";
import {
  addPerson,
  addVocabularyItem,
  archiveVocabularyItem,
  createEmptyVocabularyData,
  selectPerson,
} from "@/lib/vocabulary/repository";

function addReviewableWord() {
  return addVocabularyItem(
    createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
    {
      id: "vocab-1",
      surfaceText: "coherent",
      meaningZh: "连贯的",
      source: "manual",
      timezone: "Australia/Melbourne",
      createdAt: "2026-07-04T00:00:00.000Z",
      systemCreatedAt: "2026-07-04T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z",
    },
    "2026-07-04T00:00:00.000Z",
  ).data;
}

function addActiveWord() {
  return addVocabularyItem(
    createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
    {
      id: "vocab-active",
      surfaceText: "articulate",
      meaningZh: "清楚表达",
      source: "manual",
      learningTrack: "active",
      timezone: "Australia/Melbourne",
      createdAt: "2026-07-04T00:00:00.000Z",
      systemCreatedAt: "2026-07-04T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z",
    },
    "2026-07-04T00:00:00.000Z",
  ).data;
}

describe("review repository", () => {
  it("records a first review event and state", () => {
    const data = addReviewableWord();
    const result = recordReview(
      data,
      { vocabularyItemId: "vocab-1", rating: "vague", elapsedMs: 12_345 },
      "2026-07-04T01:00:00.000Z",
    );

    expect(result.event).toMatchObject({
      personId: "person_mimi",
      vocabularyItemId: "vocab-1",
      rating: "vague",
      previousDueAt: null,
      nextDueAt: "2026-07-07T01:00:00.000Z",
      previousIntervalMinutes: null,
      nextIntervalMinutes: 4320,
      elapsedMs: 12345,
    });
    expect(result.state).toMatchObject({
      personId: "person_mimi",
      vocabularyItemId: "vocab-1",
      status: "review",
      dueAt: "2026-07-07T01:00:00.000Z",
      reviewCount: 1,
      lapseCount: 0,
      intervalMinutes: 4320,
    });
    expect(result.state.difficulty).toBeCloseTo(2.11810397, 6);
    expect(result.state.stability).toBeCloseTo(2.3065, 6);
    expect(result.data.reviewEvents).toHaveLength(1);
    expect(result.data.reviewStates).toHaveLength(1);
  });

  it("updates the existing review state on later reviews", () => {
    const first = recordReview(
      addReviewableWord(),
      { vocabularyItemId: "vocab-1", rating: "forgot" },
      "2026-07-04T01:00:00.000Z",
    );
    const second = recordReview(
      first.data,
      { vocabularyItemId: "vocab-1", rating: "remembered" },
      "2026-07-04T01:10:00.000Z",
    );

    expect(second.data.reviewStates).toHaveLength(1);
    expect(second.state).toMatchObject({
      reviewCount: 2,
      lapseCount: 0,
      intervalMinutes: 5760,
      dueAt: "2026-07-08T01:10:00.000Z",
    });
    expect(second.state.difficulty).toBeCloseTo(5.20002037, 6);
    expect(second.state.stability).toBeCloseTo(0.212, 6);
    expect(second.data.reviewEvents).toHaveLength(2);
  });

  it("does not review archived vocabulary", () => {
    const archived = archiveVocabularyItem(
      addReviewableWord(),
      "vocab-1",
      "2026-07-04T00:30:00.000Z",
    );

    expect(() =>
      recordReview(
        archived,
        { vocabularyItemId: "vocab-1", rating: "hard" },
        "2026-07-04T01:00:00.000Z",
      ),
    ).toThrow("Reviewable vocabulary item not found");
    expect(getReviewQueue(archived, "2026-07-04T01:00:00.000Z")).toHaveLength(0);
  });

  it("does not schedule or record Active vocabulary in V1 review state", () => {
    const data = addActiveWord();

    expect(getReviewQueue(data, "2026-07-04T01:00:00.000Z")).toHaveLength(0);
    expect(() =>
      recordReview(
        data,
        { vocabularyItemId: "vocab-active", rating: "remembered" },
        "2026-07-04T01:00:00.000Z",
      ),
    ).toThrow("Reviewable vocabulary item not found");
    expect(data.reviewEvents).toHaveLength(0);
    expect(data.reviewStates).toHaveLength(0);
  });

  it("records reviews only for the selected person's vocabulary", () => {
    const mimiData = addReviewableWord();
    const friendData = addPerson(
      mimiData,
      { id: "person-friend", displayName: "Friend" },
      "2026-07-04T00:10:00.000Z",
    ).data;
    const friendWord = addVocabularyItem(
      friendData,
      {
        id: "vocab-friend",
        surfaceText: "friend",
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-04T00:11:00.000Z",
    ).data;

    expect(() =>
      recordReview(friendWord, { vocabularyItemId: "vocab-1", rating: "hard" }),
    ).toThrow("Reviewable vocabulary item not found");

    const reviewed = recordReview(
      selectPerson(friendWord, "person_mimi"),
      { vocabularyItemId: "vocab-1", rating: "hard" },
      "2026-07-04T01:00:00.000Z",
    );

    expect(reviewed.event.personId).toBe("person_mimi");
  });

  it("resets only today's review events and rebuilds state from earlier history", () => {
    const first = recordReview(
      addReviewableWord(),
      { vocabularyItemId: "vocab-1", rating: "vague" },
      "2026-07-04T01:00:00.000Z",
    );
    const second = recordReview(
      first.data,
      { vocabularyItemId: "vocab-1", rating: "forgot" },
      "2026-07-05T01:00:00.000Z",
    );

    const reset = resetTodayReviewTask(second.data, "2026-07-05T02:00:00.000Z");

    expect(reset.resetEventsCount).toBe(1);
    expect(reset.resetItemsCount).toBe(1);
    expect(reset.data.reviewEvents).toHaveLength(1);
    expect(reset.data.reviewEvents[0]).toMatchObject({
      vocabularyItemId: "vocab-1",
      rating: "vague",
      reviewedAt: "2026-07-04T01:00:00.000Z",
    });
    expect(reset.data.reviewStates).toHaveLength(1);
    expect(reset.data.reviewStates[0]).toMatchObject({
      vocabularyItemId: "vocab-1",
      reviewCount: 1,
      lapseCount: 0,
      dueAt: "2026-07-07T01:00:00.000Z",
    });
  });

  it("resets a new item reviewed only today back into the review queue", () => {
    const reviewed = recordReview(
      addReviewableWord(),
      { vocabularyItemId: "vocab-1", rating: "hard" },
      "2026-07-05T01:00:00.000Z",
    );

    const reset = resetTodayReviewTask(reviewed.data, "2026-07-05T02:00:00.000Z");

    expect(reset.data.reviewEvents).toHaveLength(0);
    expect(reset.data.reviewStates).toHaveLength(0);
    expect(getReviewQueue(reset.data, "2026-07-05T02:00:00.000Z").map((item) => item.id)).toEqual([
      "vocab-1",
    ]);
  });

  it("rolls back the only review event and removes the review state", () => {
    const reviewed = recordReview(
      addReviewableWord(),
      { vocabularyItemId: "vocab-1", rating: "hard" },
      "2026-07-05T01:00:00.000Z",
    );

    const rolledBack = rollbackReviewEvent(
      reviewed.data,
      reviewed.event.id,
      "2026-07-05T01:05:00.000Z",
    );

    expect(rolledBack.event.rating).toBe("hard");
    expect(rolledBack.state).toBeNull();
    expect(rolledBack.data.reviewEvents).toHaveLength(0);
    expect(rolledBack.data.reviewStates).toHaveLength(0);
    expect(getReviewQueue(rolledBack.data, "2026-07-05T01:05:00.000Z").map((item) => item.id)).toEqual([
      "vocab-1",
    ]);
  });

  it("rolls back a later review event and rebuilds state from earlier history", () => {
    const first = recordReview(
      addReviewableWord(),
      { vocabularyItemId: "vocab-1", rating: "vague" },
      "2026-07-04T01:00:00.000Z",
    );
    const second = recordReview(
      first.data,
      { vocabularyItemId: "vocab-1", rating: "forgot" },
      "2026-07-05T01:00:00.000Z",
    );

    const rolledBack = rollbackReviewEvent(
      second.data,
      second.event.id,
      "2026-07-05T01:05:00.000Z",
    );

    expect(rolledBack.data.reviewEvents).toHaveLength(1);
    expect(rolledBack.data.reviewEvents[0]).toMatchObject({
      id: first.event.id,
      rating: "vague",
    });
    expect(rolledBack.state).toMatchObject({
      vocabularyItemId: "vocab-1",
      reviewCount: 1,
      lapseCount: 0,
      intervalMinutes: 4320,
      dueAt: "2026-07-07T01:00:00.000Z",
    });
    expect(rolledBack.data.reviewStates).toHaveLength(1);
  });
});
