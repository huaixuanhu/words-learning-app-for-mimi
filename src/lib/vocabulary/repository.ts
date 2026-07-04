import type {
  ImportBatch,
  ImportBatchInput,
  ImportCandidate,
  ImportCommitResult,
  NewVocabularyInput,
  UpdateVocabularyInput,
  VocabularyData,
  VocabularyItem,
} from "./types";
import { createDefaultReviewSettings } from "@/lib/review/settings";
import {
  cleanSurfaceText,
  normalizeOptionalText,
  normalizeRarityScore,
  normalizeSurfaceText,
} from "./normalize";

export const VOCABULARY_SCHEMA_VERSION = 2;

export function createEmptyVocabularyData(now = new Date().toISOString()): VocabularyData {
  return {
    schemaVersion: VOCABULARY_SCHEMA_VERSION,
    items: [],
    importBatches: [],
    reviewStates: [],
    reviewEvents: [],
    settings: createDefaultReviewSettings(now),
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
  return data.items.filter((item) => !item.archivedAt && item.status !== "archived");
}

export function getArchivedVocabularyItems(data: VocabularyData) {
  return data.items.filter((item) => item.archivedAt || item.status === "archived");
}

export function getExistingNormalizedTexts(data: VocabularyData) {
  return new Set(data.items.map((item) => item.normalizedText));
}

export function buildVocabularyItem(input: NewVocabularyInput, now = new Date().toISOString()): VocabularyItem {
  const surfaceText = cleanSurfaceText(input.surfaceText);

  if (!surfaceText) {
    throw new Error("surfaceText is required");
  }

  return {
    id: input.id ?? makeId("vocab"),
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    meaningZh: normalizeOptionalText(input.meaningZh),
    example: normalizeOptionalText(input.example),
    notes: normalizeOptionalText(input.notes),
    rarityScore: normalizeRarityScore(input.rarityScore),
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
  const item = buildVocabularyItem(input, now);

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

  if (itemIndex === -1) {
    throw new Error(`Vocabulary item not found: ${id}`);
  }

  const currentItem = data.items[itemIndex];
  const surfaceText =
    input.surfaceText === undefined ? currentItem.surfaceText : cleanSurfaceText(input.surfaceText);

  if (!surfaceText) {
    throw new Error("surfaceText is required");
  }

  const updatedItem: VocabularyItem = {
    ...currentItem,
    surfaceText,
    normalizedText: normalizeSurfaceText(surfaceText),
    meaningZh:
      input.meaningZh === undefined ? currentItem.meaningZh : normalizeOptionalText(input.meaningZh),
    example: input.example === undefined ? currentItem.example : normalizeOptionalText(input.example),
    notes: input.notes === undefined ? currentItem.notes : normalizeOptionalText(input.notes),
    rarityScore:
      input.rarityScore === undefined ? currentItem.rarityScore : normalizeRarityScore(input.rarityScore),
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
  return {
    ...data,
    items: data.items.map((item) =>
      item.id === id
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
  return {
    ...data,
    items: data.items.map((item) =>
      item.id === id
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
  const acceptedIds = new Set(acceptedTempIds);
  const acceptedCandidates = candidates.filter(
    (candidate) => acceptedIds.has(candidate.tempId) && candidate.status !== "invalid",
  );
  const batch: ImportBatch = {
    id: batchInput.id ?? makeId("batch"),
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
        example: candidate.example,
        notes: "",
        rarityScore: candidate.rarityScore,
        source: batch.sourceType === "txt_file" ? "txt_file" : "pasted_text",
        importBatchId: batch.id,
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
