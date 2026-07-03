import { describe, expect, it } from "vitest";
import { parseTextImport } from "./import-parser";
import {
  addVocabularyItem,
  archiveVocabularyItem,
  commitImportCandidates,
  createEmptyVocabularyData,
  getActiveVocabularyItems,
  getArchivedVocabularyItems,
  restoreVocabularyItem,
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
      createdAt: "2026-07-03T14:00:00.000Z",
      systemCreatedAt: "2026-07-04T00:01:00.000Z",
    });

    const updated = updateVocabularyItem(
      added.data,
      "vocab-1",
      {
        surfaceText: "allocated",
        rarityScore: 5,
        createdAt: "2026-07-03T15:00:00.000Z",
      },
      "2026-07-04T00:02:00.000Z",
    );

    expect(updated.item).toMatchObject({
      surfaceText: "allocated",
      normalizedText: "allocated",
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
    expect(result.data.importBatches).toHaveLength(1);
  });
});
