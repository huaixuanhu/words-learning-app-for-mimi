import { describe, expect, it } from "vitest";
import { migrateVocabularyData } from "./local-storage-repository";

describe("local storage vocabulary migration", () => {
  it("migrates schema version 1 data to version 5 without dropping vocabulary", () => {
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

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.people).toHaveLength(1);
    expect(migrated.selectedPersonId).toBe("person_mimi");
    expect(migrated.items).toHaveLength(1);
    expect(migrated.items[0]?.personId).toBe("person_mimi");
    expect(migrated.items[0]?.learningTrack).toBe("recognition");
    expect(migrated.items[0]?.tags).toBeNull();
    expect(migrated.items[0]?.meaningsZh).toEqual(["分配"]);
    expect(migrated.items[0]?.examples).toEqual([]);
    expect(migrated.importBatches).toHaveLength(1);
    expect(migrated.importBatches[0]?.personId).toBe("person_mimi");
    expect(migrated.reviewStates).toEqual([]);
    expect(migrated.reviewEvents).toEqual([]);
    expect(migrated.settingsByPerson[0]).toMatchObject({
      personId: "person_mimi",
      sessionLimit: 24,
      recognitionSessionLimit: 24,
      activeSessionLimit: 8,
    });
  });

  it("migrates schema version 4 meaning and example strings into version 5 arrays", () => {
    const migrated = migrateVocabularyData(
      {
        schemaVersion: 4,
        people: [
          {
            id: "person_mimi",
            displayName: "Mimi",
            slug: "mimi",
            isActive: true,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        selectedPersonId: "person_mimi",
        items: [
          {
            id: "vocab-1",
            personId: "person_mimi",
            surfaceText: "coherent",
            normalizedText: "coherent",
            meaningZh: "连贯的",
            example: "Write a coherent paragraph.",
            notes: "",
            rarityScore: null,
            learningTrack: "active",
            tags: null,
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
        importBatches: [],
        reviewStates: [],
        reviewEvents: [],
        settingsByPerson: [],
        updatedAt: "2026-07-04T00:00:00.000Z",
      },
      "2026-07-04T01:00:00.000Z",
    );

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.items[0]?.meaningsZh).toEqual(["连贯的"]);
    expect(migrated.items[0]?.examples).toEqual(["Write a coherent paragraph."]);
  });

  it("keeps schema version 5 after Stage 8 review algorithm fields", () => {
    const migrated = migrateVocabularyData(
      {
        schemaVersion: 5,
        people: [
          {
            id: "person_mimi",
            displayName: "Mimi",
            slug: "mimi",
            isActive: true,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        selectedPersonId: "person_mimi",
        items: [
          {
            id: "vocab-1",
            personId: "person_mimi",
            surfaceText: "coherent",
            normalizedText: "coherent",
            meaningZh: "连贯的",
            meaningsZh: ["连贯的"],
            example: "Write a coherent paragraph.",
            examples: ["Write a coherent paragraph."],
            notes: "",
            rarityScore: null,
            learningTrack: "recognition",
            tags: null,
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
        importBatches: [],
        reviewStates: [
          {
            id: "review-state-1",
            personId: "person_mimi",
            vocabularyItemId: "vocab-1",
            status: "review",
            dueAt: "2026-07-07T00:00:00.000Z",
            lastReviewedAt: "2026-07-04T00:00:00.000Z",
            reviewCount: 1,
            lapseCount: 0,
            intervalMinutes: 4320,
            difficulty: 2.11810397,
            stability: 2.3065,
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        reviewEvents: [],
        settingsByPerson: [],
        updatedAt: "2026-07-04T00:00:00.000Z",
      },
      "2026-07-04T01:00:00.000Z",
    );

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.reviewStates[0]).toMatchObject({
      difficulty: 2.11810397,
      stability: 2.3065,
    });
  });

  it("returns an empty version 5 shape for invalid data", () => {
    const migrated = migrateVocabularyData("not-json", "2026-07-04T01:00:00.000Z");

    expect(migrated).toMatchObject({
      schemaVersion: 5,
      selectedPersonId: "person_mimi",
      items: [],
      importBatches: [],
      reviewStates: [],
      reviewEvents: [],
    });
    expect(migrated.people).toHaveLength(1);
  });
});
