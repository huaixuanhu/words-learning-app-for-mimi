import { getSelectedPersonId } from "@/lib/people/repository";
import { normalizeSurfaceText } from "@/lib/vocabulary/normalize";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";

export type VocabularyDeduplicationGroup = {
  normalizedText: string;
  displayText: string;
  keeperItemId: string;
  duplicateItemIds: string[];
  deletedReviewStatesCount: number;
  deletedReviewEventsCount: number;
  deletedAiDraftsCount: number;
  deletedVocabularyRelationsCount: number;
  detachedAiRunsCount: number;
  affectedImportBatchIds: string[];
  multipleCopiesHaveHistory: boolean;
};

export type VocabularyDeduplicationConfirmation = {
  fingerprint: string;
  duplicateGroupsCount: number;
  deletedItemsCount: number;
  deletedReviewStatesCount: number;
  deletedReviewEventsCount: number;
  deletedAiDraftsCount: number;
  deletedVocabularyRelationsCount: number;
  detachedAiRunsCount: number;
  affectedImportBatchesCount: number;
  groupsWithMultipleHistoriesCount: number;
};

export type VocabularyDeduplicationPlan = VocabularyDeduplicationConfirmation & {
  personId: string;
  groups: VocabularyDeduplicationGroup[];
  duplicateItemIds: string[];
  affectedImportBatchIds: string[];
};

export type VocabularyDeduplicationMutationResult = VocabularyDeduplicationConfirmation & {
  data: VocabularyData;
};

type KeeperCandidate = {
  item: VocabularyItem;
  reviewEventCount: number;
  hasReviewState: boolean;
  isActive: boolean;
  learningContent: number[];
};

function compareStableText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function getNormalizedIdentity(item: VocabularyItem) {
  return normalizeSurfaceText(item.surfaceText) || item.normalizedText;
}

function getLearningContentTuple(item: VocabularyItem) {
  const completeExamplePairs = item.examples.filter(
    (_, index) => Boolean(item.exampleTranslationsZh?.[index]?.trim()),
  ).length;

  return [
    item.meaningsZh.length,
    completeExamplePairs,
    item.examples.length,
    item.notes.trim() ? 1 : 0,
    item.tags?.length ?? 0,
    item.rarityScore === null ? 0 : 1,
  ];
}

function compareNumberTuplesDescending(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function compareKeeperCandidates(left: KeeperCandidate, right: KeeperCandidate) {
  if (left.reviewEventCount !== right.reviewEventCount) {
    return right.reviewEventCount - left.reviewEventCount;
  }

  if (left.hasReviewState !== right.hasReviewState) {
    return Number(right.hasReviewState) - Number(left.hasReviewState);
  }

  if (left.isActive !== right.isActive) {
    return Number(right.isActive) - Number(left.isActive);
  }

  const learningContentComparison = compareNumberTuplesDescending(
    left.learningContent,
    right.learningContent,
  );

  if (learningContentComparison !== 0) {
    return learningContentComparison;
  }

  const createdAtComparison = compareStableText(
    left.item.systemCreatedAt,
    right.item.systemCreatedAt,
  );

  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return compareStableText(left.item.id, right.item.id);
}

function makeFingerprint(groups: VocabularyDeduplicationGroup[]) {
  const identities = groups
    .map((group) => ({
      keeperItemId: group.keeperItemId,
      duplicateItemIds: [...group.duplicateItemIds].sort(),
    }))
    .sort((left, right) =>
      compareStableText(left.keeperItemId, right.keeperItemId),
    );

  return `vocabulary-deduplication-v1:${JSON.stringify(identities)}`;
}

export function buildVocabularyDeduplicationPlan(
  data: VocabularyData,
): VocabularyDeduplicationPlan {
  const personId = getSelectedPersonId(data);
  const itemsByIdentity = new Map<string, VocabularyItem[]>();

  data.items
    .filter((item) => item.personId === personId)
    .forEach((item) => {
      const identity = getNormalizedIdentity(item);
      const existing = itemsByIdentity.get(identity) ?? [];
      existing.push(item);
      itemsByIdentity.set(identity, existing);
    });

  const groups = [...itemsByIdentity.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([normalizedText, items]) => {
      const candidates = items
        .map((item) => ({
          item,
          reviewEventCount: data.reviewEvents.filter(
            (event) =>
              event.personId === personId && event.vocabularyItemId === item.id,
          ).length,
          hasReviewState: data.reviewStates.some(
            (state) =>
              state.personId === personId && state.vocabularyItemId === item.id,
          ),
          isActive: item.status !== "archived" && item.archivedAt === null,
          learningContent: getLearningContentTuple(item),
        }))
        .sort(compareKeeperCandidates);
      const keeper = candidates[0];

      if (!keeper) {
        throw new Error(`Unable to select a keeper for duplicate identity: ${normalizedText}`);
      }

      const duplicateItemIds = candidates
        .slice(1)
        .map((candidate) => candidate.item.id)
        .sort();
      const duplicateItemIdSet = new Set(duplicateItemIds);
      const copiesWithHistory = candidates.filter(
        (candidate) => candidate.reviewEventCount > 0 || candidate.hasReviewState,
      ).length;
      const affectedImportBatchIds = candidates
        .map((candidate) => candidate.item.importBatchId)
        .filter((batchId): batchId is string => Boolean(batchId))
        .filter((batchId, index, all) => all.indexOf(batchId) === index)
        .sort();
      const deletedRelationIds = new Set(
        data.vocabularyRelations
          .filter(
            (relation) =>
              relation.personId === personId &&
              (duplicateItemIdSet.has(relation.sourceVocabularyItemId) ||
                duplicateItemIdSet.has(relation.targetVocabularyItemId)),
          )
          .map((relation) => relation.id),
      );

      return {
        normalizedText,
        displayText: keeper.item.surfaceText,
        keeperItemId: keeper.item.id,
        duplicateItemIds,
        deletedReviewStatesCount: data.reviewStates.filter(
          (state) =>
            state.personId === personId && duplicateItemIdSet.has(state.vocabularyItemId),
        ).length,
        deletedReviewEventsCount: data.reviewEvents.filter(
          (event) =>
            event.personId === personId && duplicateItemIdSet.has(event.vocabularyItemId),
        ).length,
        deletedAiDraftsCount: data.aiEnrichmentDrafts.filter(
          (draft) =>
            draft.personId === personId &&
            duplicateItemIdSet.has(draft.sourceVocabularyItemId),
        ).length,
        deletedVocabularyRelationsCount: deletedRelationIds.size,
        detachedAiRunsCount: data.aiRuns.filter(
          (run) =>
            run.personId === personId &&
            run.sourceVocabularyItemId !== null &&
            duplicateItemIdSet.has(run.sourceVocabularyItemId),
        ).length,
        affectedImportBatchIds,
        multipleCopiesHaveHistory: copiesWithHistory > 1,
      };
    })
    .sort((left, right) =>
      compareStableText(left.normalizedText, right.normalizedText),
    );
  const duplicateItemIds = groups.flatMap((group) => group.duplicateItemIds);
  const duplicateItemIdSet = new Set(duplicateItemIds);
  const affectedImportBatchIds = [
    ...new Set(groups.flatMap((group) => group.affectedImportBatchIds)),
  ].sort();

  return {
    personId,
    groups,
    duplicateItemIds,
    affectedImportBatchIds,
    fingerprint: makeFingerprint(groups),
    duplicateGroupsCount: groups.length,
    deletedItemsCount: duplicateItemIds.length,
    deletedReviewStatesCount: data.reviewStates.filter(
      (state) =>
        state.personId === personId &&
        duplicateItemIdSet.has(state.vocabularyItemId),
    ).length,
    deletedReviewEventsCount: data.reviewEvents.filter(
      (event) =>
        event.personId === personId &&
        duplicateItemIdSet.has(event.vocabularyItemId),
    ).length,
    deletedAiDraftsCount: data.aiEnrichmentDrafts.filter(
      (draft) =>
        draft.personId === personId &&
        duplicateItemIdSet.has(draft.sourceVocabularyItemId),
    ).length,
    deletedVocabularyRelationsCount: data.vocabularyRelations.filter(
      (relation) =>
        relation.personId === personId &&
        (duplicateItemIdSet.has(relation.sourceVocabularyItemId) ||
          duplicateItemIdSet.has(relation.targetVocabularyItemId)),
    ).length,
    detachedAiRunsCount: data.aiRuns.filter(
      (run) =>
        run.personId === personId &&
        run.sourceVocabularyItemId !== null &&
        duplicateItemIdSet.has(run.sourceVocabularyItemId),
    ).length,
    affectedImportBatchesCount: affectedImportBatchIds.length,
    groupsWithMultipleHistoriesCount: groups.filter(
      (group) => group.multipleCopiesHaveHistory,
    ).length,
  };
}

export function getVocabularyDeduplicationConfirmation(
  plan: VocabularyDeduplicationPlan,
): VocabularyDeduplicationConfirmation {
  return {
    fingerprint: plan.fingerprint,
    duplicateGroupsCount: plan.duplicateGroupsCount,
    deletedItemsCount: plan.deletedItemsCount,
    deletedReviewStatesCount: plan.deletedReviewStatesCount,
    deletedReviewEventsCount: plan.deletedReviewEventsCount,
    deletedAiDraftsCount: plan.deletedAiDraftsCount,
    deletedVocabularyRelationsCount: plan.deletedVocabularyRelationsCount,
    detachedAiRunsCount: plan.detachedAiRunsCount,
    affectedImportBatchesCount: plan.affectedImportBatchesCount,
    groupsWithMultipleHistoriesCount: plan.groupsWithMultipleHistoriesCount,
  };
}

export function assertVocabularyDeduplicationConfirmation(
  plan: VocabularyDeduplicationPlan,
  confirmation: VocabularyDeduplicationConfirmation,
) {
  const current = getVocabularyDeduplicationConfirmation(plan);

  if (
    (Object.keys(current) as Array<keyof VocabularyDeduplicationConfirmation>).some(
      (key) => current[key] !== confirmation[key],
    )
  ) {
    throw new Error(
      "Duplicate cleanup changed. Review the latest counts and confirm again.",
    );
  }
}

export function deduplicateVocabularyItems(
  data: VocabularyData,
  confirmation: VocabularyDeduplicationConfirmation,
  now = new Date().toISOString(),
): VocabularyDeduplicationMutationResult {
  const plan = buildVocabularyDeduplicationPlan(data);
  assertVocabularyDeduplicationConfirmation(plan, confirmation);
  const duplicateItemIds = new Set(plan.duplicateItemIds);

  return {
    ...getVocabularyDeduplicationConfirmation(plan),
    data: {
      ...data,
      items: data.items.filter(
        (item) => item.personId !== plan.personId || !duplicateItemIds.has(item.id),
      ),
      reviewStates: data.reviewStates.filter(
        (state) =>
          state.personId !== plan.personId ||
          !duplicateItemIds.has(state.vocabularyItemId),
      ),
      reviewEvents: data.reviewEvents.filter(
        (event) =>
          event.personId !== plan.personId ||
          !duplicateItemIds.has(event.vocabularyItemId),
      ),
      aiRuns: data.aiRuns.map((run) =>
        run.personId === plan.personId &&
        run.sourceVocabularyItemId !== null &&
        duplicateItemIds.has(run.sourceVocabularyItemId)
          ? { ...run, sourceVocabularyItemId: null }
          : run,
      ),
      aiEnrichmentDrafts: data.aiEnrichmentDrafts.filter(
        (draft) =>
          draft.personId !== plan.personId ||
          !duplicateItemIds.has(draft.sourceVocabularyItemId),
      ),
      vocabularyRelations: data.vocabularyRelations.filter(
        (relation) =>
          relation.personId !== plan.personId ||
          (!duplicateItemIds.has(relation.sourceVocabularyItemId) &&
            !duplicateItemIds.has(relation.targetVocabularyItemId)),
      ),
      updatedAt: now,
    },
  };
}
