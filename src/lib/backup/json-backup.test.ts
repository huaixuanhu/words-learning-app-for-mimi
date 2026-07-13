import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
      learningTrack: "recognition",
      tags: ["PTE", "Writing"],
      source: "manual",
      timezone: "Australia/Melbourne",
    },
    "2026-07-05T00:01:00.000Z",
  );
  const personId = added.item.personId;

  return {
    ...added.data,
    importBatches: [
      {
        id: "batch-1",
        personId,
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
        personId,
        vocabularyItemId: "vocab-1",
        reviewProfile: "recognition" as const,
        parameterSetId: "recognition-fsrs-v1",
        firstRatedAt: "2026-07-05T00:10:00.000Z",
        historyOrigin: "recorded" as const,
        status: "review" as const,
        dueAt: "2026-07-06T00:00:00.000Z",
        lastReviewedAt: "2026-07-05T00:10:00.000Z",
        reviewCount: 1,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: 3.25,
        stability: 1.75,
        updatedAt: "2026-07-05T00:10:00.000Z",
      },
    ],
    reviewEvents: [
      {
        id: "review-event-1",
        promptId: null,
        personId,
        vocabularyItemId: "vocab-1",
        reviewProfile: "recognition" as const,
        activityType: "recognition_card" as const,
        answerOutcome: "self_rated" as const,
        answerNormalizationVersion: null,
        targetRevision: null,
        parameterSetId: "recognition-fsrs-v1",
        reviewedAt: "2026-07-05T00:10:00.000Z",
        rating: "hard" as const,
        previousDueAt: null,
        nextDueAt: "2026-07-06T00:00:00.000Z",
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 3500,
      },
    ],
    settingsByPerson: added.data.settingsByPerson.map((settings) =>
      settings.personId === personId
        ? {
            ...settings,
            sessionLimit: 12,
            recognitionSessionLimit: 12,
            activeSessionLimit: 6,
            timezone: "Australia/Melbourne",
            updatedAt: "2026-07-05T00:03:00.000Z",
          }
        : settings,
    ),
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
      schemaVersion: 6,
    });
    expect(backup.metadata.counts).toEqual({
      people: 1,
      items: 1,
      activeItems: 1,
      archivedItems: 0,
      importBatches: 1,
      reviewStates: 1,
      reviewEvents: 1,
      dailyStudyDefaults: 2,
      dailyStudyPlans: 0,
      vocabularyCreationFacts: 1,
      vocabularyCreationReversals: 0,
      aiRuns: 0,
      aiEnrichmentDrafts: 0,
      vocabularyRelations: 0,
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

    expect(parsed.data.schemaVersion).toBe(6);
    expect(parsed.data.people).toHaveLength(1);
    expect(parsed.data.items[0]?.id).toBe("vocab-1");
    expect(parsed.data.items[0]?.personId).toBe("person_mimi");
    expect(parsed.data.items[0]?.learningTrack).toBe("recognition");
    expect(parsed.data.items[0]?.tags).toEqual(["PTE", "Writing"]);
    expect(parsed.data.items[0]?.meaningsZh).toEqual(["分配"]);
    expect(parsed.data.items[0]?.examples).toEqual(["Allocate time wisely."]);
    expect(parsed.data.importBatches).toHaveLength(1);
    expect(parsed.data.reviewStates).toHaveLength(1);
    expect(parsed.data.reviewStates[0]?.difficulty).toBe(3.25);
    expect(parsed.data.reviewStates[0]?.stability).toBe(1.75);
    expect(parsed.data.reviewEvents).toHaveLength(1);
    expect(parsed.data.settingsByPerson[0]?.sessionLimit).toBe(12);
    expect(parsed.data.settingsByPerson[0]?.recognitionSessionLimit).toBe(12);
    expect(parsed.data.settingsByPerson[0]?.activeSessionLimit).toBe(6);
    expect(parsed.counts).toEqual(summarizeVocabularyData(data));
  });

  it("round-trips Active vocabulary without review state or review events", () => {
    const added = addVocabularyItem(
      createEmptyVocabularyData("2026-07-05T00:00:00.000Z"),
      {
        id: "vocab-active",
        surfaceText: "articulate",
        meaningZh: "清楚表达",
        example: "Articulate your position clearly.",
        learningTrack: "active",
        tags: ["PTE", "Writing"],
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-05T00:01:00.000Z",
    );
    const serialized = serializeVocabularyBackup(added.data, {
      exportedAt: "2026-07-05T00:20:00.000Z",
      timezone: "Australia/Melbourne",
    });
    const parsed = parseVocabularyBackupText(serialized, "2026-07-05T00:21:00.000Z");

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.items[0]).toMatchObject({
      id: "vocab-active",
      learningTrack: "active",
      meaningsZh: ["清楚表达"],
      examples: ["Articulate your position clearly."],
    });
    expect(parsed.data.reviewStates).toHaveLength(0);
    expect(parsed.data.reviewEvents).toHaveLength(0);
  });

  it("restores schema version 2 backups by migrating them to version 6", () => {
    const parsed = parseVocabularyBackupText(
      JSON.stringify({
        format: "mimi-pte-vocabulary-backup",
        backupVersion: 1,
        metadata: {
          appName: "words-learning-app-for-mimi",
          exportedAt: "2026-07-05T00:20:00.000Z",
          timezone: "Australia/Melbourne",
          schemaVersion: 2,
          counts: {
            items: 1,
            activeItems: 1,
            archivedItems: 0,
            importBatches: 0,
            reviewStates: 0,
            reviewEvents: 0,
          },
        },
        data: {
          schemaVersion: 2,
          items: [
            {
              id: "vocab-legacy",
              surfaceText: "legacy",
              normalizedText: "legacy",
              meaningZh: "",
              example: "",
              notes: "",
              rarityScore: null,
              source: "manual",
              importBatchId: null,
              status: "new",
              createdAt: "2026-07-05T00:00:00.000Z",
              systemCreatedAt: "2026-07-05T00:00:00.000Z",
              updatedAt: "2026-07-05T00:00:00.000Z",
              timezone: "Australia/Melbourne",
              archivedAt: null,
            },
          ],
          importBatches: [],
          reviewStates: [],
          reviewEvents: [],
          settings: {
            sessionLimit: 10,
            timezone: "Australia/Melbourne",
            updatedAt: "2026-07-05T00:00:00.000Z",
          },
          updatedAt: "2026-07-05T00:00:00.000Z",
        },
      }),
    );

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.schemaVersion).toBe(6);
    expect(parsed.data.items[0]?.personId).toBe("person_mimi");
    expect(parsed.data.items[0]?.learningTrack).toBe("recognition");
    expect(parsed.data.items[0]?.tags).toBeNull();
    expect(parsed.data.items[0]?.meaningsZh).toEqual([]);
    expect(parsed.data.items[0]?.examples).toEqual([]);
    expect(parsed.data.settingsByPerson[0]?.sessionLimit).toBe(10);
    expect(parsed.data.settingsByPerson[0]?.recognitionSessionLimit).toBe(10);
    expect(parsed.data.settingsByPerson[0]?.activeSessionLimit).toBe(8);
    expect(parsed.data.dailyStudyDefaults).toHaveLength(2);
    expect(parsed.data.vocabularyCreationFacts[0]).toMatchObject({
      originalVocabularyItemId: "vocab-legacy",
      historyOrigin: "legacy_backfill",
    });
  });

  it("rejects malformed JSON and unsupported backup shapes", () => {
    expect(parseVocabularyBackupText("{bad json").ok).toBe(false);

    const parsed = parseVocabularyBackupText(
      JSON.stringify({
        format: "wrong-format",
        backupVersion: 1,
        metadata: {},
        data: {
          schemaVersion: 3,
          people: [],
          selectedPersonId: "missing",
          items: [{ id: "broken" }],
          importBatches: [],
          reviewStates: [],
          reviewEvents: [],
          settingsByPerson: {},
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
    expect(parsed.errors.join("\n")).toContain("data.settingsByPerson must be an array");
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

  it("round-trips profile-isolated Active review evidence in Schema Version 6", () => {
    const active = addVocabularyItem(
      createEmptyVocabularyData("2026-07-05T00:00:00.000Z"),
      {
        id: "vocab-active",
        surfaceText: "articulate",
        meaningZh: "清楚表达",
        example: "Articulate your position clearly.",
        learningTrack: "active",
        tags: ["PTE", "Writing"],
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-05T00:01:00.000Z",
    );
    const personId = active.item.personId;
    const backup = createVocabularyBackup(
      {
        ...active.data,
        reviewStates: [
          {
            id: "review-state-active",
            personId,
            vocabularyItemId: "vocab-active",
            reviewProfile: "active",
            parameterSetId: "active-fsrs-v1",
            firstRatedAt: "2026-07-05T00:10:00.000Z",
            historyOrigin: "recorded",
            status: "review",
            dueAt: "2026-07-06T00:00:00.000Z",
            lastReviewedAt: "2026-07-05T00:10:00.000Z",
            reviewCount: 1,
            lapseCount: 0,
            intervalMinutes: 1440,
            difficulty: 3.25,
            stability: 1.75,
            updatedAt: "2026-07-05T00:10:00.000Z",
          },
        ],
        reviewEvents: [
          {
            id: "review-event-active",
            promptId: "prompt-active-1",
            personId,
            vocabularyItemId: "vocab-active",
            reviewProfile: "active",
            activityType: "dictation",
            answerOutcome: "exact",
            answerNormalizationVersion: "active-answer-v1",
            targetRevision: "articulate:v1",
            parameterSetId: "active-fsrs-v1",
            reviewedAt: "2026-07-05T00:10:00.000Z",
            rating: "remembered",
            previousDueAt: null,
            nextDueAt: "2026-07-13T00:10:00.000Z",
            previousIntervalMinutes: null,
            nextIntervalMinutes: 11520,
            elapsedMs: 3200,
          },
        ],
      },
      {
        exportedAt: "2026-07-05T00:20:00.000Z",
        timezone: "Australia/Melbourne",
      },
    );
    const parsed = parseVocabularyBackupText(JSON.stringify(backup));

    expect(parsed.ok).toBe(true);

    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.reviewStates[0]).toMatchObject({
      reviewProfile: "active",
      parameterSetId: "active-fsrs-v1",
    });
    expect(parsed.data.reviewEvents[0]).toMatchObject({
      reviewProfile: "active",
      activityType: "dictation",
      answerOutcome: "exact",
    });
  });

  it("round-trips the fixed Schema Version 6 formal-data fixture", () => {
    const fixture = readFileSync(
      join(process.cwd(), "test_fixtures", "v2-stage3-schema6-backup.json"),
      "utf8",
    );
    const firstParse = parseVocabularyBackupText(fixture, "2026-07-13T11:00:00.000Z");

    expect(firstParse.ok).toBe(true);
    if (!firstParse.ok) {
      return;
    }

    const serialized = serializeVocabularyBackup(firstParse.data, {
      exportedAt: "2026-07-13T11:05:00.000Z",
      timezone: "Australia/Melbourne",
    });
    const secondParse = parseVocabularyBackupText(serialized, "2026-07-13T11:06:00.000Z");

    expect(secondParse.ok).toBe(true);
    if (!secondParse.ok) {
      return;
    }

    expect(secondParse.data.dailyStudyDefaults).toHaveLength(2);
    expect(secondParse.data.dailyStudyPlans).toHaveLength(2);
    expect(secondParse.data.vocabularyCreationFacts).toHaveLength(3);
    expect(secondParse.data.vocabularyCreationReversals).toHaveLength(1);
    expect(secondParse.data.aiRuns).toHaveLength(1);
    expect(secondParse.data.aiEnrichmentDrafts).toEqual([
      expect.objectContaining({ status: "accepted" }),
    ]);
    expect(secondParse.data.vocabularyRelations).toEqual([
      expect.objectContaining({ relationType: "spelling" }),
    ]);
  });

  it("exports accepted AI content while excluding temporary and failed records", () => {
    const data = createSampleData();
    const personId = data.selectedPersonId;
    const acceptedContent = {
      additionalMeaningsZh: ["划拨"],
      examples: ["Allocate the work fairly."],
      similarWords: [],
      confusableWords: [],
    };
    const backup = createVocabularyBackup(
      {
        ...data,
        aiRuns: [
          {
            id: "run-accepted",
            personId,
            sourceVocabularyItemId: "vocab-1",
            feature: "enrichment_v1",
            provider: "google-gemini-api",
            model: "gemini-3.1-flash-lite",
            modelLabel: "Gemini 3.1 Flash-Lite",
            promptVersion: "v2-stage2b-prompt-v2",
            sourceHash: "source-hash",
            outputSchemaVersion: "ai-enrichment-v2",
            disclosureVersion: "ai-disclosure-v1",
            idempotencyKeyHash: "accepted-idempotency",
            cacheKeyHash: "accepted-cache",
            status: "succeeded",
            structureValidationStatus: "valid",
            providerResponseId: null,
            inputTokens: 100,
            outputTokens: 100,
            thinkingTokens: 0,
            totalTokens: 200,
            latencyMs: 500,
            estimatedCostUsd: 0.00005,
            createdAt: "2026-07-05T00:04:00.000Z",
            completedAt: "2026-07-05T00:04:01.000Z",
          },
          {
            id: "run-failed",
            personId,
            sourceVocabularyItemId: "vocab-1",
            feature: "enrichment_v1",
            provider: "google-gemini-api",
            model: "gemini-3.1-flash-lite",
            modelLabel: "Gemini 3.1 Flash-Lite",
            promptVersion: "v2-stage2b-prompt-v2",
            sourceHash: "source-hash-failed",
            outputSchemaVersion: "ai-enrichment-v2",
            disclosureVersion: "ai-disclosure-v1",
            idempotencyKeyHash: "failed-idempotency",
            cacheKeyHash: "failed-cache",
            status: "failed",
            structureValidationStatus: "unavailable",
            providerResponseId: null,
            inputTokens: 100,
            outputTokens: 0,
            thinkingTokens: 0,
            totalTokens: 100,
            latencyMs: 500,
            estimatedCostUsd: 0.00001,
            createdAt: "2026-07-05T00:05:00.000Z",
            completedAt: "2026-07-05T00:05:01.000Z",
          },
        ],
        aiEnrichmentDrafts: [
          {
            id: "draft-accepted",
            personId,
            sourceVocabularyItemId: "vocab-1",
            aiRunId: "run-accepted",
            status: "accepted",
            draft: acceptedContent,
            acceptedContent,
            createdAt: "2026-07-05T00:04:00.000Z",
            updatedAt: "2026-07-05T00:06:00.000Z",
            decidedAt: "2026-07-05T00:06:00.000Z",
          },
          {
            id: "draft-temporary",
            personId,
            sourceVocabularyItemId: "vocab-1",
            aiRunId: "run-failed",
            status: "draft",
            draft: acceptedContent,
            acceptedContent: null,
            createdAt: "2026-07-05T00:05:00.000Z",
            updatedAt: "2026-07-05T00:05:00.000Z",
            decidedAt: null,
          },
        ],
      },
      {
        exportedAt: "2026-07-05T00:20:00.000Z",
        timezone: "Australia/Melbourne",
      },
    );

    expect(backup.data.aiRuns.map((run) => run.id)).toEqual(["run-accepted"]);
    expect(backup.data.aiEnrichmentDrafts.map((draft) => draft.id)).toEqual([
      "draft-accepted",
    ]);
    expect(backup.metadata.counts).toMatchObject({
      aiRuns: 1,
      aiEnrichmentDrafts: 1,
    });
  });

  it("preserves read-only history from the previous Track after an explicit transition", () => {
    const data = createSampleData();
    const serialized = serializeVocabularyBackup(
      {
        ...data,
        items: data.items.map((item) => ({ ...item, learningTrack: "active" as const })),
      },
      {
        exportedAt: "2026-07-05T00:20:00.000Z",
        timezone: "Australia/Melbourne",
      },
    );
    const parsed = parseVocabularyBackupText(serialized);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.items[0]?.learningTrack).toBe("active");
    expect(parsed.data.reviewStates[0]?.reviewProfile).toBe("recognition");
    expect(parsed.data.reviewEvents[0]?.reviewProfile).toBe("recognition");
  });
});
