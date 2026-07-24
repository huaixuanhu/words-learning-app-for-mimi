import { describe, expect, it } from "vitest";
import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import {
  buildVocabularyItem,
  createEmptyVocabularyData,
} from "@/lib/vocabulary/repository";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";
import {
  buildVocabularyDeduplicationPlan,
  deduplicateVocabularyItems,
  getVocabularyDeduplicationConfirmation,
} from "./deduplication";

const NOW = "2026-07-24T01:00:00.000Z";

function makeItem(
  data: VocabularyData,
  input: {
    id: string;
    surfaceText?: string;
    systemCreatedAt: string;
    meaningsZh?: string[];
    examples?: string[];
    exampleTranslationsZh?: string[];
    notes?: string;
    importBatchId?: string | null;
    archived?: boolean;
    learningTrack?: VocabularyItem["learningTrack"];
  },
): VocabularyItem {
  const item = buildVocabularyItem(
    {
      id: input.id,
      personId: data.selectedPersonId,
      surfaceText: input.surfaceText ?? "Allocate",
      meaningsZh: input.meaningsZh,
      examples: input.examples,
      exampleTranslationsZh: input.exampleTranslationsZh,
      notes: input.notes,
      learningTrack: input.learningTrack,
      source: input.importBatchId ? "pasted_text" : "manual",
      importBatchId: input.importBatchId,
      systemCreatedAt: input.systemCreatedAt,
      timezone: "Australia/Melbourne",
    },
    NOW,
  );

  return input.archived
    ? {
        ...item,
        status: "archived",
        archivedAt: NOW,
      }
    : item;
}

function makeReviewState(data: VocabularyData, itemId: string, id: string): ReviewState {
  return {
    id,
    personId: data.selectedPersonId,
    vocabularyItemId: itemId,
    reviewProfile: "recognition",
    parameterSetId: "recognition-fsrs-v1",
    firstRatedAt: NOW,
    historyOrigin: "recorded",
    status: "review",
    dueAt: NOW,
    lastReviewedAt: NOW,
    reviewCount: 1,
    lapseCount: 0,
    intervalMinutes: 1_440,
    difficulty: 5,
    stability: 2,
    updatedAt: NOW,
  };
}

function makeReviewEvent(data: VocabularyData, itemId: string, id: string): ReviewEvent {
  return {
    id,
    promptId: null,
    personId: data.selectedPersonId,
    vocabularyItemId: itemId,
    reviewProfile: "recognition",
    activityType: "recognition_card",
    answerOutcome: "self_rated",
    answerNormalizationVersion: null,
    targetRevision: null,
    parameterSetId: "recognition-fsrs-v1",
    reviewedAt: NOW,
    rating: "remembered",
    previousDueAt: null,
    nextDueAt: NOW,
    previousIntervalMinutes: null,
    nextIntervalMinutes: 1_440,
    elapsedMs: 1_000,
  };
}

describe("vocabulary deduplication", () => {
  it("keeps the copy with the highest review-event count before later tie-breakers", () => {
    const data = createEmptyVocabularyData(NOW);
    const activeRich = makeItem(data, {
      id: "vocab-active-rich",
      systemCreatedAt: "2026-07-20T00:00:00.000Z",
      meaningsZh: ["分配", "配置"],
      examples: ["Allocate time.", "Allocate money."],
      exampleTranslationsZh: ["分配时间。", "分配金钱。"],
    });
    const archivedReviewed = makeItem(data, {
      id: "vocab-archived-reviewed",
      systemCreatedAt: "2026-07-23T00:00:00.000Z",
      archived: true,
      learningTrack: "active",
    });
    const withDuplicates = {
      ...data,
      items: [activeRich, archivedReviewed],
      reviewEvents: [
        makeReviewEvent(data, archivedReviewed.id, "event-1"),
        makeReviewEvent(data, archivedReviewed.id, "event-2"),
      ],
    };

    const plan = buildVocabularyDeduplicationPlan(withDuplicates);

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({
      keeperItemId: "vocab-archived-reviewed",
      duplicateItemIds: ["vocab-active-rich"],
      multipleCopiesHaveHistory: false,
    });
  });

  it("uses review state, active status, richer content, time and id as deterministic tie-breakers", () => {
    const data = createEmptyVocabularyData(NOW);
    const oldSparse = makeItem(data, {
      id: "vocab-a",
      systemCreatedAt: "2026-07-20T00:00:00.000Z",
    });
    const newerRich = makeItem(data, {
      id: "vocab-b",
      systemCreatedAt: "2026-07-21T00:00:00.000Z",
      meaningsZh: ["分配", "配置"],
      examples: ["Allocate time."],
      exampleTranslationsZh: ["分配时间。"],
    });
    const withState = {
      ...data,
      items: [oldSparse, newerRich],
      reviewStates: [makeReviewState(data, newerRich.id, "state-1")],
    };

    expect(
      buildVocabularyDeduplicationPlan(withState).groups[0]?.keeperItemId,
    ).toBe("vocab-b");

    const withoutState = {
      ...withState,
      reviewStates: [],
    };

    expect(
      buildVocabularyDeduplicationPlan(withoutState).groups[0]?.keeperItemId,
    ).toBe("vocab-b");
  });

  it("hard-deletes only loser-linked data while preserving creation facts and batch audit rows", () => {
    const data = createEmptyVocabularyData(NOW);
    const keeper = makeItem(data, {
      id: "vocab-keeper",
      systemCreatedAt: "2026-07-20T00:00:00.000Z",
      importBatchId: "batch-1",
    });
    const loser = makeItem(data, {
      id: "vocab-loser",
      systemCreatedAt: "2026-07-21T00:00:00.000Z",
      importBatchId: "batch-2",
    });
    const duplicateData: VocabularyData = {
      ...data,
      items: [keeper, loser],
      importBatches: [
        {
          id: "batch-1",
          personId: data.selectedPersonId,
          sourceType: "pasted_text",
          fileName: null,
          createdAt: NOW,
          totalRows: 1,
          acceptedRows: 1,
          duplicateRows: 0,
          invalidRows: 0,
        },
        {
          id: "batch-2",
          personId: data.selectedPersonId,
          sourceType: "pasted_text",
          fileName: null,
          createdAt: NOW,
          totalRows: 1,
          acceptedRows: 1,
          duplicateRows: 0,
          invalidRows: 0,
        },
      ],
      reviewStates: [makeReviewState(data, loser.id, "state-loser")],
      reviewEvents: [
        makeReviewEvent(data, keeper.id, "event-keeper-1"),
        makeReviewEvent(data, keeper.id, "event-keeper-2"),
        makeReviewEvent(data, loser.id, "event-loser"),
      ],
      vocabularyCreationFacts: [
        {
          creationFactId: "fact-keeper",
          personId: data.selectedPersonId,
          originalVocabularyItemId: keeper.id,
          sourceActionId: "batch-1",
          trackAtCreation: "recognition",
          sourceKind: "batch",
          historyOrigin: "recorded",
          systemCreatedAt: keeper.systemCreatedAt,
        },
        {
          creationFactId: "fact-loser",
          personId: data.selectedPersonId,
          originalVocabularyItemId: loser.id,
          sourceActionId: "batch-2",
          trackAtCreation: "recognition",
          sourceKind: "batch",
          historyOrigin: "recorded",
          systemCreatedAt: loser.systemCreatedAt,
        },
      ],
      aiRuns: [
        {
          id: "ai-run-loser",
          personId: data.selectedPersonId,
          sourceVocabularyItemId: loser.id,
          feature: "enrichment_v1",
          provider: "local-fixture",
          model: "fixture",
          modelLabel: "Fixture",
          promptVersion: "test-v1",
          sourceHash: "source-hash",
          outputSchemaVersion: "test-v1",
          disclosureVersion: "test-v1",
          idempotencyKeyHash: "idempotency-hash",
          cacheKeyHash: "cache-hash",
          status: "succeeded",
          structureValidationStatus: "valid",
          providerResponseId: null,
          inputTokens: 0,
          outputTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          latencyMs: 0,
          estimatedCostUsd: 0,
          createdAt: NOW,
          completedAt: NOW,
        },
      ],
      aiEnrichmentDrafts: [
        {
          id: "ai-draft-loser",
          personId: data.selectedPersonId,
          sourceVocabularyItemId: loser.id,
          aiRunId: "ai-run-loser",
          status: "draft",
          draft: {
            additionalMeaningsZh: [],
            examples: [],
            similarWords: [],
            confusableWords: [],
          },
          acceptedContent: null,
          createdAt: NOW,
          updatedAt: NOW,
          decidedAt: null,
        },
      ],
      vocabularyRelations: [
        {
          id: "relation-loser",
          personId: data.selectedPersonId,
          sourceVocabularyItemId: loser.id,
          targetVocabularyItemId: keeper.id,
          relationType: "similar",
          differenceZh: "测试",
          examplePair: [],
          aiRunId: "ai-run-loser",
          createdAt: NOW,
        },
      ],
    };
    const plan = buildVocabularyDeduplicationPlan(duplicateData);
    const result = deduplicateVocabularyItems(
      duplicateData,
      getVocabularyDeduplicationConfirmation(plan),
      "2026-07-24T01:05:00.000Z",
    );

    expect(plan).toMatchObject({
      duplicateGroupsCount: 1,
      deletedItemsCount: 1,
      deletedReviewStatesCount: 1,
      deletedReviewEventsCount: 1,
      deletedAiDraftsCount: 1,
      deletedVocabularyRelationsCount: 1,
      detachedAiRunsCount: 1,
      affectedImportBatchesCount: 2,
      groupsWithMultipleHistoriesCount: 1,
    });
    expect(result.data.items.map((item) => item.id)).toEqual(["vocab-keeper"]);
    expect(result.data.reviewStates).toHaveLength(0);
    expect(result.data.reviewEvents.map((event) => event.id)).toEqual([
      "event-keeper-1",
      "event-keeper-2",
    ]);
    expect(result.data.aiRuns[0]?.sourceVocabularyItemId).toBeNull();
    expect(result.data.aiEnrichmentDrafts).toHaveLength(0);
    expect(result.data.vocabularyRelations).toHaveLength(0);
    expect(result.data.vocabularyCreationFacts).toHaveLength(2);
    expect(result.data.importBatches).toHaveLength(2);
  });

  it("rejects a stale destructive confirmation when the duplicate set changes", () => {
    const data = createEmptyVocabularyData(NOW);
    const first = makeItem(data, {
      id: "vocab-a",
      systemCreatedAt: "2026-07-20T00:00:00.000Z",
    });
    const second = makeItem(data, {
      id: "vocab-b",
      systemCreatedAt: "2026-07-21T00:00:00.000Z",
    });
    const initialData = { ...data, items: [first, second] };
    const confirmation = getVocabularyDeduplicationConfirmation(
      buildVocabularyDeduplicationPlan(initialData),
    );
    const changedData = {
      ...initialData,
      items: [
        ...initialData.items,
        makeItem(data, {
          id: "vocab-c",
          systemCreatedAt: "2026-07-22T00:00:00.000Z",
        }),
      ],
    };

    expect(() =>
      deduplicateVocabularyItems(changedData, confirmation, NOW),
    ).toThrow("Duplicate cleanup changed");
  });

  it("cleans only the selected person and leaves another person's same word untouched", () => {
    const data = createEmptyVocabularyData(NOW);
    const selectedFirst = makeItem(data, {
      id: "vocab-selected-a",
      systemCreatedAt: "2026-07-20T00:00:00.000Z",
    });
    const selectedSecond = makeItem(data, {
      id: "vocab-selected-b",
      systemCreatedAt: "2026-07-21T00:00:00.000Z",
    });
    const friendId = "person-friend";
    const friendItem = {
      ...makeItem(data, {
        id: "vocab-friend",
        systemCreatedAt: "2026-07-22T00:00:00.000Z",
      }),
      personId: friendId,
    };
    const scopedData: VocabularyData = {
      ...data,
      people: [
        ...data.people,
        {
          id: friendId,
          displayName: "Friend",
          slug: "friend",
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      items: [selectedFirst, selectedSecond, friendItem],
    };
    const plan = buildVocabularyDeduplicationPlan(scopedData);
    const result = deduplicateVocabularyItems(
      scopedData,
      getVocabularyDeduplicationConfirmation(plan),
      NOW,
    );

    expect(plan.duplicateGroupsCount).toBe(1);
    expect(result.data.items.some((item) => item.id === friendItem.id)).toBe(true);
    expect(
      result.data.items.filter((item) => item.personId === data.selectedPersonId),
    ).toHaveLength(1);
  });
});
