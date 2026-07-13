import { describe, expect, it } from "vitest";
import { recordReview } from "@/lib/review/repository";
import { parseJsonImport, parseTextImport } from "./import-parser";
import {
  addVocabularyItem,
  archiveVocabularyItem,
  commitImportCandidates,
  createEmptyVocabularyData,
  deleteVocabularyItem,
  getActiveVocabularyItems,
  getArchivedVocabularyItems,
  restoreVocabularyItem,
  rollbackImportBatch,
  updateVocabularyItem,
} from "./repository";

describe("vocabulary repository", () => {
  it("adds and updates vocabulary while preserving system-created time", () => {
    const empty = createEmptyVocabularyData("2026-07-04T00:00:00.000Z");
    const added = addVocabularyItem(
      empty,
      {
        id: "vocab-1",
        surfaceText: " Allocate ",
        meaningZh: "分配",
        example: "Allocate time wisely.",
        notes: "",
        rarityScore: 3,
        source: "manual",
        createdAt: "2026-07-03T14:00:00.000Z",
        systemCreatedAt: "2026-07-04T00:01:00.000Z",
        timezone: "Australia/Melbourne",
      },
      "2026-07-04T00:01:00.000Z",
    );

    expect(added.item).toMatchObject({
      surfaceText: "Allocate",
      normalizedText: "allocate",
      meaningsZh: ["分配"],
      examples: ["Allocate time wisely."],
      createdAt: "2026-07-03T14:00:00.000Z",
      systemCreatedAt: "2026-07-04T00:01:00.000Z",
    });
    expect(added.data.vocabularyCreationFacts[0]).toMatchObject({
      originalVocabularyItemId: "vocab-1",
      sourceActionId: "vocab-1",
      trackAtCreation: "recognition",
      sourceKind: "single",
      historyOrigin: "recorded",
    });

    const updated = updateVocabularyItem(
      added.data,
      "vocab-1",
      {
        surfaceText: "allocated",
        meaningsZh: ["分配", "划拨"],
        examples: ["Allocate time wisely.", "Allocate budget carefully."],
        rarityScore: 5,
        createdAt: "2026-07-03T15:00:00.000Z",
      },
      "2026-07-04T00:02:00.000Z",
    );

    expect(updated.item).toMatchObject({
      surfaceText: "allocated",
      normalizedText: "allocated",
      meaningZh: "分配",
      meaningsZh: ["分配", "划拨"],
      example: "Allocate time wisely.",
      examples: ["Allocate time wisely.", "Allocate budget carefully."],
      rarityScore: 5,
      createdAt: "2026-07-03T15:00:00.000Z",
      systemCreatedAt: "2026-07-04T00:01:00.000Z",
      updatedAt: "2026-07-04T00:02:00.000Z",
    });
  });

  it("archives and restores without hard-deleting the item", () => {
    const added = addVocabularyItem(
      createEmptyVocabularyData(),
      {
        id: "vocab-1",
        surfaceText: "coherent",
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-04T00:00:00.000Z",
    );

    const archived = archiveVocabularyItem(added.data, "vocab-1", "2026-07-04T00:03:00.000Z");
    expect(getActiveVocabularyItems(archived)).toHaveLength(0);
    expect(getArchivedVocabularyItems(archived)).toHaveLength(1);
    expect(archived.items).toHaveLength(1);

    const restored = restoreVocabularyItem(archived, "vocab-1", "2026-07-04T00:04:00.000Z");
    expect(getActiveVocabularyItems(restored)).toHaveLength(1);
    expect(getArchivedVocabularyItems(restored)).toHaveLength(0);
  });

  it("commits accepted import candidates and records batch counts", () => {
    const candidates = parseTextImport("coherent - 连贯的\n\nallocate", {
      existingNormalizedTexts: ["allocate"],
    });
    const result = commitImportCandidates(
      createEmptyVocabularyData(),
      { id: "batch-1", sourceType: "pasted_text", fileName: null },
      candidates,
      candidates.map((candidate) => candidate.tempId),
      "Australia/Melbourne",
      "2026-07-04T00:05:00.000Z",
    );

    expect(result.batch).toMatchObject({
      id: "batch-1",
      totalRows: 3,
      acceptedRows: 2,
      duplicateRows: 1,
      invalidRows: 1,
    });
    expect(result.items.map((item) => item.surfaceText)).toEqual(["coherent", "allocate"]);
    expect(result.items[0]?.meaningsZh).toEqual(["连贯的"]);
    expect(result.data.importBatches).toHaveLength(1);
  });

  it("hard-deletes a vocabulary item and its review history", () => {
    const added = addVocabularyItem(
      createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
      {
        id: "vocab-1",
        surfaceText: "allocate",
        learningTrack: "recognition",
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-04T00:01:00.000Z",
    );
    const reviewed = recordReview(
      added.data,
      { vocabularyItemId: "vocab-1", rating: "forgot" },
      "2026-07-04T00:02:00.000Z",
    );

    const deleted = deleteVocabularyItem(reviewed.data, "vocab-1", "2026-07-04T00:03:00.000Z");

    expect(deleted.item.surfaceText).toBe("allocate");
    expect(deleted.data.items).toHaveLength(0);
    expect(deleted.data.reviewStates).toHaveLength(0);
    expect(deleted.data.reviewEvents).toHaveLength(0);
    expect(deleted.data.vocabularyCreationFacts).toHaveLength(1);
  });

  it("rolls back a JSON import batch and removes related review data", () => {
    const candidates = parseJsonImport(
      JSON.stringify({
        items: [
          {
            word: "allocate",
            meaningsZh: ["分配"],
            examples: ["The tutor allocated extra time."],
            track: "recognition",
          },
          {
            word: "coherent",
            meaningsZh: ["连贯的"],
            examples: ["Write a coherent paragraph."],
            track: "active",
          },
        ],
      }),
    );
    const committed = commitImportCandidates(
      createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
      { id: "batch-json-1", sourceType: "json_paste", fileName: null },
      candidates,
      candidates.map((candidate) => candidate.tempId),
      "Australia/Melbourne",
      "2026-07-04T00:01:00.000Z",
    );
    const reviewed = recordReview(
      committed.data,
      { vocabularyItemId: committed.items[0]?.id ?? "", rating: "hard" },
      "2026-07-04T00:02:00.000Z",
    );

    const rolledBack = rollbackImportBatch(
      reviewed.data,
      "batch-json-1",
      "2026-07-04T00:03:00.000Z",
    );

    expect(rolledBack.batch.sourceType).toBe("json_paste");
    expect(rolledBack.deletedItemsCount).toBe(2);
    expect(rolledBack.deletedReviewEventsCount).toBe(1);
    expect(rolledBack.data.items).toHaveLength(0);
    expect(rolledBack.data.importBatches).toHaveLength(0);
    expect(rolledBack.data.reviewStates).toHaveLength(0);
    expect(rolledBack.data.reviewEvents).toHaveLength(0);
    expect(rolledBack.data.vocabularyCreationFacts).toHaveLength(2);
    expect(rolledBack.data.vocabularyCreationReversals).toEqual([
      expect.objectContaining({
        sourceActionId: "batch-json-1",
        reason: "batch_rollback",
      }),
    ]);
  });

  it("blocks a direct Track change after review history exists", () => {
    const added = addVocabularyItem(
      createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
      {
        id: "vocab-history",
        surfaceText: "allocate",
        learningTrack: "recognition",
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-04T00:01:00.000Z",
    );
    const reviewed = recordReview(
      added.data,
      { vocabularyItemId: "vocab-history", rating: "remembered" },
      "2026-07-04T00:02:00.000Z",
    );

    expect(() =>
      updateVocabularyItem(
        reviewed.data,
        "vocab-history",
        { learningTrack: "active" },
        "2026-07-04T00:03:00.000Z",
      ),
    ).toThrow("Start it fresh in the other Track");
  });

  it("removes an empty import batch without inventing a reversal fact", () => {
    const committed = commitImportCandidates(
      createEmptyVocabularyData("2026-07-04T00:00:00.000Z"),
      { id: "empty-batch", sourceType: "pasted_text", fileName: null },
      [],
      [],
      "Australia/Melbourne",
      "2026-07-04T00:01:00.000Z",
    );

    const rolledBack = rollbackImportBatch(
      committed.data,
      "empty-batch",
      "2026-07-04T00:02:00.000Z",
    );

    expect(rolledBack.deletedItemsCount).toBe(0);
    expect(rolledBack.data.vocabularyCreationFacts).toHaveLength(0);
    expect(rolledBack.data.vocabularyCreationReversals).toHaveLength(0);
  });
});
