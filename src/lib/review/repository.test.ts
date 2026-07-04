import { describe, expect, it } from "vitest";
import { getReviewQueue, recordReview } from "./repository";
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
      lapseCount: 1,
      intervalMinutes: 10080,
      dueAt: "2026-07-11T01:10:00.000Z",
    });
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
});
