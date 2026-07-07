import type {
  ImportBatch,
  ImportBatchInput,
  ImportCandidate,
  ImportCommitResult,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
  VocabularyItem,
  Person,
} from "./types";
import { createDefaultReviewSettings } from "@/lib/review/settings";
import {
  buildPerson,
  createDefaultPerson,
  getSelectedPersonId,
  type NewPersonInput,
} from "@/lib/people/repository";
import {
  cleanSurfaceText,
  normalizeOptionalText,
  normalizeLearningTrack,
  normalizeRarityScore,
  normalizeSurfaceText,
  normalizeTextList,
  normalizeVocabularyTags,
} from "./normalize";

export const VOCABULARY_SCHEMA_VERSION = 5;

export function createEmptyVocabularyData(now = new Date().toISOString()): VocabularyData {
  const person = createDefaultPerson(now);

  return {
    schemaVersion: VOCABULARY_SCHEMA_VERSION,
    people: [person],
    selectedPersonId: person.id,
    items: [],
    importBatches: [],
    reviewStates: [],
    reviewEvents: [],
    settingsByPerson: [
      {
        personId: person.id,
        ...createDefaultReviewSettings(now),
      },
    ],
    updatedAt: now,
  };
}

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getActiveVocabularyItems(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return data.items.filter(
    (item) => item.personId === personId && !item.archivedAt && item.status !== "archived",
  );
}

export function getRecognitionVocabularyItems(data: VocabularyData) {
  return getActiveVocabularyItems(data).filter((item) => item.learningTrack === "recognition");
}

export function getActiveTrackVocabularyItems(data: VocabularyData) {
  return getActiveVocabularyItems(data).filter((item) => item.learningTrack === "active");
}

export function getArchivedVocabularyItems(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return data.items.filter(
    (item) => item.personId === personId && (item.archivedAt || item.status === "archived"),
  );
}

export function getExistingNormalizedTexts(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return new Set(
    data.items.filter((item) => item.personId === personId).map((item) => item.normalizedText),
  );
}

export function getVocabularyItemsForSelectedPerson(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return data.items.filter((item) => item.personId === personId);
}

function buildMeaningFields(input: { meaningZh?: string; meaningsZh?: string[] }) {
  const legacyMeaning = normalizeOptionalText(input.meaningZh);
  const meaningsZh = normalizeTextList(input.meaningsZh?.length ? input.meaningsZh : legacyMeaning);

  return {
    meaningZh: meaningsZh[0] ?? legacyMeaning,
    meaningsZh,
  };
}

function buildExampleFields(input: { example?: string; examples?: string[] }) {
  const legacyExample = normalizeOptionalText(input.example);
  const examples = normalizeTextList(input.examples?.length ? input.examples : legacyExample);

  return {
    example: examples[0] ?? legacyExample,
    examples,
  };
}

export function buildVocabularyItem(input: NewVocabularyInput, now = new Date().toISOString()): VocabularyItem {
  const surfaceText = cleanSurfaceText(input.surfaceText);
  const meaningFields = buildMeaningFields(input);
  const exampleFields = buildExampleFields(input);

  if (!surfaceText) {
    throw new Error("surfaceText is required");
  }

  return {
    id: input.id ?? makeId("vocab"),
    personId: input.personId ?? "",
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    ...meaningFields,
    ...exampleFields,
    notes: normalizeOptionalText(input.notes),
    rarityScore: normalizeRarityScore(input.rarityScore),
    learningTrack: normalizeLearningTrack(input.learningTrack),
    tags: normalizeVocabularyTags(input.tags),
    source: input.source,
    importBatchId: input.importBatchId ?? null,
    status: "new",
    createdAt: input.createdAt ?? now,
    systemCreatedAt: input.systemCreatedAt ?? now,
    updatedAt: input.updatedAt ?? now,
    timezone: input.timezone,
    archivedAt: null,
  };
}

export function addVocabularyItem(
  data: VocabularyData,
  input: NewVocabularyInput,
  now = new Date().toISOString(),
) {
  const personId = input.personId ?? getSelectedPersonId(data);
  const item = buildVocabularyItem({ ...input, personId }, now);

  return {
    data: {
      ...data,
      items: [item, ...data.items],
      updatedAt: now,
    },
    item,
  };
}

export function updateVocabularyItem(
  data: VocabularyData,
  id: string,
  input: UpdateVocabularyInput,
  now = new Date().toISOString(),
) {
  const itemIndex = data.items.findIndex((item) => item.id === id);
  const selectedPersonId = getSelectedPersonId(data);

  if (itemIndex === -1 || data.items[itemIndex].personId !== selectedPersonId) {
    throw new Error(`Vocabulary item not found: ${id}`);
  }

  const currentItem = data.items[itemIndex];
  const surfaceText =
    input.surfaceText === undefined ? currentItem.surfaceText : cleanSurfaceText(input.surfaceText);
  const meaningFields =
    input.meaningZh === undefined && input.meaningsZh === undefined
      ? {
          meaningZh: currentItem.meaningZh,
          meaningsZh: currentItem.meaningsZh,
        }
      : buildMeaningFields({
          meaningZh: input.meaningZh,
          meaningsZh: input.meaningsZh,
        });
  const exampleFields =
    input.example === undefined && input.examples === undefined
      ? {
          example: currentItem.example,
          examples: currentItem.examples,
        }
      : buildExampleFields({
          example: input.example,
          examples: input.examples,
        });

  if (!surfaceText) {
    throw new Error("surfaceText is required");
  }

  const updatedItem: VocabularyItem = {
    ...currentItem,
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    ...meaningFields,
    ...exampleFields,
    notes: input.notes === undefined ? currentItem.notes : normalizeOptionalText(input.notes),
    rarityScore:
      input.rarityScore === undefined ? currentItem.rarityScore : normalizeRarityScore(input.rarityScore),
    learningTrack:
      input.learningTrack === undefined ? currentItem.learningTrack : normalizeLearningTrack(input.learningTrack),
    tags: input.tags === undefined ? currentItem.tags : normalizeVocabularyTags(input.tags),
    createdAt: input.createdAt ?? currentItem.createdAt,
    timezone: input.timezone ?? currentItem.timezone,
    updatedAt: now,
  };
  const items = data.items.map((item) => (item.id === id ? updatedItem : item));

  return {
    data: {
      ...data,
      items,
      updatedAt: now,
    },
    item: updatedItem,
  };
}

export function archiveVocabularyItem(data: VocabularyData, id: string, now = new Date().toISOString()) {
  const selectedPersonId = getSelectedPersonId(data);

  return {
    ...data,
    items: data.items.map((item) =>
      item.id === id && item.personId === selectedPersonId
        ? {
            ...item,
            status: "archived" as const,
            archivedAt: item.archivedAt ?? now,
            updatedAt: now,
          }
        : item,
    ),
    updatedAt: now,
  };
}

export function restoreVocabularyItem(data: VocabularyData, id: string, now = new Date().toISOString()) {
  const selectedPersonId = getSelectedPersonId(data);

  return {
    ...data,
    items: data.items.map((item) =>
      item.id === id && item.personId === selectedPersonId
        ? {
            ...item,
            status: "new" as const,
            archivedAt: null,
            updatedAt: now,
          }
        : item,
    ),
    updatedAt: now,
  };
}

export function commitImportCandidates(
  data: VocabularyData,
  batchInput: ImportBatchInput,
  candidates: ImportCandidate[],
  acceptedTempIds: Iterable<string>,
  timezone: string,
  now = new Date().toISOString(),
): ImportCommitResult {
  const personId = batchInput.personId ?? getSelectedPersonId(data);
  const acceptedIds = new Set(acceptedTempIds);
  const acceptedCandidates = candidates.filter(
    (candidate) => acceptedIds.has(candidate.tempId) && candidate.status !== "invalid",
  );
  const batch: ImportBatch = {
    id: batchInput.id ?? makeId("batch"),
    personId,
    sourceType: batchInput.sourceType,
    fileName: batchInput.fileName ?? null,
    createdAt: now,
    totalRows: candidates.length,
    acceptedRows: acceptedCandidates.length,
    duplicateRows: candidates.filter((candidate) => candidate.status === "duplicate").length,
    invalidRows: candidates.filter((candidate) => candidate.status === "invalid").length,
  };
  const items = acceptedCandidates.map((candidate) =>
    buildVocabularyItem(
      {
        surfaceText: candidate.surfaceText,
        meaningZh: candidate.meaningZh,
        meaningsZh: candidate.meaningsZh,
        example: candidate.example,
        examples: candidate.examples,
        notes: candidate.notes,
        rarityScore: candidate.rarityScore,
        learningTrack: candidate.learningTrack,
        tags: candidate.tags,
        source: batch.sourceType,
        importBatchId: batch.id,
        personId,
        timezone,
      },
      now,
    ),
  );

  return {
    data: {
      ...data,
      importBatches: [batch, ...data.importBatches],
      items: [...items, ...data.items],
      updatedAt: now,
    },
    batch,
    items,
  };
}

export function selectPerson(data: VocabularyData, personId: string, now = new Date().toISOString()) {
  if (!data.people.some((person) => person.id === personId && person.isActive)) {
    throw new Error(`Person not found: ${personId}`);
  }

  return {
    ...data,
    selectedPersonId: personId,
    updatedAt: now,
  };
}

export function addPerson(
  data: VocabularyData,
  input: NewPersonInput,
  now = new Date().toISOString(),
): { data: VocabularyData; person: Person } {
  const person = buildPerson(input, data.people, now);

  return {
    data: {
      ...data,
      people: [person, ...data.people],
      selectedPersonId: person.id,
      settingsByPerson: [
        {
          personId: person.id,
          ...createDefaultReviewSettings(now),
        },
        ...data.settingsByPerson,
      ],
      updatedAt: now,
    },
    person,
  };
}
