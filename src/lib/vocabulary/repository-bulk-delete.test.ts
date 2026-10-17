import { describe, expect, it } from "vitest";
import { createLocalFixtureDraft } from "@/lib/ai-enrichment/repository";
import { resolveDailyStudyToday } from "@/lib/daily-study/runtime-engine";
import { recordDailyStudyReview } from "@/lib/review/repository";
import { parseJsonImport } from "./import-parser";
import {
  addPerson,
  addVocabularyItem,
  archiveVocabularyItem,
  commitImportCandidates,
  createEmptyVocabularyData,
  deleteVocabularyItem,
  deleteVocabularyItems,
  rollbackImportBatch,
  selectPerson,
} from "./repository";

const createdAt = "2026-07-15T00:00:00.000Z";
const reviewedAt = "2026-07-15T00:01:00.000Z";
const deletedAt = "2026-07-15T00:02:00.000Z";

function selectedWordsFixture() {
  let data = createEmptyVocabularyData(createdAt);
  const personId = data.selectedPersonId;
  const batches = [
    ["allocate", "coherent"],
    ["adapt", "adopt"],
    ["historical"],
  ];
  for (const [index, words] of batches.entries()) {
    const candidates = parseJsonImport(JSON.stringify({
      items: words.map((word) => ({
        word,
        meaningsZh: ["测试词义"],
        examples: [`This exercise uses the word "${word}".`],
        exampleTranslationsZh: [`这项练习使用“${word}”这个单词。`],
        track: index === 0 ? "recognition" : "active",
      })),
    }));
    data = commitImportCandidates(
      data,
      { id: `batch-${index}`, sourceType: "json_paste", fileName: null },
      candidates,
      candidates.map((candidate) => candidate.tempId),
      "Australia/Melbourne",
      createdAt,
    ).data;
  }
  data = rollbackImportBatch(data, "batch-2", createdAt).data;
  data = addVocabularyItem(data, {
    id: "manual",
    surfaceText: "clarity",
    meaningZh: "清晰",
    source: "manual",
    timezone: "Australia/Melbourne",
  }, createdAt).data;
  const ids = Object.fromEntries(data.items.map((item) => [item.surfaceText, item.id]));
  data = addPerson(data, { id: "person_friend", displayName: "Friend" }, createdAt).data;
  data = addVocabularyItem(data, {
    id: "foreign",
    surfaceText: "allocate",
    meaningZh: "分配",
    source: "manual",
    timezone: "Australia/Melbourne",
  }, createdAt).data;

  for (const selectedPersonId of ["person_friend", personId]) {
    data = selectPerson(data, selectedPersonId, createdAt);
    data = resolveDailyStudyToday(data, createdAt).data;
    for (const item of data.items.filter((candidate) => candidate.personId === selectedPersonId)) {
      const plan = data.dailyStudyPlans.find((candidate) =>
        candidate.personId === selectedPersonId && candidate.reviewProfile === item.learningTrack,
      )!;
      data = recordDailyStudyReview(data, {
        plan,
        vocabularyItemId: item.id,
        rating: "remembered",
        activityType: item.learningTrack === "active" ? "say" : "recognition_card",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        targetRevision: item.learningTrack === "active" ? `${item.id}-target` : null,
        promptId: `${item.id}-prompt`,
      }, reviewedAt).data;
      data = createLocalFixtureDraft(data, item.id, {
        additionalMeaningsZh: [],
        sourceExampleTranslationsZh: item.exampleTranslationsZh,
        examples: [],
        exampleTranslationsZh: [],
        similarWords: [],
        confusableWords: [],
      }, reviewedAt).data;
    }
  }

  data = archiveVocabularyItem(data, ids.adapt, reviewedAt);
  const pairs = [
    ["source-deleted", ids.allocate, ids.coherent, personId],
    ["target-deleted", ids.adopt, ids.adapt, personId],
    ["both-deleted", ids.allocate, ids.adapt, personId],
    ["unselected", ids.coherent, ids.adopt, personId],
    ["foreign-relation", "foreign", "foreign", "person_friend"],
  ];
  data.vocabularyRelations = pairs.map(([id, sourceVocabularyItemId, targetVocabularyItemId, owner]) => ({
    id,
    personId: owner,
    sourceVocabularyItemId,
    targetVocabularyItemId,
    relationType: "similar",
    differenceZh: "测试关系",
    examplePair: [],
    aiRunId: data.aiRuns.find((run) => run.sourceVocabularyItemId === sourceVocabularyItemId)!.id,
    createdAt,
  }));
  return { data, ids, personId };
}

describe("selected vocabulary deletion", () => {
  it("deletes selected words across batches, manual entries and archived words while retaining audits", () => {
    const { data, ids } = selectedWordsFixture();
    const original = structuredClone(data);
    const selected = [ids.allocate, ids.adapt, ids.clarity];

    const result = deleteVocabularyItems(data, selected, deletedAt);

    expect(result.deletedItemsCount).toBe(3);
    expect(result.data.items).toEqual(data.items.filter((item) => !selected.includes(item.id)));
    expect(result.data.updatedAt).toBe(deletedAt);
    expect(result.data.importBatches).toEqual(original.importBatches);
    expect(result.data.vocabularyCreationFacts).toEqual(original.vocabularyCreationFacts);
    expect(result.data.vocabularyCreationReversals).toEqual(original.vocabularyCreationReversals);
    expect(result.data.dailyStudyPlans).toEqual(original.dailyStudyPlans);
    expect(result.data.dailyStudyDefaults).toEqual(original.dailyStudyDefaults);
    expect(result.data.settingsByPerson).toEqual(original.settingsByPerson);
    expect(data).toEqual(original);
  });

  it("cleans both review profiles and AI dependencies only for the selected words", () => {
    const { data, ids } = selectedWordsFixture();
    const selected = [ids.allocate, ids.adapt];
    const result = deleteVocabularyItems(data, selected, deletedAt);

    expect(data.reviewStates.filter((state) => selected.includes(state.vocabularyItemId))
      .map((state) => state.reviewProfile).sort()).toEqual(["active", "recognition"]);
    expect(result.data.reviewStates).toEqual(data.reviewStates.filter((state) =>
      !selected.includes(state.vocabularyItemId),
    ));
    expect(result.data.reviewEvents).toEqual(data.reviewEvents.filter((event) =>
      !selected.includes(event.vocabularyItemId),
    ));
    expect(result.data.aiEnrichmentDrafts).toEqual(data.aiEnrichmentDrafts.filter((draft) =>
      !selected.includes(draft.sourceVocabularyItemId),
    ));
    expect(result.data.aiRuns).toEqual(data.aiRuns.map((run) =>
      selected.includes(run.sourceVocabularyItemId ?? "")
        ? { ...run, sourceVocabularyItemId: null }
        : run,
    ));
    expect(result.data.vocabularyRelations).toEqual(data.vocabularyRelations.filter((relation) =>
      ["unselected", "foreign-relation"].includes(relation.id),
    ));
    expect(result.data.items.find((item) => item.id === "foreign"))
      .toEqual(data.items.find((item) => item.id === "foreign"));
  });

  it("keeps import audits and creation facts even when every remaining word in a batch is selected", () => {
    const { data, personId } = selectedWordsFixture();
    const selected = data.items.filter((item) => item.personId === personId).map((item) => item.id);

    const result = deleteVocabularyItems(data, selected, deletedAt);

    expect(result.deletedItemsCount).toBe(5);
    expect(result.data.items.map((item) => item.id)).toEqual(["foreign"]);
    expect(result.data.importBatches).toEqual(data.importBatches);
    expect(result.data.vocabularyCreationFacts).toEqual(data.vocabularyCreationFacts);
    expect(result.data.vocabularyCreationReversals).toEqual(data.vocabularyCreationReversals);
  });

  it.each([
    ["empty", []],
    ["blank", ["manual", " "]],
    ["duplicate", ["manual", "manual"]],
    ["missing", ["manual", "missing"]],
    ["foreign", ["manual", "foreign"]],
    ["non-string", ["manual", null]],
    ["sparse", Array(1)],
    ["not an array", null],
  ])("rejects %s selections without changing any data", (_label, ids) => {
    const { data } = selectedWordsFixture();
    const original = structuredClone(data);

    expect(() => deleteVocabularyItems(data, ids as string[], deletedAt)).toThrow();
    expect(data).toEqual(original);
  });

  it("rejects a stale mixed selection after one word was already deleted", () => {
    const { data, ids } = selectedWordsFixture();
    const first = deleteVocabularyItems(data, [ids.allocate], deletedAt);
    const beforeRetry = structuredClone(first.data);

    expect(() => deleteVocabularyItems(first.data, [ids.adapt, ids.allocate], deletedAt))
      .toThrow("Some selected words are no longer available. Refresh Library and select them again.");
    expect(first.data).toEqual(beforeRetry);
    expect(first.data.items.some((item) => item.id === ids.adapt)).toBe(true);
  });

  it("keeps the single-word deletion result and cleanup behavior", () => {
    const { data, ids } = selectedWordsFixture();
    const single = deleteVocabularyItem(data, ids.allocate, deletedAt);
    const bulk = deleteVocabularyItems(data, [ids.allocate], deletedAt);

    expect(single.data).toEqual(bulk.data);
    expect(single.item).toEqual(data.items.find((item) => item.id === ids.allocate));
    expect(() => deleteVocabularyItem(data, "foreign", deletedAt))
      .toThrow("Vocabulary item not found: foreign");
  });
});
