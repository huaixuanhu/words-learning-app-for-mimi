import type { VocabularyData } from "./types";
import { createEmptyVocabularyData } from "./repository";
import { normalizeReviewSettings } from "@/lib/review/settings";
import {
  normalizeLearningTrack,
  normalizeOptionalText,
  normalizeTextList,
  normalizeVocabularyTags,
} from "./normalize";
import {
  DEFAULT_PERSON_ID,
  createDefaultPerson,
  getSelectedPersonId,
} from "@/lib/people/repository";

export const VOCABULARY_STORAGE_KEY = "mimi-pte-vocabulary-v1";

type LegacyVocabularyData = {
  schemaVersion?: unknown;
  people?: unknown;
  selectedPersonId?: unknown;
  items?: unknown;
  importBatches?: unknown;
  reviewStates?: unknown;
  reviewEvents?: unknown;
  settings?: unknown;
  settingsByPerson?: unknown;
  updatedAt?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return true;
}

function migrateItem(value: unknown, personId: string) {
  if (!isObject(value)) {
    return value;
  }

  const legacyMeaning = normalizeOptionalText(typeof value.meaningZh === "string" ? value.meaningZh : "");
  const meaningsZh = normalizeTextList(
    Array.isArray(value.meaningsZh) && value.meaningsZh.length ? value.meaningsZh : legacyMeaning,
  );
  const legacyExample = normalizeOptionalText(typeof value.example === "string" ? value.example : "");
  const examples = normalizeTextList(
    Array.isArray(value.examples) && value.examples.length ? value.examples : legacyExample,
  );

  return isObject(value)
    ? {
        ...value,
        personId: typeof value.personId === "string" ? value.personId : personId,
        meaningZh: meaningsZh[0] ?? legacyMeaning,
        meaningsZh,
        example: examples[0] ?? legacyExample,
        examples,
        learningTrack: normalizeLearningTrack(value.learningTrack),
        tags: normalizeVocabularyTags(value.tags),
      }
    : value;
}

function migrateSettings(value: unknown, now: string) {
  return normalizeReviewSettings(isObject(value) ? value : undefined, now);
}

export function migrateVocabularyData(value: unknown, now = new Date().toISOString()): VocabularyData {
  if (!isObject(value)) {
    return createEmptyVocabularyData(now);
  }

  const maybeData = value as LegacyVocabularyData;
  const items = Array.isArray(maybeData.items) ? maybeData.items : [];
  const importBatches = Array.isArray(maybeData.importBatches) ? maybeData.importBatches : [];
  const reviewStates = Array.isArray(maybeData.reviewStates) ? maybeData.reviewStates : [];
  const reviewEvents = Array.isArray(maybeData.reviewEvents) ? maybeData.reviewEvents : [];
  const updatedAt = typeof maybeData.updatedAt === "string" ? maybeData.updatedAt : now;

  if (maybeData.schemaVersion === 1 || maybeData.schemaVersion === 2) {
    const person = createDefaultPerson(now);
    const settings = normalizeReviewSettings(
      isObject(maybeData.settings) ? (maybeData.settings as Partial<VocabularyData["settingsByPerson"][number]>) : undefined,
      now,
    );

    return {
      schemaVersion: 5,
      people: [person],
      selectedPersonId: person.id,
      items: items.map((item) => migrateItem(item, person.id)) as VocabularyData["items"],
      importBatches: importBatches.map((batch) =>
        isObject(batch)
          ? { ...batch, personId: typeof batch.personId === "string" ? batch.personId : person.id }
          : batch,
      ) as VocabularyData["importBatches"],
      reviewStates: reviewStates.map((state) =>
        isObject(state) ? { ...state, personId: typeof state.personId === "string" ? state.personId : person.id } : state,
      ) as VocabularyData["reviewStates"],
      reviewEvents: reviewEvents.map((event) =>
        isObject(event) ? { ...event, personId: typeof event.personId === "string" ? event.personId : person.id } : event,
      ) as VocabularyData["reviewEvents"],
      settingsByPerson: [
        {
          personId: person.id,
          ...settings,
        },
      ],
      updatedAt,
    };
  }

  if (maybeData.schemaVersion === 3 || maybeData.schemaVersion === 4 || maybeData.schemaVersion === 5) {
    const people = Array.isArray(maybeData.people) && maybeData.people.length
      ? (maybeData.people as VocabularyData["people"])
      : [createDefaultPerson(now)];
    const fallbackPersonId = people[0]?.id ?? DEFAULT_PERSON_ID;
    const selectedPersonId =
      typeof maybeData.selectedPersonId === "string" &&
      people.some((person) => person.id === maybeData.selectedPersonId)
        ? maybeData.selectedPersonId
        : fallbackPersonId;
    const migrated: VocabularyData = {
      schemaVersion: 5,
      people,
      selectedPersonId,
      items: items.map((item) => migrateItem(item, fallbackPersonId)) as VocabularyData["items"],
      importBatches: importBatches.map((batch) =>
        isObject(batch)
          ? { ...batch, personId: typeof batch.personId === "string" ? batch.personId : fallbackPersonId }
          : batch,
      ) as VocabularyData["importBatches"],
      reviewStates: reviewStates.map((state) =>
        isObject(state)
          ? { ...state, personId: typeof state.personId === "string" ? state.personId : fallbackPersonId }
          : state,
      ) as VocabularyData["reviewStates"],
      reviewEvents: reviewEvents.map((event) =>
        isObject(event)
          ? { ...event, personId: typeof event.personId === "string" ? event.personId : fallbackPersonId }
          : event,
      ) as VocabularyData["reviewEvents"],
      settingsByPerson: Array.isArray(maybeData.settingsByPerson)
        ? maybeData.settingsByPerson
            .filter(isObject)
            .map((settings) => ({
              personId: typeof settings.personId === "string" ? settings.personId : fallbackPersonId,
              ...migrateSettings(settings, now),
            }))
        : [],
      updatedAt,
    };
    const selectedId = getSelectedPersonId(migrated);
    const existingSettings = new Set(migrated.settingsByPerson.map((settings) => settings.personId));
    const missingSettings = migrated.people
      .filter((person) => !existingSettings.has(person.id))
      .map((person) => ({
        personId: person.id,
        ...normalizeReviewSettings(undefined, now),
      }));

    return {
      ...migrated,
      selectedPersonId: selectedId,
      settingsByPerson: [...migrated.settingsByPerson, ...missingSettings],
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
