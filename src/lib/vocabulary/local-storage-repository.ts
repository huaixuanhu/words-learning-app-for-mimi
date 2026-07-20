import type { VocabularyData } from "./types";
import {
  createDailyStudyDefaults,
  createEmptyVocabularyData,
} from "./repository";
import { normalizeReviewSettings } from "@/lib/review/settings";
import { RECOGNITION_PARAMETER_SET_ID } from "@/lib/review/types";
import {
  normalizeLearningTrack,
  normalizeOptionalText,
  normalizeTextList,
  normalizeVocabularyTags,
} from "./normalize";
import { alignExampleTranslationsZh } from "./example-pairs";
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
  dailyStudyDefaults?: unknown;
  dailyStudyPlans?: unknown;
  vocabularyCreationFacts?: unknown;
  vocabularyCreationReversals?: unknown;
  aiRuns?: unknown;
  aiEnrichmentDrafts?: unknown;
  vocabularyRelations?: unknown;
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
        exampleTranslationsZh: alignExampleTranslationsZh(
          examples,
          value.exampleTranslationsZh,
        ),
        learningTrack: normalizeLearningTrack(value.learningTrack),
        tags: normalizeVocabularyTags(value.tags),
      }
    : value;
}

function migrateSettings(value: unknown, now: string) {
  return normalizeReviewSettings(isObject(value) ? value : undefined, now);
}

function migrateReviewEvent(value: unknown, personId: string) {
  if (!isObject(value)) {
    return value;
  }

  const reviewProfile = value.reviewProfile === "active" ? "active" : "recognition";

  return {
    ...value,
    personId: typeof value.personId === "string" ? value.personId : personId,
    promptId: typeof value.promptId === "string" ? value.promptId : null,
    reviewProfile,
    activityType:
      typeof value.activityType === "string" ? value.activityType : "recognition_card",
    answerOutcome:
      typeof value.answerOutcome === "string" ? value.answerOutcome : "self_rated",
    answerNormalizationVersion:
      typeof value.answerNormalizationVersion === "string"
        ? value.answerNormalizationVersion
        : null,
    targetRevision:
      typeof value.targetRevision === "string" ? value.targetRevision : null,
    parameterSetId:
      typeof value.parameterSetId === "string" && value.parameterSetId.trim()
        ? value.parameterSetId
        : RECOGNITION_PARAMETER_SET_ID,
  };
}

function firstEventByItem(events: VocabularyData["reviewEvents"]) {
  const earliest = new Map<string, string>();

  for (const event of events) {
    const key = `${event.personId}\u0000${event.vocabularyItemId}\u0000${event.reviewProfile}`;
    const current = earliest.get(key);

    if (!current || event.reviewedAt < current) {
      earliest.set(key, event.reviewedAt);
    }
  }

  return earliest;
}

function migrateReviewState(
  value: unknown,
  personId: string,
  earliestEvents: Map<string, string>,
) {
  if (!isObject(value)) {
    return value;
  }

  const resolvedPersonId = typeof value.personId === "string" ? value.personId : personId;
  const reviewProfile = value.reviewProfile === "active" ? "active" : "recognition";
  const vocabularyItemId =
    typeof value.vocabularyItemId === "string" ? value.vocabularyItemId : "";
  const eventKey = `${resolvedPersonId}\u0000${vocabularyItemId}\u0000${reviewProfile}`;
  const firstRatedAt =
    typeof value.firstRatedAt === "string"
      ? value.firstRatedAt
      : earliestEvents.get(eventKey) ?? null;

  return {
    ...value,
    personId: resolvedPersonId,
    reviewProfile,
    parameterSetId:
      typeof value.parameterSetId === "string" && value.parameterSetId.trim()
        ? value.parameterSetId
        : RECOGNITION_PARAMETER_SET_ID,
    firstRatedAt,
    historyOrigin: firstRatedAt ? "recorded" : "legacy_unknown",
  };
}

function createLegacyCreationFacts(items: VocabularyData["items"]) {
  return items.map((item) => ({
    creationFactId: `creation_fact_legacy_${item.id}`,
    personId: item.personId,
    originalVocabularyItemId: item.id,
    sourceActionId: item.importBatchId ?? item.id,
    trackAtCreation: item.learningTrack,
    sourceKind: item.importBatchId ? ("batch" as const) : ("single" as const),
    historyOrigin: "legacy_backfill" as const,
    systemCreatedAt: item.systemCreatedAt,
  }));
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

  if (
    maybeData.schemaVersion === 1 ||
    maybeData.schemaVersion === 2 ||
    maybeData.schemaVersion === 3 ||
    maybeData.schemaVersion === 4 ||
    maybeData.schemaVersion === 5 ||
    maybeData.schemaVersion === 6
  ) {
    const isSinglePersonLegacy = maybeData.schemaVersion === 1 || maybeData.schemaVersion === 2;
    const people = isSinglePersonLegacy
      ? [createDefaultPerson(now)]
      : Array.isArray(maybeData.people) && maybeData.people.length
        ? (maybeData.people as VocabularyData["people"])
        : [createDefaultPerson(now)];
    const fallbackPersonId = people[0]?.id ?? DEFAULT_PERSON_ID;
    const selectedPersonId =
      !isSinglePersonLegacy &&
      typeof maybeData.selectedPersonId === "string" &&
      people.some((person) => person.id === maybeData.selectedPersonId)
        ? maybeData.selectedPersonId
        : fallbackPersonId;
    const migratedItems = items.map((item) =>
      migrateItem(item, fallbackPersonId),
    ) as VocabularyData["items"];
    const migratedEvents = reviewEvents.map((event) =>
      migrateReviewEvent(event, fallbackPersonId),
    ) as VocabularyData["reviewEvents"];
    const earliestEvents = firstEventByItem(migratedEvents);
    const migratedStates = reviewStates.map((state) =>
      migrateReviewState(state, fallbackPersonId, earliestEvents),
    ) as VocabularyData["reviewStates"];
    const legacySettings = isSinglePersonLegacy
      ? [
          {
            personId: fallbackPersonId,
            ...migrateSettings(maybeData.settings, now),
          },
        ]
      : Array.isArray(maybeData.settingsByPerson)
        ? maybeData.settingsByPerson
            .filter(isObject)
            .map((settings) => ({
              personId:
                typeof settings.personId === "string" ? settings.personId : fallbackPersonId,
              ...migrateSettings(settings, now),
            }))
        : [];
    const existingSettings = new Set(legacySettings.map((settings) => settings.personId));
    const settingsByPerson = [
      ...legacySettings,
      ...people
        .filter((person) => !existingSettings.has(person.id))
        .map((person) => ({
          personId: person.id,
          ...normalizeReviewSettings(undefined, now),
        })),
    ];
    const defaultRows = settingsByPerson.flatMap((settings) =>
      createDailyStudyDefaults(settings.personId, settings),
    );
    const hasSchema6Collections = maybeData.schemaVersion === 6;
    const migrated: VocabularyData = {
      schemaVersion: 6,
      people,
      selectedPersonId,
      items: migratedItems,
      importBatches: importBatches.map((batch) =>
        isObject(batch)
          ? {
              ...batch,
              personId:
                typeof batch.personId === "string" ? batch.personId : fallbackPersonId,
            }
          : batch,
      ) as VocabularyData["importBatches"],
      reviewStates: migratedStates,
      reviewEvents: migratedEvents,
      settingsByPerson,
      dailyStudyDefaults:
        hasSchema6Collections && Array.isArray(maybeData.dailyStudyDefaults)
          ? (maybeData.dailyStudyDefaults as VocabularyData["dailyStudyDefaults"])
          : defaultRows,
      dailyStudyPlans:
        hasSchema6Collections && Array.isArray(maybeData.dailyStudyPlans)
          ? (maybeData.dailyStudyPlans as VocabularyData["dailyStudyPlans"])
          : [],
      vocabularyCreationFacts:
        hasSchema6Collections && Array.isArray(maybeData.vocabularyCreationFacts)
          ? (maybeData.vocabularyCreationFacts as VocabularyData["vocabularyCreationFacts"])
          : createLegacyCreationFacts(migratedItems),
      vocabularyCreationReversals:
        hasSchema6Collections && Array.isArray(maybeData.vocabularyCreationReversals)
          ? (maybeData.vocabularyCreationReversals as VocabularyData["vocabularyCreationReversals"])
          : [],
      aiRuns:
        hasSchema6Collections && Array.isArray(maybeData.aiRuns)
          ? (maybeData.aiRuns as VocabularyData["aiRuns"])
          : [],
      aiEnrichmentDrafts:
        hasSchema6Collections && Array.isArray(maybeData.aiEnrichmentDrafts)
          ? (maybeData.aiEnrichmentDrafts as VocabularyData["aiEnrichmentDrafts"])
          : [],
      vocabularyRelations:
        hasSchema6Collections && Array.isArray(maybeData.vocabularyRelations)
          ? (maybeData.vocabularyRelations as VocabularyData["vocabularyRelations"])
          : [],
      updatedAt,
    };

    return {
      ...migrated,
      selectedPersonId: getSelectedPersonId(migrated),
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
}
