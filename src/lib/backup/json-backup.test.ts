import { describe, expect, it } from "vitest";
import { addVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import {
  createVocabularyBackup,
  parseVocabularyBackupText,
  serializeVocabularyBackup,
  summarizeVocabularyData,
} from "./json-backup";

function createSampleData() {
  const added = addVocabularyItem(
    createEmptyVocabularyData("2026-07-05T00:00:00.000Z"),
    {
      id: "vocab-1",
      surfaceText: "allocate",
      meaningZh: "分配",
      example: "Allocate time wisely.",
      notes: "PTE writing",
      rarityScore: 3,
      source: "manual",
      timezone: "Australia/Melbourne",
    },
    "2026-07-05T00:01:00.000Z",
  );

  return {
    ...added.data,
    importBatches: [
      {
        id: "batch-1",
        sourceType: "pasted_text" as const,
        fileName: null,
        createdAt: "2026-07-05T00:02:00.000Z",
        totalRows: 1,
        acceptedRows: 1,
        duplicateRows: 0,
        invalidRows: 0,
      },
    ],
    reviewStates: [
      {
        id: "review-state-1",
        vocabularyItemId: "vocab-1",
        status: "review" as const,
        dueAt: "2026-07-06T00:00:00.000Z",
        lastReviewedAt: "2026-07-05T00:10:00.000Z",
        reviewCount: 1,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: null,
        stability: null,
        updatedAt: "2026-07-05T00:10:00.000Z",
      },
    ],
    reviewEvents: [
      {
        id: "review-event-1",
        vocabularyItemId: "vocab-1",
        reviewedAt: "2026-07-05T00:10:00.000Z",
        rating: "hard" as const,
        previousDueAt: null,
        nextDueAt: "2026-07-06T00:00:00.000Z",
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 3500,
      },
    ],
    settings: {
      sessionLimit: 12,
      timezone: "Australia/Melbourne",
      updatedAt: "2026-07-05T00:03:00.000Z",
    },
    updatedAt: "2026-07-05T00:10:00.000Z",
  };
}

describe("JSON vocabulary backup", () => {
  it("creates backup metadata and counts", () => {
    const data = createSampleData();
    const backup = createVocabularyBackup(data, {
      exportedAt: "2026-07-05T00:20:00.000Z",
      timezone: "Australia/Melbourne",
    });

    expect(backup.metadata).toMatchObject({
      appName: "words-learning-app-for-mimi",
      exportedAt: "2026-07-05T00:20:00.000Z",
      timezone: "Australia/Melbourne",
      schemaVersion: 2,
    });
    expect(backup.metadata.counts).toEqual({
      items: 1,
      activeItems: 1,
      archivedItems: 0,
      importBatches: 1,
      reviewStates: 1,
      reviewEvents: 1,
    });
  });

  it("round-trips vocabulary, review history, settings, and schema version", () => {
    const data = createSampleData();
    const serialized = serializeVocabularyBackup(data, {
      exportedAt: "2026-07-05T00:20:00.000Z",
      timezone: "Australia/Melbourne",
    });
    const parsed = parseVocabularyBackupText(serialized, "2026-07-05T00:21:00.000Z");

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.schemaVersion).toBe(2);
    expect(parsed.data.items[0]?.id).toBe("vocab-1");
    expect(parsed.data.importBatches).toHaveLength(1);
    expect(parsed.data.reviewStates).toHaveLength(1);
    expect(parsed.data.reviewEvents).toHaveLength(1);
    expect(parsed.data.settings.sessionLimit).toBe(12);
    expect(parsed.counts).toEqual(summarizeVocabularyData(data));
  });

  it("rejects malformed JSON and unsupported backup shapes", () => {
    expect(parseVocabularyBackupText("{bad json").ok).toBe(false);

    const parsed = parseVocabularyBackupText(
      JSON.stringify({
        format: "wrong-format",
        backupVersion: 1,
        metadata: {},
        data: {
          schemaVersion: 2,
          items: [{ id: "broken" }],
          importBatches: [],
          reviewStates: [],
          reviewEvents: [],
          settings: {},
          updatedAt: "2026-07-05T00:00:00.000Z",
        },
      }),
    );

    expect(parsed.ok).toBe(false);

    if (parsed.ok) {
      return;
    }

    expect(parsed.errors.join("\n")).toContain("format must be");
    expect(parsed.errors.join("\n")).toContain("items[0].surfaceText must be a string");
    expect(parsed.errors.join("\n")).toContain("data.settings.sessionLimit must be a number");
  });

  it("rejects review records that reference missing vocabulary items", () => {
    const data = createSampleData();
    const backup = createVocabularyBackup(
      {
        ...data,
        reviewEvents: [
          {
            ...data.reviewEvents[0],
            vocabularyItemId: "missing-vocab",
          },
        ],
      },
      {
        exportedAt: "2026-07-05T00:20:00.000Z",
        timezone: "Australia/Melbourne",
      },
    );
    const parsed = parseVocabularyBackupText(JSON.stringify(backup));

    expect(parsed.ok).toBe(false);

    if (parsed.ok) {
      return;
    }

    expect(parsed.errors).toContain("reviewEvents[0].vocabularyItemId does not match an item");
  });
});
