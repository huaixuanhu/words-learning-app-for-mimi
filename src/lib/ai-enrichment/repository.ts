import {
  AI_OUTPUT_SCHEMA_VERSION,
  assertCompleteAiExampleTranslations,
  validateAiEnrichmentDraft,
  validateTrustedAiLexicalPayload,
} from "./contract";
import type { AiEnrichmentDraft } from "./types";
import {
  LOCAL_FIXTURE_DISCLOSURE_VERSION,
  LOCAL_FIXTURE_PROMPT_VERSION,
} from "./local-fixture-runtime";
import type {
  AiEnrichmentDraftRecord,
  AiRunRecord,
  VocabularyRelationRecord,
} from "@/lib/storage/v2-data-model";
import { findSelectedPersonVocabularyDuplicate } from "@/lib/vocabulary/context-word-actions";
import { normalizeSurfaceText, normalizeTextList } from "@/lib/vocabulary/normalize";
import { addVocabularyItem, makeId } from "@/lib/vocabulary/repository";
import type {
  LearningTrack,
  VocabularyData,
  VocabularyItem,
} from "@/lib/vocabulary/types";

function itemPayload(item: VocabularyItem) {
  return validateTrustedAiLexicalPayload({
    term: item.surfaceText,
    meaningsZh: item.meaningsZh.length
      ? item.meaningsZh
      : normalizeTextList(item.meaningZh),
    examples: item.examples.length ? item.examples : normalizeTextList(item.example),
  });
}

function localDigest(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `local-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function selectedSourceItem(data: VocabularyData, vocabularyItemId: string) {
  const item = data.items.find(
    (candidate) =>
      candidate.id === vocabularyItemId &&
      candidate.personId === data.selectedPersonId &&
      candidate.status !== "archived" &&
      candidate.archivedAt === null,
  );
  if (!item) {
    throw new Error("This word is no longer available.");
  }
  return item;
}

function sourceRun(
  data: VocabularyData,
  sourceVocabularyItemId: string,
  aiRunId: string,
) {
  const run = data.aiRuns.find(
    (candidate) =>
      candidate.id === aiRunId &&
      candidate.personId === data.selectedPersonId &&
      candidate.sourceVocabularyItemId === sourceVocabularyItemId &&
      candidate.feature === "enrichment_v1" &&
      candidate.status === "succeeded" &&
      candidate.structureValidationStatus === "valid",
  );
  if (!run) {
    throw new Error("The suggestion source is no longer valid.");
  }
  return run;
}

export function createLocalFixtureDraft(
  data: VocabularyData,
  sourceVocabularyItemId: string,
  draftValue: unknown,
  now = new Date().toISOString(),
) {
  const item = selectedSourceItem(data, sourceVocabularyItemId);
  const payload = itemPayload(item);
  const draft = validateAiEnrichmentDraft(draftValue, payload);
  const sourceHash = localDigest(payload);
  const cachedRun = data.aiRuns.find(
    (run) =>
      run.personId === item.personId &&
      run.sourceVocabularyItemId === item.id &&
      run.provider === "local-fixture" &&
      run.model === "fixture-v1" &&
      run.modelLabel === "Local preview" &&
      run.promptVersion === LOCAL_FIXTURE_PROMPT_VERSION &&
      run.outputSchemaVersion === AI_OUTPUT_SCHEMA_VERSION &&
      run.disclosureVersion === LOCAL_FIXTURE_DISCLOSURE_VERSION &&
      run.sourceHash === sourceHash &&
      run.status === "succeeded" &&
      run.structureValidationStatus === "valid",
  );
  const cachedDraft = cachedRun
    ? data.aiEnrichmentDrafts.find(
        (candidate) =>
          candidate.personId === item.personId &&
          candidate.sourceVocabularyItemId === item.id &&
          candidate.aiRunId === cachedRun.id &&
          candidate.status !== "rejected",
      )
    : null;
  if (cachedRun && cachedDraft) {
    return { data, run: cachedRun, draft: cachedDraft, cacheStatus: "cached" as const };
  }

  const runId = makeId("ai_run");
  const run: AiRunRecord = {
    id: runId,
    personId: item.personId,
    sourceVocabularyItemId: item.id,
    feature: "enrichment_v1",
    provider: "local-fixture",
    model: "fixture-v1",
    modelLabel: "Local preview",
    promptVersion: LOCAL_FIXTURE_PROMPT_VERSION,
    sourceHash,
    outputSchemaVersion: AI_OUTPUT_SCHEMA_VERSION,
    disclosureVersion: LOCAL_FIXTURE_DISCLOSURE_VERSION,
    idempotencyKeyHash: localDigest(`${runId}:idempotency`),
    cacheKeyHash: localDigest({ itemId: item.id, sourceHash, model: "fixture-v1" }),
    status: "succeeded",
    structureValidationStatus: "valid",
    providerResponseId: null,
    inputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    latencyMs: 0,
    estimatedCostUsd: 0,
    createdAt: now,
    completedAt: now,
  };
  const draftRecord: AiEnrichmentDraftRecord = {
    id: makeId("ai_draft"),
    personId: item.personId,
    sourceVocabularyItemId: item.id,
    aiRunId: run.id,
    status: "draft",
    draft,
    acceptedContent: null,
    createdAt: now,
    updatedAt: now,
    decidedAt: null,
  };

  return {
    data: {
      ...data,
      aiRuns: [run, ...data.aiRuns],
      aiEnrichmentDrafts: [draftRecord, ...data.aiEnrichmentDrafts],
      updatedAt: now,
    },
    run,
    draft: draftRecord,
    cacheStatus: "generated" as const,
  };
}

export function decideAiEnrichmentDraft(
  data: VocabularyData,
  draftId: string,
  decision: "accepted" | "rejected",
  editedContent: unknown,
  now = new Date().toISOString(),
) {
  const draftIndex = data.aiEnrichmentDrafts.findIndex(
    (candidate) =>
      candidate.id === draftId && candidate.personId === data.selectedPersonId,
  );
  if (draftIndex < 0) {
    throw new Error("This suggestion draft is no longer available.");
  }
  const current = data.aiEnrichmentDrafts[draftIndex];
  if (current.status !== "draft") {
    throw new Error("This suggestion draft was already decided.");
  }

  const item = selectedSourceItem(data, current.sourceVocabularyItemId);
  const run = sourceRun(data, item.id, current.aiRunId);
  const payload = itemPayload(item);
  if (run.sourceHash !== localDigest(payload)) {
    throw new Error("This word changed after the preview. Please create a fresh preview.");
  }
  const acceptedContent =
    decision === "accepted"
      ? assertCompleteAiExampleTranslations(
          validateAiEnrichmentDraft(editedContent, payload),
          payload.examples,
        )
      : null;
  const nextDraft: AiEnrichmentDraftRecord = {
    ...current,
    status: decision,
    acceptedContent,
    updatedAt: now,
    decidedAt: now,
  };
  const aiEnrichmentDrafts = [...data.aiEnrichmentDrafts];
  aiEnrichmentDrafts[draftIndex] = nextDraft;

  const items = acceptedContent
    ? data.items.map((candidate) =>
        candidate.id === item.id && candidate.personId === item.personId
          ? {
              ...candidate,
              exampleTranslationsZh: [
                ...(acceptedContent.sourceExampleTranslationsZh ?? []),
              ],
              updatedAt: now,
            }
          : candidate,
      )
    : data.items;

  return {
    data: { ...data, items, aiEnrichmentDrafts, updatedAt: now },
    draft: nextDraft,
  };
}

type AcceptedCandidate = Readonly<{
  word: string;
  differenceZh: string;
  relationType: VocabularyRelationRecord["relationType"];
  examplePair: readonly string[];
  examplePairTranslationsZh: readonly string[];
}>;

function acceptedCandidate(
  draft: AiEnrichmentDraft,
  candidateWord: string,
): AcceptedCandidate | null {
  const normalized = normalizeSurfaceText(candidateWord);
  const similar = draft.similarWords.find(
    (candidate) => normalizeSurfaceText(candidate.word) === normalized,
  );
  if (similar) {
    return {
      word: similar.word,
      differenceZh: similar.differenceZh,
      relationType: "similar",
      examplePair: [],
      examplePairTranslationsZh: [],
    };
  }
  const confusable = draft.confusableWords.find(
    (candidate) => normalizeSurfaceText(candidate.word) === normalized,
  );
  return confusable
    ? {
        word: confusable.word,
        differenceZh: confusable.differenceZh,
        relationType: confusable.type,
        examplePair: confusable.examplePair,
        examplePairTranslationsZh: confusable.examplePairTranslationsZh ?? [],
      }
    : null;
}

export function addAcceptedAiCandidateToLearning(
  data: VocabularyData,
  input: Readonly<{
    draftId: string;
    candidateWord: string;
    surfaceText: string;
    meaningZh: string;
    example: string;
    exampleTranslationZh?: string;
    learningTrack: LearningTrack;
    timezone: string;
  }>,
  now = new Date().toISOString(),
) {
  const draft = data.aiEnrichmentDrafts.find(
    (candidate) =>
      candidate.id === input.draftId &&
      candidate.personId === data.selectedPersonId &&
      candidate.status === "accepted" &&
      candidate.acceptedContent,
  );
  if (!draft?.acceptedContent) {
    throw new Error("Accept the preview before adding one of its suggestions.");
  }
  const sourceItem = selectedSourceItem(data, draft.sourceVocabularyItemId);
  const run = sourceRun(data, draft.sourceVocabularyItemId, draft.aiRunId);
  if (run.provider !== "local-fixture") {
    throw new Error(
      "This saved suggestion needs a fresh server check before it can be added.",
    );
  }
  if (run.sourceHash !== localDigest(itemPayload(sourceItem))) {
    throw new Error("This word changed after the preview. Please create a fresh preview.");
  }
  const candidate = acceptedCandidate(draft.acceptedContent, input.candidateWord);
  if (!candidate) {
    throw new Error("This candidate is not part of the accepted preview.");
  }
  const exampleTranslationZh = input.exampleTranslationZh?.trim() ?? "";
  if (input.example.trim() && !exampleTranslationZh) {
    throw new Error("Add a Chinese translation for the example.");
  }
  const matchesAcceptedCandidate =
    normalizeSurfaceText(input.surfaceText) === normalizeSurfaceText(candidate.word);

  let nextData = data;
  let targetItem = findSelectedPersonVocabularyDuplicate(data, input.surfaceText);
  let created = false;
  if (!targetItem) {
    const added = addVocabularyItem(
      data,
      {
        surfaceText: input.surfaceText,
        meaningZh: input.meaningZh,
        meaningsZh: normalizeTextList(input.meaningZh),
        example: input.example,
        examples: normalizeTextList(input.example),
        exampleTranslationsZh: input.example.trim()
          ? [exampleTranslationZh]
          : [],
        notes: "",
        rarityScore: null,
        learningTrack: input.learningTrack,
        tags: null,
        source: matchesAcceptedCandidate ? "ai_generated" : "manual",
        sourceActionId: matchesAcceptedCandidate ? draft.id : undefined,
        createdAt: now,
        timezone: input.timezone,
      },
      now,
    );
    nextData = added.data;
    targetItem = added.item;
    created = true;
  }

  const relationExists = nextData.vocabularyRelations.some(
    (relation) =>
      relation.personId === draft.personId &&
      relation.sourceVocabularyItemId === draft.sourceVocabularyItemId &&
      relation.targetVocabularyItemId === targetItem.id &&
      relation.relationType === candidate.relationType,
  );
  if (matchesAcceptedCandidate && !relationExists) {
    const relation: VocabularyRelationRecord = {
      id: makeId("vocabulary_relation"),
      personId: draft.personId,
      sourceVocabularyItemId: draft.sourceVocabularyItemId,
      targetVocabularyItemId: targetItem.id,
      relationType: candidate.relationType,
      differenceZh: candidate.differenceZh,
      examplePair: [...candidate.examplePair],
      aiRunId: draft.aiRunId,
      createdAt: now,
    };
    nextData = {
      ...nextData,
      vocabularyRelations: [relation, ...nextData.vocabularyRelations],
      updatedAt: now,
    };
  }

  return {
    data: nextData,
    item: targetItem,
    created,
    relationLinked: matchesAcceptedCandidate,
  };
}
