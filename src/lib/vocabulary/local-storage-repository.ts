import type { VocabularyData } from "./types";
import { createEmptyVocabularyData } from "./repository";

export const VOCABULARY_STORAGE_KEY = "mimi-pte-vocabulary-v1";

function isVocabularyData(value: unknown): value is VocabularyData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeData = value as Partial<VocabularyData>;

  return maybeData.schemaVersion === 1 && Array.isArray(maybeData.items) && Array.isArray(maybeData.importBatches);
}

export function readVocabularyData() {
  if (typeof window === "undefined") {
    return createEmptyVocabularyData();
  }

  const raw = window.localStorage.getItem(VOCABULARY_STORAGE_KEY);

  if (!raw) {
    return createEmptyVocabularyData();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isVocabularyData(parsed)) {
      return parsed;
    }
  } catch {
    return createEmptyVocabularyData();
  }

  return createEmptyVocabularyData();
}

export function writeVocabularyData(data: VocabularyData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("mimi-vocabulary-data-changed"));
}
