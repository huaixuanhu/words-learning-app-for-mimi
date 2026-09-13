import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LocalVocabularyReadError,
  migrateVocabularyData,
  readVocabularyData,
  restoreVocabularyData,
  VOCABULARY_STORAGE_KEY,
  writeVocabularyData,
} from "./local-storage-repository";
import { createEmptyVocabularyData } from "./repository";

describe("local storage vocabulary migration", () => {
  it("migrates schema version 1 data to version 6 without dropping vocabulary", () => {
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

    expect(migrated.schemaVersion).toBe(6);
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
    expect(migrated.dailyStudyDefaults).toHaveLength(2);
    expect(migrated.vocabularyCreationFacts[0]).toMatchObject({
      originalVocabularyItemId: "vocab-1",
      sourceActionId: "vocab-1",
      trackAtCreation: "recognition",
      historyOrigin: "legacy_backfill",
    });
  });

  it("migrates schema version 4 meaning and example strings into version 6 arrays", () => {
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

    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.items[0]?.meaningsZh).toEqual(["连贯的"]);
    expect(migrated.items[0]?.examples).toEqual(["Write a coherent paragraph."]);
  });

  it("migrates schema version 5 review fields into an explicit Recognition profile", () => {
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
        reviewEvents: [
          {
            id: "review-event-1",
            personId: "person_mimi",
            vocabularyItemId: "vocab-1",
            reviewedAt: "2026-07-03T23:00:00.000Z",
            rating: "remembered",
            previousDueAt: null,
            nextDueAt: "2026-07-07T00:00:00.000Z",
            previousIntervalMinutes: null,
            nextIntervalMinutes: 4320,
            elapsedMs: 1000,
          },
        ],
        settingsByPerson: [],
        updatedAt: "2026-07-04T00:00:00.000Z",
      },
      "2026-07-04T01:00:00.000Z",
    );

    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.reviewStates[0]).toMatchObject({
      reviewProfile: "recognition",
      parameterSetId: "recognition-fsrs-v1",
      firstRatedAt: "2026-07-03T23:00:00.000Z",
      historyOrigin: "recorded",
      difficulty: 2.11810397,
      stability: 2.3065,
    });
  });

  it("rejects invalid data instead of manufacturing an empty workspace", () => {
    expect(() => migrateVocabularyData("not-json")).toThrow(LocalVocabularyReadError);
  });
});

describe("local storage recovery boundary", () => {
  let values: Map<string, string>;
  let setItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    values = new Map();
    setItem = vi.fn((key: string, value: string) => values.set(key, value));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem,
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("starts a writable empty workspace only when no saved value exists", () => {
    const initial = readVocabularyData();
    expect(initial.items).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
    writeVocabularyData(initial);
    expect(readVocabularyData()).toEqual(initial);
  });

  it.each([
    "",
    "{broken",
    "null",
    "[]",
    '{"schemaVersion":99,"items":[{"id":"precious"}]}',
    JSON.stringify({ ...createEmptyVocabularyData(), items: "broken" }),
    JSON.stringify({ ...createEmptyVocabularyData(), items: [null] }),
    JSON.stringify({ ...createEmptyVocabularyData(), people: [] }),
  ])("preserves unreadable bytes and blocks ordinary writes: %s", (raw) => {
    values.set(VOCABULARY_STORAGE_KEY, raw);
    expect(() => readVocabularyData()).toThrow(LocalVocabularyReadError);
    expect(() => writeVocabularyData(createEmptyVocabularyData())).toThrow(LocalVocabularyReadError);
    expect(values.get(VOCABULARY_STORAGE_KEY)).toBe(raw);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("rechecks current storage before a write when another tab corrupts the saved value", () => {
    const initial = readVocabularyData();
    writeVocabularyData(initial);
    values.set(VOCABULARY_STORAGE_KEY, "{interrupted by another tab");
    setItem.mockClear();

    expect(() => writeVocabularyData(initial)).toThrow(LocalVocabularyReadError);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("preserves original bytes before explicit restore and permits subsequent ordinary writes", () => {
    const raw = ' {"unreadable history": ';
    values.set(VOCABULARY_STORAGE_KEY, raw);
    const restored = createEmptyVocabularyData();
    const result = restoreVocabularyData(restored);

    expect(result.recoveryStorageKey).not.toBeNull();
    expect(values.get(result.recoveryStorageKey!)).toBe(raw);
    expect(setItem.mock.calls[0]).toEqual([result.recoveryStorageKey, raw]);
    expect(readVocabularyData()).toEqual(restored);
    expect(() => writeVocabularyData(restored)).not.toThrow();
  });

  it("stops replacement if preserving the original bytes fails", () => {
    const raw = "{broken history";
    values.set(VOCABULARY_STORAGE_KEY, raw);
    setItem.mockImplementation(() => { throw new Error("Storage is full"); });

    expect(() => restoreVocabularyData(createEmptyVocabularyData())).toThrow("Storage is full");
    expect(values.get(VOCABULARY_STORAGE_KEY)).toBe(raw);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("never replaces an earlier recovery copy on repeated explicit restores", () => {
    values.set(VOCABULARY_STORAGE_KEY, "{original");
    const restored = createEmptyVocabularyData();
    const first = restoreVocabularyData(restored);
    values.set(VOCABULARY_STORAGE_KEY, "{later corruption");
    const second = restoreVocabularyData(restored);

    expect(first.recoveryStorageKey).not.toBe(second.recoveryStorageKey);
    expect(values.get(first.recoveryStorageKey!)).toBe("{original");
    expect(values.get(second.recoveryStorageKey!)).toBe("{later corruption");
  });
});
