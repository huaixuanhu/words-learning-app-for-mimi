import type { VocabularyData } from "./types";
import { createEmptyVocabularyData } from "./repository";
import { normalizeReviewSettings } from "@/lib/review/settings";

export const VOCABULARY_STORAGE_KEY = "mimi-pte-vocabulary-v1";

type LegacyVocabularyData = {
  schemaVersion?: unknown;
  items?: unknown;
  importBatches?: unknown;
  reviewStates?: unknown;
  reviewEvents?: unknown;
  settings?: unknown;
  updatedAt?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return true;
}

export function migrateVocabularyData(value: unknown, now = new Date().toISOString()): VocabularyData {
  if (!isObject(value)) {
    return createEmptyVocabularyData(now);
  }

  const maybeData = value as LegacyVocabularyData;
  const items = Array.isArray(maybeData.items) ? maybeData.items : [];
  const importBatches = Array.isArray(maybeData.importBatches) ? maybeData.importBatches : [];
  const updatedAt = typeof maybeData.updatedAt === "string" ? maybeData.updatedAt : now;

  if (maybeData.schemaVersion === 1 || maybeData.schemaVersion === 2) {
    return {
      schemaVersion: 2,
      items: items as VocabularyData["items"],
      importBatches: importBatches as VocabularyData["importBatches"],
      reviewStates: Array.isArray(maybeData.reviewStates)
        ? (maybeData.reviewStates as VocabularyData["reviewStates"])
        : [],
      reviewEvents: Array.isArray(maybeData.reviewEvents)
        ? (maybeData.reviewEvents as VocabularyData["reviewEvents"])
        : [],
      settings: normalizeReviewSettings(
        isObject(maybeData.settings) ? (maybeData.settings as Partial<VocabularyData["settings"]>) : undefined,
        now,
      ),
      updatedAt,
    };
  }

  return createEmptyVocabularyData(now);
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

    return migrateVocabularyData(parsed);
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
