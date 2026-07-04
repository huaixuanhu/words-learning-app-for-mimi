import { describe, expect, it } from "vitest";
import { migrateVocabularyData } from "./local-storage-repository";

describe("local storage vocabulary migration", () => {
  it("migrates schema version 1 data to version 3 without dropping vocabulary", () => {
    const migrated = migrateVocabularyData(
      {
        schemaVersion: 1,
        items: [
          {
            id: "vocab-1",
            surfaceText: "allocate",
            normalizedText: "allocate",
            meaningZh: "分配",
            example: "",
            notes: "",
            rarityScore: null,
            source: "manual",
            importBatchId: null,
            status: "new",
            createdAt: "2026-07-04T00:00:00.000Z",
            systemCreatedAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
            timezone: "Australia/Melbourne",
            archivedAt: null,
          },
        ],
        importBatches: [
          {
            id: "batch-1",
            sourceType: "pasted_text",
            fileName: null,
            createdAt: "2026-07-04T00:00:00.000Z",
            totalRows: 1,
            acceptedRows: 1,
            duplicateRows: 0,
            invalidRows: 0,
          },
        ],
        updatedAt: "2026-07-04T00:00:00.000Z",
      },
      "2026-07-04T01:00:00.000Z",
    );

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.people).toHaveLength(1);
    expect(migrated.selectedPersonId).toBe("person_mimi");
    expect(migrated.items).toHaveLength(1);
    expect(migrated.items[0]?.personId).toBe("person_mimi");
    expect(migrated.importBatches).toHaveLength(1);
    expect(migrated.importBatches[0]?.personId).toBe("person_mimi");
    expect(migrated.reviewStates).toEqual([]);
    expect(migrated.reviewEvents).toEqual([]);
    expect(migrated.settingsByPerson[0]).toMatchObject({
      personId: "person_mimi",
      sessionLimit: 24,
    });
  });

  it("returns an empty version 3 shape for invalid data", () => {
    const migrated = migrateVocabularyData("not-json", "2026-07-04T01:00:00.000Z");

    expect(migrated).toMatchObject({
      schemaVersion: 3,
      selectedPersonId: "person_mimi",
      items: [],
      importBatches: [],
      reviewStates: [],
      reviewEvents: [],
    });
    expect(migrated.people).toHaveLength(1);
  });
});
