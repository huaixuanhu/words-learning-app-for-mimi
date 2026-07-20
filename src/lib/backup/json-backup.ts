import { migrateVocabularyData } from "@/lib/vocabulary/local-storage-repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { getSelectedReviewSettings } from "@/lib/review/settings";
import {
  validateStoredAiEnrichmentDraft,
} from "@/lib/ai-enrichment/contract";
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCounts,
  type BackupParseResult,
  type VocabularyBackupFile,
} from "./types";
import { alignExampleTranslationsZh } from "@/lib/vocabulary/example-pairs";

const VOCABULARY_SOURCES = new Set([
  "manual",
  "txt_file",
  "pasted_text",
  "json_file",
  "json_paste",
  "ai_generated",
]);
const VOCABULARY_STATUSES = new Set(["new", "archived"]);
const IMPORT_SOURCE_TYPES = new Set(["txt_file", "pasted_text", "json_file", "json_paste"]);
const LEARNING_TRACKS = new Set(["recognition", "active"]);
const VOCABULARY_TAGS = new Set(["PTE", "IELTS", "Listening", "Writing", "Spelling Risk"]);
const REVIEW_STATUSES = new Set(["learning", "review"]);
const REVIEW_RATINGS = new Set(["forgot", "hard", "vague", "remembered"]);
const REVIEW_PROFILES = new Set(["recognition", "active"]);
const REVIEW_ACTIVITY_TYPES = new Set(["recognition_card", "say", "spell", "dictation"]);
const ANSWER_OUTCOMES = new Set([
  "self_rated",
  "exact",
  "normalized_match",
  "different",
  "revealed_without_answer",
]);
const CREATION_SOURCE_KINDS = new Set(["single", "batch", "ai_add_to_learning"]);
const AI_RUN_STATUSES = new Set(["submitted", "succeeded", "rejected", "failed"]);
const AI_STRUCTURE_STATUSES = new Set(["pending", "valid", "invalid", "unavailable"]);
const VOCABULARY_RELATION_TYPES = new Set(["similar", "spelling", "sound", "usage"]);
const MAX_DATABASE_INTEGER = 2_147_483_647;

type BackupOptions = {
  exportedAt?: string;
  timezone?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isStringArrayOrNull(value: unknown): value is string[] | null {
  return value === null || (Array.isArray(value) && value.every((entry) => typeof entry === "string"));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidDateString(value: unknown): value is string {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function isValidLocalDate(value: unknown): value is string {
  if (!isString(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateDateField(
  value: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
) {
  if (!isValidDateString(value[key])) {
    errors.push(`${label}.${key} must be a valid date string`);
  }
}

export function summarizeVocabularyData(data: VocabularyData): BackupCounts {
  const archivedItems = data.items.filter(
    (item) => item.status === "archived" || Boolean(item.archivedAt),
  ).length;

  return {
    people: data.people.length,
    items: data.items.length,
    activeItems: data.items.length - archivedItems,
    archivedItems,
    importBatches: data.importBatches.length,
    reviewStates: data.reviewStates.length,
    reviewEvents: data.reviewEvents.length,
    dailyStudyDefaults: data.dailyStudyDefaults.length,
    dailyStudyPlans: data.dailyStudyPlans.length,
    vocabularyCreationFacts: data.vocabularyCreationFacts.length,
    vocabularyCreationReversals: data.vocabularyCreationReversals.length,
    aiRuns: data.aiRuns.length,
    aiEnrichmentDrafts: data.aiEnrichmentDrafts.length,
    vocabularyRelations: data.vocabularyRelations.length,
  };
}

export function selectFormalBackupData(data: VocabularyData): VocabularyData {
  const eligibleEnrichmentRunIds = new Set(
    data.aiRuns
      .filter(
        (run) =>
          run.feature === "enrichment_v1" &&
          run.status === "succeeded" &&
          run.structureValidationStatus === "valid",
      )
      .map((run) => run.id),
  );
  const acceptedDrafts = data.aiEnrichmentDrafts
    .filter(
      (draft) =>
        draft.status === "accepted" &&
        draft.acceptedContent &&
        eligibleEnrichmentRunIds.has(draft.aiRunId),
    )
    .map((draft) => ({
      ...draft,
      status: "accepted" as const,
      draft: draft.acceptedContent!,
    }));
  const acceptedRelations = data.vocabularyRelations.filter((relation) =>
    eligibleEnrichmentRunIds.has(relation.aiRunId),
  );
  const referencedRunIds = new Set([
    ...acceptedDrafts.map((draft) => draft.aiRunId),
    ...acceptedRelations.map((relation) => relation.aiRunId),
  ]);

  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      exampleTranslationsZh: alignExampleTranslationsZh(
        item.examples,
        item.exampleTranslationsZh,
      ),
    })),
    aiRuns: data.aiRuns.filter(
      (run) => eligibleEnrichmentRunIds.has(run.id) && referencedRunIds.has(run.id),
    ),
    aiEnrichmentDrafts: acceptedDrafts,
    vocabularyRelations: acceptedRelations,
  };
}

export function createVocabularyBackup(
  data: VocabularyData,
  options: BackupOptions = {},
): VocabularyBackupFile {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const timezone = options.timezone ?? getSelectedReviewSettings(data).timezone;
  const formalData = selectFormalBackupData(data);

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt,
      timezone,
      schemaVersion: formalData.schemaVersion,
      counts: summarizeVocabularyData(formalData),
    },
    data: formalData,
  };
}

export function serializeVocabularyBackup(data: VocabularyData, options: BackupOptions = {}) {
  return JSON.stringify(createVocabularyBackup(data, options), null, 2);
}

function validatePerson(value: unknown, index: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`people[${index}] must be an object`);
    return;
  }

  for (const key of ["id", "displayName", "slug", "createdAt", "updatedAt"]) {
    if (!isString(value[key])) {
      errors.push(`people[${index}].${key} must be a string`);
    }
  }

  if (typeof value.isActive !== "boolean") {
    errors.push(`people[${index}].isActive must be a boolean`);
  }
}

function validateVocabularyItem(
  value: unknown,
  index: number,
  errors: string[],
  requiresPersonId: boolean,
  requiresTrackFields: boolean,
  requiresTextListFields: boolean,
  requiresBilingualExamples: boolean,
) {
  if (!isRecord(value)) {
    errors.push(`items[${index}] must be an object`);
    return;
  }

  const requiredStrings = [
    ...(requiresPersonId ? ["personId"] : []),
    "id",
    "surfaceText",
    "normalizedText",
    "meaningZh",
    "example",
    "notes",
    "createdAt",
    "systemCreatedAt",
    "updatedAt",
    "timezone",
  ];

  for (const key of requiredStrings) {
    if (!isString(value[key])) {
      errors.push(`items[${index}].${key} must be a string`);
    }
  }

  if (!VOCABULARY_SOURCES.has(String(value.source))) {
    errors.push(`items[${index}].source is unsupported`);
  }

  if (!VOCABULARY_STATUSES.has(String(value.status))) {
    errors.push(`items[${index}].status is unsupported`);
  }

  if (requiresTrackFields) {
    if (!LEARNING_TRACKS.has(String(value.learningTrack))) {
      errors.push(`items[${index}].learningTrack is unsupported`);
    }

    if (!isStringArrayOrNull(value.tags)) {
      errors.push(`items[${index}].tags must be an array or null`);
    } else if (Array.isArray(value.tags)) {
      value.tags.forEach((tag) => {
        if (!VOCABULARY_TAGS.has(tag)) {
          errors.push(`items[${index}].tags contains unsupported tag`);
        }
      });
    }
  }

  if (requiresTextListFields) {
    if (!isStringArray(value.meaningsZh)) {
      errors.push(`items[${index}].meaningsZh must be an array`);
    }

    if (!isStringArray(value.examples)) {
      errors.push(`items[${index}].examples must be an array`);
    }

    if (requiresBilingualExamples) {
      if (!isStringArray(value.exampleTranslationsZh)) {
        errors.push(
          `items[${index}].exampleTranslationsZh must be an array`,
        );
      } else if (
        Array.isArray(value.examples) &&
        value.exampleTranslationsZh.length !== value.examples.length
      ) {
        errors.push(
          `items[${index}].exampleTranslationsZh must align with examples`,
        );
      }
    }
  }

  if (!isStringOrNull(value.importBatchId)) {
    errors.push(`items[${index}].importBatchId must be a string or null`);
  }

  if (!isStringOrNull(value.archivedAt)) {
    errors.push(`items[${index}].archivedAt must be a string or null`);
  }

  if (!isNumberOrNull(value.rarityScore)) {
    errors.push(`items[${index}].rarityScore must be a number or null`);
  }
}

function validateImportBatch(
  value: unknown,
  index: number,
  errors: string[],
  requiresPersonId: boolean,
) {
  if (!isRecord(value)) {
    errors.push(`importBatches[${index}] must be an object`);
    return;
  }

  for (const key of [...(requiresPersonId ? ["personId"] : []), "id", "createdAt"]) {
    if (!isString(value[key])) {
      errors.push(`importBatches[${index}].${key} must be a string`);
    }
  }

  if (!IMPORT_SOURCE_TYPES.has(String(value.sourceType))) {
    errors.push(`importBatches[${index}].sourceType is unsupported`);
  }

  if (!isStringOrNull(value.fileName)) {
    errors.push(`importBatches[${index}].fileName must be a string or null`);
  }

  for (const key of ["totalRows", "acceptedRows", "duplicateRows", "invalidRows"]) {
    if (!isNumber(value[key])) {
      errors.push(`importBatches[${index}].${key} must be a number`);
    }
  }
}

function validateReviewState(
  value: unknown,
  index: number,
  errors: string[],
  requiresPersonId: boolean,
  requiresV2Fields: boolean,
) {
  if (!isRecord(value)) {
    errors.push(`reviewStates[${index}] must be an object`);
    return;
  }

  for (const key of [...(requiresPersonId ? ["personId"] : []), "id", "vocabularyItemId", "dueAt", "updatedAt"]) {
    if (!isString(value[key])) {
      errors.push(`reviewStates[${index}].${key} must be a string`);
    }
  }

  if (!REVIEW_STATUSES.has(String(value.status))) {
    errors.push(`reviewStates[${index}].status is unsupported`);
  }

  if (!isStringOrNull(value.lastReviewedAt)) {
    errors.push(`reviewStates[${index}].lastReviewedAt must be a string or null`);
  }

  for (const key of ["reviewCount", "lapseCount", "intervalMinutes"]) {
    if (!isNumber(value[key])) {
      errors.push(`reviewStates[${index}].${key} must be a number`);
    }
  }

  for (const key of ["difficulty", "stability"]) {
    if (!isNumberOrNull(value[key])) {
      errors.push(`reviewStates[${index}].${key} must be a number or null`);
    }
  }

  if (requiresV2Fields) {
    for (const key of ["dueAt", "updatedAt"]) {
      validateDateField(value, key, `reviewStates[${index}]`, errors);
    }
    if (value.lastReviewedAt !== null && !isValidDateString(value.lastReviewedAt)) {
      errors.push(`reviewStates[${index}].lastReviewedAt must be a valid date string or null`);
    }
    if (!REVIEW_PROFILES.has(String(value.reviewProfile))) {
      errors.push(`reviewStates[${index}].reviewProfile is unsupported`);
    }

    if (!isString(value.parameterSetId) || !value.parameterSetId.trim()) {
      errors.push(`reviewStates[${index}].parameterSetId must be a non-blank string`);
    }

    if (!isStringOrNull(value.firstRatedAt)) {
      errors.push(`reviewStates[${index}].firstRatedAt must be a string or null`);
    } else if (value.firstRatedAt !== null && !isValidDateString(value.firstRatedAt)) {
      errors.push(`reviewStates[${index}].firstRatedAt must be a valid date string or null`);
    }

    if (value.historyOrigin !== "recorded" && value.historyOrigin !== "legacy_unknown") {
      errors.push(`reviewStates[${index}].historyOrigin is unsupported`);
    }

    if (
      (value.historyOrigin === "recorded" && !isString(value.firstRatedAt)) ||
      (value.historyOrigin === "legacy_unknown" && value.firstRatedAt !== null)
    ) {
      errors.push(`reviewStates[${index}].firstRatedAt does not match historyOrigin`);
    }

    if (
      (value.reviewProfile === "recognition" && value.parameterSetId !== "recognition-fsrs-v1") ||
      (value.reviewProfile === "active" && value.parameterSetId === "recognition-fsrs-v1")
    ) {
      errors.push(`reviewStates[${index}].parameterSetId does not match reviewProfile`);
    }
  }
}

function validateReviewEvent(
  value: unknown,
  index: number,
  errors: string[],
  requiresPersonId: boolean,
  requiresV2Fields: boolean,
) {
  if (!isRecord(value)) {
    errors.push(`reviewEvents[${index}] must be an object`);
    return;
  }

  for (const key of [...(requiresPersonId ? ["personId"] : []), "id", "vocabularyItemId", "reviewedAt", "nextDueAt"]) {
    if (!isString(value[key])) {
      errors.push(`reviewEvents[${index}].${key} must be a string`);
    }
  }

  if (!REVIEW_RATINGS.has(String(value.rating))) {
    errors.push(`reviewEvents[${index}].rating is unsupported`);
  }

  if (!isStringOrNull(value.previousDueAt)) {
    errors.push(`reviewEvents[${index}].previousDueAt must be a string or null`);
  }

  if (!isNumberOrNull(value.previousIntervalMinutes)) {
    errors.push(`reviewEvents[${index}].previousIntervalMinutes must be a number or null`);
  }

  for (const key of ["nextIntervalMinutes", "elapsedMs"]) {
    if (!isNumber(value[key])) {
      errors.push(`reviewEvents[${index}].${key} must be a number`);
    }
  }

  if (requiresV2Fields) {
    for (const key of ["reviewedAt", "nextDueAt"]) {
      validateDateField(value, key, `reviewEvents[${index}]`, errors);
    }
    if (value.previousDueAt !== null && !isValidDateString(value.previousDueAt)) {
      errors.push(`reviewEvents[${index}].previousDueAt must be a valid date string or null`);
    }
    if (!isStringOrNull(value.promptId)) {
      errors.push(`reviewEvents[${index}].promptId must be a string or null`);
    }
    if (!REVIEW_PROFILES.has(String(value.reviewProfile))) {
      errors.push(`reviewEvents[${index}].reviewProfile is unsupported`);
    }
    if (!REVIEW_ACTIVITY_TYPES.has(String(value.activityType))) {
      errors.push(`reviewEvents[${index}].activityType is unsupported`);
    }
    if (!ANSWER_OUTCOMES.has(String(value.answerOutcome))) {
      errors.push(`reviewEvents[${index}].answerOutcome is unsupported`);
    }
    if (!isStringOrNull(value.answerNormalizationVersion)) {
      errors.push(`reviewEvents[${index}].answerNormalizationVersion must be a string or null`);
    }
    if (!isStringOrNull(value.targetRevision)) {
      errors.push(`reviewEvents[${index}].targetRevision must be a string or null`);
    }
    if (!isString(value.parameterSetId) || !value.parameterSetId.trim()) {
      errors.push(`reviewEvents[${index}].parameterSetId must be a non-blank string`);
    }
    if (isNumber(value.elapsedMs) && (value.elapsedMs < 0 || value.elapsedMs > 90_000_000)) {
      errors.push(`reviewEvents[${index}].elapsedMs is outside the accepted range`);
    }

    const recognitionEvidence =
      value.reviewProfile === "recognition" &&
      value.activityType === "recognition_card" &&
      value.answerOutcome === "self_rated" &&
      value.answerNormalizationVersion === null &&
      value.targetRevision === null &&
      value.parameterSetId === "recognition-fsrs-v1";
    const activeSayEvidence =
      value.reviewProfile === "active" &&
      value.activityType === "say" &&
      value.answerOutcome === "self_rated" &&
      value.answerNormalizationVersion === null &&
      isString(value.targetRevision) &&
      Boolean(value.targetRevision.trim()) &&
      value.parameterSetId !== "recognition-fsrs-v1";
    const activeTypedEvidence =
      value.reviewProfile === "active" &&
      (value.activityType === "spell" || value.activityType === "dictation") &&
      value.answerOutcome !== "self_rated" &&
      ANSWER_OUTCOMES.has(String(value.answerOutcome)) &&
      value.answerNormalizationVersion === "active-answer-v1" &&
      isString(value.targetRevision) &&
      Boolean(value.targetRevision.trim()) &&
      value.parameterSetId !== "recognition-fsrs-v1";

    if (!recognitionEvidence && !activeSayEvidence && !activeTypedEvidence) {
      errors.push(`reviewEvents[${index}] evidence fields are inconsistent`);
    }
  }
}

function validateCounts(value: unknown, errors: string[], requiresV2Fields: boolean) {
  if (!isRecord(value)) {
    errors.push("metadata.counts must be an object");
    return;
  }

  for (const key of ["items", "activeItems", "archivedItems", "importBatches", "reviewStates", "reviewEvents"]) {
    if (!isNumber(value[key])) {
      errors.push(`metadata.counts.${key} must be a number`);
    }
  }

  if (value.people !== undefined && !isNumber(value.people)) {
    errors.push("metadata.counts.people must be a number");
  }

  if (requiresV2Fields) {
    for (const key of [
      "dailyStudyDefaults",
      "dailyStudyPlans",
      "vocabularyCreationFacts",
      "vocabularyCreationReversals",
      "aiRuns",
      "aiEnrichmentDrafts",
      "vocabularyRelations",
    ]) {
      if (!isNumber(value[key])) {
        errors.push(`metadata.counts.${key} must be a number`);
      }
    }
  }
}

function validateSettings(value: unknown, errors: string[], requiresDualLimits: boolean) {
  if (!isRecord(value)) {
    errors.push("data.settings must be an object");
    return;
  }

  if (!isNumber(value.sessionLimit)) {
    errors.push("data.settings.sessionLimit must be a number");
  }

  if (requiresDualLimits) {
    if (!isNumber(value.recognitionSessionLimit)) {
      errors.push("data.settings.recognitionSessionLimit must be a number");
    }

    if (!isNumber(value.activeSessionLimit)) {
      errors.push("data.settings.activeSessionLimit must be a number");
    }
  }

  if (!isString(value.timezone)) {
    errors.push("data.settings.timezone must be a string");
  }

  if (!isString(value.updatedAt)) {
    errors.push("data.settings.updatedAt must be a string");
  }
}

function validateSettingsByPerson(value: unknown, errors: string[], requiresDualLimits: boolean) {
  if (!Array.isArray(value)) {
    errors.push("data.settingsByPerson must be an array");
    return;
  }

  value.forEach((settings, index) => {
    if (!isRecord(settings)) {
      errors.push(`settingsByPerson[${index}] must be an object`);
      return;
    }

    if (!isString(settings.personId)) {
      errors.push(`settingsByPerson[${index}].personId must be a string`);
    }

    if (!isNumber(settings.sessionLimit)) {
      errors.push(`settingsByPerson[${index}].sessionLimit must be a number`);
    }

    if (requiresDualLimits) {
      if (!isNumber(settings.recognitionSessionLimit)) {
        errors.push(`settingsByPerson[${index}].recognitionSessionLimit must be a number`);
      }

      if (!isNumber(settings.activeSessionLimit)) {
        errors.push(`settingsByPerson[${index}].activeSessionLimit must be a number`);
      }
    }

    if (!isString(settings.timezone)) {
      errors.push(`settingsByPerson[${index}].timezone must be a string`);
    }

    if (!isString(settings.updatedAt)) {
      errors.push(`settingsByPerson[${index}].updatedAt must be a string`);
    }
  });
}

function isNonNegativeDatabaseInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_DATABASE_INTEGER;
}

function validateDailyStudyDefault(value: unknown, index: number, errors: string[]) {
  const label = `dailyStudyDefaults[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of ["personId", "timezone", "updatedAt"]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    }
  }
  validateDateField(value, "updatedAt", label, errors);
  if (!REVIEW_PROFILES.has(String(value.reviewProfile))) {
    errors.push(`${label}.reviewProfile is unsupported`);
  }
  for (const key of ["reviewGoal", "newWordGoal"]) {
    if (!isNonNegativeDatabaseInteger(value[key])) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
}

function validateDailyStudyPlan(value: unknown, index: number, errors: string[]) {
  const label = `dailyStudyPlans[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of [
    "id",
    "personId",
    "localDate",
    "timezone",
    "dayStartsAt",
    "dayEndsAt",
    "recommendationVersion",
    "calculatedAt",
    "updatedAt",
  ]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    } else if (!value[key].trim()) {
      errors.push(`${label}.${key} must not be blank`);
    }
  }
  if (!isValidLocalDate(value.localDate)) {
    errors.push(`${label}.localDate must be a valid YYYY-MM-DD date`);
  }
  for (const key of ["dayStartsAt", "dayEndsAt", "calculatedAt", "updatedAt"]) {
    validateDateField(value, key, label, errors);
  }
  if (!REVIEW_PROFILES.has(String(value.reviewProfile))) {
    errors.push(`${label}.reviewProfile is unsupported`);
  }
  for (const key of ["suggestedReview", "reviewGoal", "newWordGoal"]) {
    if (!isNonNegativeDatabaseInteger(value[key])) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
  if (!Number.isInteger(value.planVersion) || Number(value.planVersion) < 1) {
    errors.push(`${label}.planVersion must be a positive integer`);
  }
  if (
    isString(value.dayStartsAt) &&
    isString(value.dayEndsAt) &&
    Date.parse(value.dayEndsAt) <= Date.parse(value.dayStartsAt)
  ) {
    errors.push(`${label} day window is invalid`);
  }
}

function validateCreationFact(value: unknown, index: number, errors: string[]) {
  const label = `vocabularyCreationFacts[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of [
    "creationFactId",
    "personId",
    "originalVocabularyItemId",
    "sourceActionId",
    "systemCreatedAt",
  ]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    }
  }
  validateDateField(value, "systemCreatedAt", label, errors);
  if (!REVIEW_PROFILES.has(String(value.trackAtCreation))) {
    errors.push(`${label}.trackAtCreation is unsupported`);
  }
  if (!CREATION_SOURCE_KINDS.has(String(value.sourceKind))) {
    errors.push(`${label}.sourceKind is unsupported`);
  }
  if (value.historyOrigin !== "recorded" && value.historyOrigin !== "legacy_backfill") {
    errors.push(`${label}.historyOrigin is unsupported`);
  }
}

function validateCreationReversal(value: unknown, index: number, errors: string[]) {
  const label = `vocabularyCreationReversals[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of ["reversalFactId", "personId", "sourceActionId", "reversedAt"]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    }
  }
  validateDateField(value, "reversedAt", label, errors);
  if (value.reason !== "batch_rollback") {
    errors.push(`${label}.reason is unsupported`);
  }
}

function validateAiDraftContent(value: unknown, label: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (!isStringArray(value.additionalMeaningsZh)) {
    errors.push(`${label}.additionalMeaningsZh must be an array`);
  }
  if (!isStringArray(value.examples)) {
    errors.push(`${label}.examples must be an array`);
  }
  if (!Array.isArray(value.similarWords)) {
    errors.push(`${label}.similarWords must be an array`);
  } else {
    value.similarWords.forEach((entry, index) => {
      if (!isRecord(entry) || !isString(entry.word) || !isString(entry.differenceZh)) {
        errors.push(`${label}.similarWords[${index}] is invalid`);
      }
    });
  }
  if (!Array.isArray(value.confusableWords)) {
    errors.push(`${label}.confusableWords must be an array`);
  } else {
    value.confusableWords.forEach((entry, index) => {
      if (
        !isRecord(entry) ||
        !isString(entry.word) ||
        !isString(entry.differenceZh) ||
        !["spelling", "sound", "usage"].includes(String(entry.type)) ||
        !isStringArray(entry.examplePair) ||
        ![0, 2].includes(Array.isArray(entry.examplePair) ? entry.examplePair.length : -1)
      ) {
        errors.push(`${label}.confusableWords[${index}] is invalid`);
      }
    });
  }
}

function validateAiRun(value: unknown, index: number, errors: string[]) {
  const label = `aiRuns[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of [
    "id",
    "personId",
    "model",
    "modelLabel",
    "promptVersion",
    "sourceHash",
    "outputSchemaVersion",
    "disclosureVersion",
    "idempotencyKeyHash",
    "cacheKeyHash",
    "createdAt",
  ]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    } else if (!value[key].trim()) {
      errors.push(`${label}.${key} must not be blank`);
    }
  }
  if (!isStringOrNull(value.sourceVocabularyItemId)) {
    errors.push(`${label}.sourceVocabularyItemId must be a string or null`);
  }
  if (
    value.feature !== "enrichment_v1" ||
    !["google-gemini-api", "local-fixture"].includes(String(value.provider))
  ) {
    errors.push(`${label} provider or feature is unsupported`);
  }
  if (!AI_RUN_STATUSES.has(String(value.status))) {
    errors.push(`${label}.status is unsupported`);
  }
  if (!AI_STRUCTURE_STATUSES.has(String(value.structureValidationStatus))) {
    errors.push(`${label}.structureValidationStatus is unsupported`);
  }
  if (!isStringOrNull(value.providerResponseId) || !isStringOrNull(value.completedAt)) {
    errors.push(`${label} nullable lineage fields are invalid`);
  }
  validateDateField(value, "createdAt", label, errors);
  validateDateField(value, "completedAt", label, errors);
  for (const key of [
    "inputTokens",
    "outputTokens",
    "thinkingTokens",
    "totalTokens",
    "latencyMs",
  ]) {
    if (!isNonNegativeDatabaseInteger(value[key])) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
  if (
    isNonNegativeDatabaseInteger(value.inputTokens) &&
    isNonNegativeDatabaseInteger(value.outputTokens) &&
    isNonNegativeDatabaseInteger(value.thinkingTokens) &&
    isNonNegativeDatabaseInteger(value.totalTokens) &&
    Number(value.totalTokens) <
      Number(value.inputTokens) + Number(value.outputTokens) + Number(value.thinkingTokens)
  ) {
    errors.push(`${label}.totalTokens is inconsistent`);
  }
  if (typeof value.estimatedCostUsd !== "number" || !Number.isFinite(value.estimatedCostUsd) || value.estimatedCostUsd < 0) {
    errors.push(`${label}.estimatedCostUsd must be a non-negative number`);
  }
  if (value.provider === "local-fixture") {
    const localFixtureIsHonest =
      value.model === "fixture-v1" &&
      value.modelLabel === "Local preview" &&
      value.promptVersion === "local-fixture-v1" &&
      value.disclosureVersion === "local-fixture-no-network-v1" &&
      value.providerResponseId === null &&
      value.inputTokens === 0 &&
      value.outputTokens === 0 &&
      value.thinkingTokens === 0 &&
      value.totalTokens === 0 &&
      value.latencyMs === 0 &&
      value.estimatedCostUsd === 0;
    if (!localFixtureIsHonest) {
      errors.push(`${label} local-fixture lineage is inconsistent`);
    }
  }
  if (
    value.provider === "google-gemini-api" &&
    (
      value.model !== "gemini-3.1-flash-lite" ||
      value.modelLabel !== "Gemini 3.1 Flash-Lite" ||
      !["ai-disclosure-v1", "ai-disclosure-v2", "ai-disclosure-v3"].includes(
        String(value.disclosureVersion),
      )
    )
  ) {
    errors.push(`${label} Gemini lineage is inconsistent`);
  }
}

function validateAiEnrichmentDraft(value: unknown, index: number, errors: string[]) {
  const label = `aiEnrichmentDrafts[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of [
    "id",
    "personId",
    "sourceVocabularyItemId",
    "aiRunId",
    "createdAt",
    "updatedAt",
  ]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    }
  }
  for (const key of ["createdAt", "updatedAt", "decidedAt"]) {
    validateDateField(value, key, label, errors);
  }
  if (value.status !== "accepted") {
    errors.push(`${label}.status must be accepted in a user backup`);
  }
  if (!isString(value.decidedAt)) {
    errors.push(`${label}.decidedAt must be a string for accepted content`);
  }
  validateAiDraftContent(value.draft, `${label}.draft`, errors);
  validateAiDraftContent(value.acceptedContent, `${label}.acceptedContent`, errors);
}

function validateVocabularyRelation(value: unknown, index: number, errors: string[]) {
  const label = `vocabularyRelations[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of [
    "id",
    "personId",
    "sourceVocabularyItemId",
    "targetVocabularyItemId",
    "differenceZh",
    "aiRunId",
    "createdAt",
  ]) {
    if (!isString(value[key])) {
      errors.push(`${label}.${key} must be a string`);
    }
  }
  validateDateField(value, "createdAt", label, errors);
  if (!VOCABULARY_RELATION_TYPES.has(String(value.relationType))) {
    errors.push(`${label}.relationType is unsupported`);
  }
  if (!isStringArray(value.examplePair) || ![0, 2].includes(Array.isArray(value.examplePair) ? value.examplePair.length : -1)) {
    errors.push(`${label}.examplePair must be empty or contain two strings`);
  }
  if (value.sourceVocabularyItemId === value.targetVocabularyItemId) {
    errors.push(`${label} must reference two different items`);
  }
}

function validateSchema6References(
  value: Record<string, unknown>,
  personIds: Set<unknown>,
  itemByKey: Map<string, Record<string, unknown>>,
  errors: string[],
) {
  const itemKeys = new Set(itemByKey.keys());
  const seenDefaults = new Set<string>();
  const seenPlans = new Set<string>();
  const seenPlanIds = new Set<string>();
  const seenStates = new Set<string>();
  const seenStateIds = new Set<string>();
  const seenEventIds = new Set<string>();
  const seenPromptIds = new Set<string>();
  const seenCreationKeys = new Set<string>();
  const seenCreationIds = new Set<string>();
  const creationKindByAction = new Map<string, string>();
  const seenReversalKeys = new Set<string>();
  const seenReversalIds = new Set<string>();
  const runKeys = new Set<string>();
  const runByKey = new Map<string, Record<string, unknown>>();
  const succeededRunKeys = new Set<string>();
  const seenRunIdempotencyKeys = new Set<string>();
  const seenDraftIds = new Set<string>();
  const seenRelationIds = new Set<string>();
  const seenRelationKeys = new Set<string>();

  const requirePerson = (record: Record<string, unknown>, label: string) => {
    if (isString(record.personId) && !personIds.has(record.personId)) {
      errors.push(`${label}.personId does not match a person`);
    }
  };

  if (Array.isArray(value.dailyStudyDefaults)) {
    value.dailyStudyDefaults.filter(isRecord).forEach((record, index) => {
      const label = `dailyStudyDefaults[${index}]`;
      requirePerson(record, label);
      const key = `${record.personId}:${record.reviewProfile}`;
      if (seenDefaults.has(key)) {
        errors.push(`${label} duplicates a person/profile default`);
      }
      seenDefaults.add(key);
    });
    for (const personId of personIds) {
      if (!isString(personId)) {
        continue;
      }
      for (const reviewProfile of REVIEW_PROFILES) {
        if (!seenDefaults.has(`${personId}:${reviewProfile}`)) {
          errors.push(`dailyStudyDefaults missing ${reviewProfile} defaults for ${personId}`);
        }
      }
    }
  }

  if (Array.isArray(value.dailyStudyPlans)) {
    value.dailyStudyPlans.filter(isRecord).forEach((record, index) => {
      const label = `dailyStudyPlans[${index}]`;
      requirePerson(record, label);
      const key = `${record.personId}:${record.reviewProfile}:${record.localDate}`;
      if (seenPlans.has(key)) {
        errors.push(`${label} duplicates a person/profile/date plan`);
      }
      seenPlans.add(key);
      const idKey = `${record.personId}:${record.id}`;
      if (seenPlanIds.has(idKey)) {
        errors.push(`${label}.id is duplicated for the person`);
      }
      seenPlanIds.add(idKey);
    });
  }

  if (Array.isArray(value.reviewStates)) {
    value.reviewStates.filter(isRecord).forEach((record, index) => {
      const key = `${record.personId}:${record.vocabularyItemId}:${record.reviewProfile}`;
      if (seenStates.has(key)) {
        errors.push(`reviewStates[${index}] duplicates a person/item/profile state`);
      }
      seenStates.add(key);
      const idKey = `${record.personId}:${record.id}`;
      if (seenStateIds.has(idKey)) {
        errors.push(`reviewStates[${index}].id is duplicated for the person`);
      }
      seenStateIds.add(idKey);
    });
  }

  if (Array.isArray(value.reviewEvents)) {
    value.reviewEvents.filter(isRecord).forEach((record, index) => {
      const idKey = `${record.personId}:${record.id}`;
      if (seenEventIds.has(idKey)) {
        errors.push(`reviewEvents[${index}].id is duplicated for the person`);
      }
      seenEventIds.add(idKey);
      if (isString(record.promptId)) {
        const key = `${record.personId}:${record.promptId}`;
        if (seenPromptIds.has(key)) {
          errors.push(`reviewEvents[${index}].promptId is duplicated for the person`);
        }
        seenPromptIds.add(key);
      }
    });
  }

  if (Array.isArray(value.vocabularyCreationFacts)) {
    value.vocabularyCreationFacts.filter(isRecord).forEach((record, index) => {
      const label = `vocabularyCreationFacts[${index}]`;
      requirePerson(record, label);
      const stableKey = `${record.personId}:${record.sourceActionId}:${record.originalVocabularyItemId}`;
      if (seenCreationKeys.has(stableKey)) {
        errors.push(`${label} duplicates a stable creation key`);
      }
      seenCreationKeys.add(stableKey);
      const idKey = `${record.personId}:${record.creationFactId}`;
      if (seenCreationIds.has(idKey)) {
        errors.push(`${label}.creationFactId is duplicated for the person`);
      }
      seenCreationIds.add(idKey);
      const actionKey = `${record.personId}:${record.sourceActionId}`;
      const previousKind = creationKindByAction.get(actionKey);
      if (previousKind && previousKind !== record.sourceKind) {
        errors.push(`${label} mixes source kinds within one action`);
      }
      if (isString(record.sourceKind)) {
        creationKindByAction.set(actionKey, record.sourceKind);
      }
    });
  }

  if (Array.isArray(value.vocabularyCreationReversals)) {
    value.vocabularyCreationReversals.filter(isRecord).forEach((record, index) => {
      const label = `vocabularyCreationReversals[${index}]`;
      requirePerson(record, label);
      const actionKey = `${record.personId}:${record.sourceActionId}`;
      if (creationKindByAction.get(actionKey) !== "batch") {
        errors.push(`${label} does not reference a known batch action`);
      }
      const stableKey = `${actionKey}:${record.reason}`;
      if (seenReversalKeys.has(stableKey)) {
        errors.push(`${label} duplicates an action reversal`);
      }
      seenReversalKeys.add(stableKey);
      const idKey = `${record.personId}:${record.reversalFactId}`;
      if (seenReversalIds.has(idKey)) {
        errors.push(`${label}.reversalFactId is duplicated for the person`);
      }
      seenReversalIds.add(idKey);
    });
  }

  if (Array.isArray(value.aiRuns)) {
    value.aiRuns.filter(isRecord).forEach((record, index) => {
      const label = `aiRuns[${index}]`;
      requirePerson(record, label);
      const key = `${record.personId}:${record.id}`;
      if (runKeys.has(key)) {
        errors.push(`${label}.id is duplicated for the person`);
      }
      runKeys.add(key);
      runByKey.set(key, record);
      const idempotencyKey = `${record.personId}:${record.idempotencyKeyHash}`;
      if (seenRunIdempotencyKeys.has(idempotencyKey)) {
        errors.push(`${label}.idempotencyKeyHash is duplicated for the person`);
      }
      seenRunIdempotencyKeys.add(idempotencyKey);
      if (record.status === "succeeded") {
        succeededRunKeys.add(key);
      } else {
        errors.push(`${label} must be succeeded when retained in a user backup`);
      }
      if (isString(record.sourceVocabularyItemId)) {
        const itemKey = `${record.personId}:${record.sourceVocabularyItemId}`;
        if (!itemKeys.has(itemKey)) {
          errors.push(`${label}.sourceVocabularyItemId does not match an item`);
        }
      }
    });
  }

  if (Array.isArray(value.aiEnrichmentDrafts)) {
    value.aiEnrichmentDrafts.filter(isRecord).forEach((record, index) => {
      const label = `aiEnrichmentDrafts[${index}]`;
      requirePerson(record, label);
      const itemKey = `${record.personId}:${record.sourceVocabularyItemId}`;
      const runKey = `${record.personId}:${record.aiRunId}`;
      const idKey = `${record.personId}:${record.id}`;
      if (seenDraftIds.has(idKey)) {
        errors.push(`${label}.id is duplicated for the person`);
      }
      seenDraftIds.add(idKey);
      if (!itemKeys.has(itemKey)) {
        errors.push(`${label}.sourceVocabularyItemId does not match an item`);
      }
      if (!succeededRunKeys.has(runKey)) {
        errors.push(`${label}.aiRunId does not match a succeeded retained run`);
      }
      const source = itemByKey.get(itemKey);
      const run = runByKey.get(runKey);
      if (source && run) {
        try {
          const accepted = validateStoredAiEnrichmentDraft(record.acceptedContent);
          const exportedDraft = validateStoredAiEnrichmentDraft(record.draft);
          if (JSON.stringify(accepted) !== JSON.stringify(exportedDraft)) {
            errors.push(`${label}.draft must equal acceptedContent in a user backup`);
          }
          if (run.feature !== "enrichment_v1") {
            errors.push(`${label}.aiRunId must reference enrichment_v1`);
          }
        } catch (error) {
          errors.push(
            `${label} content is invalid: ${error instanceof Error ? error.message : "unknown error"}`,
          );
        }
      }
    });
  }

  if (Array.isArray(value.vocabularyRelations)) {
    value.vocabularyRelations.filter(isRecord).forEach((record, index) => {
      const label = `vocabularyRelations[${index}]`;
      requirePerson(record, label);
      const idKey = `${record.personId}:${record.id}`;
      if (seenRelationIds.has(idKey)) {
        errors.push(`${label}.id is duplicated for the person`);
      }
      seenRelationIds.add(idKey);
      const stableKey = `${record.personId}:${record.sourceVocabularyItemId}:${record.targetVocabularyItemId}:${record.relationType}`;
      if (seenRelationKeys.has(stableKey)) {
        errors.push(`${label} duplicates a source/target/type relation`);
      }
      seenRelationKeys.add(stableKey);
      for (const field of ["sourceVocabularyItemId", "targetVocabularyItemId"]) {
        const itemKey = `${record.personId}:${record[field]}`;
        if (!itemKeys.has(itemKey)) {
          errors.push(`${label}.${field} does not match an item`);
        }
      }
      const runKey = `${record.personId}:${record.aiRunId}`;
      if (!runKeys.has(runKey)) {
        errors.push(`${label}.aiRunId does not match a retained run`);
      }
    });
  }
}

function validateBackupData(
  value: unknown,
  errors: string[],
  requiresBilingualExamples: boolean,
) {
  if (!isRecord(value)) {
    errors.push("data must be an object");
    return;
  }

  if (
    value.schemaVersion !== 2 &&
    value.schemaVersion !== 3 &&
    value.schemaVersion !== 4 &&
    value.schemaVersion !== 5 &&
    value.schemaVersion !== 6
  ) {
    errors.push("data.schemaVersion must be 2, 3, 4, 5, or 6");
  }
  const requiresPersonId =
    value.schemaVersion === 3 ||
    value.schemaVersion === 4 ||
    value.schemaVersion === 5 ||
    value.schemaVersion === 6;
  const requiresTrackFields =
    value.schemaVersion === 4 || value.schemaVersion === 5 || value.schemaVersion === 6;
  const requiresTextListFields = value.schemaVersion === 5 || value.schemaVersion === 6;
  const requiresV2Fields = value.schemaVersion === 6;

  if (requiresPersonId) {
    if (!Array.isArray(value.people)) {
      errors.push("data.people must be an array");
    } else {
      value.people.forEach((person, index) => validatePerson(person, index, errors));
    }

    if (!isString(value.selectedPersonId)) {
      errors.push("data.selectedPersonId must be a string");
    }
  }

  if (!Array.isArray(value.items)) {
    errors.push("data.items must be an array");
  } else {
    value.items.forEach((item, index) =>
      validateVocabularyItem(
        item,
        index,
        errors,
        requiresPersonId,
        requiresTrackFields,
        requiresTextListFields,
        requiresBilingualExamples,
      ),
    );
  }

  if (!Array.isArray(value.importBatches)) {
    errors.push("data.importBatches must be an array");
  } else {
    value.importBatches.forEach((batch, index) =>
      validateImportBatch(batch, index, errors, requiresPersonId),
    );
  }

  if (!Array.isArray(value.reviewStates)) {
    errors.push("data.reviewStates must be an array");
  } else {
    value.reviewStates.forEach((state, index) =>
      validateReviewState(state, index, errors, requiresPersonId, requiresV2Fields),
    );
  }

  if (!Array.isArray(value.reviewEvents)) {
    errors.push("data.reviewEvents must be an array");
  } else {
    value.reviewEvents.forEach((event, index) =>
      validateReviewEvent(event, index, errors, requiresPersonId, requiresV2Fields),
    );
  }

  if (requiresPersonId) {
    validateSettingsByPerson(value.settingsByPerson, errors, requiresTrackFields);
  } else {
    validateSettings(value.settings, errors, requiresTrackFields);
  }

  if (requiresV2Fields) {
    if (!Array.isArray(value.dailyStudyDefaults)) {
      errors.push("data.dailyStudyDefaults must be an array");
    } else {
      value.dailyStudyDefaults.forEach((entry, index) =>
        validateDailyStudyDefault(entry, index, errors),
      );
    }
    if (!Array.isArray(value.dailyStudyPlans)) {
      errors.push("data.dailyStudyPlans must be an array");
    } else {
      value.dailyStudyPlans.forEach((entry, index) =>
        validateDailyStudyPlan(entry, index, errors),
      );
    }
    if (!Array.isArray(value.vocabularyCreationFacts)) {
      errors.push("data.vocabularyCreationFacts must be an array");
    } else {
      value.vocabularyCreationFacts.forEach((entry, index) =>
        validateCreationFact(entry, index, errors),
      );
    }
    if (!Array.isArray(value.vocabularyCreationReversals)) {
      errors.push("data.vocabularyCreationReversals must be an array");
    } else {
      value.vocabularyCreationReversals.forEach((entry, index) =>
        validateCreationReversal(entry, index, errors),
      );
    }
    if (!Array.isArray(value.aiRuns)) {
      errors.push("data.aiRuns must be an array");
    } else {
      value.aiRuns.forEach((entry, index) => validateAiRun(entry, index, errors));
    }
    if (!Array.isArray(value.aiEnrichmentDrafts)) {
      errors.push("data.aiEnrichmentDrafts must be an array");
    } else {
      value.aiEnrichmentDrafts.forEach((entry, index) =>
        validateAiEnrichmentDraft(entry, index, errors),
      );
    }
    if (!Array.isArray(value.vocabularyRelations)) {
      errors.push("data.vocabularyRelations must be an array");
    } else {
      value.vocabularyRelations.forEach((entry, index) =>
        validateVocabularyRelation(entry, index, errors),
      );
    }
  }

  if (!isString(value.updatedAt)) {
    errors.push("data.updatedAt must be a string");
  }

  if (Array.isArray(value.items)) {
    const personIds = new Set(
      requiresPersonId && Array.isArray(value.people)
        ? value.people.filter(isRecord).map((person) => person.id).filter(isString)
        : [],
    );
    const itemTrackByKey = new Map<string, unknown>();
    const itemByKey = new Map<string, Record<string, unknown>>();

    value.items.filter(isRecord).forEach((item) => {
      const itemKey =
        requiresPersonId && isString(item.personId) && isString(item.id)
          ? `${item.personId}:${item.id}`
          : item.id;

      if (isString(itemKey)) {
        itemTrackByKey.set(itemKey, item.learningTrack);
        itemByKey.set(itemKey, item);
      }
    });

    const itemKeys = new Set(itemTrackByKey.keys());

    if (requiresPersonId) {
      value.items.filter(isRecord).forEach((item, index) => {
        if (isString(item.personId) && !personIds.has(item.personId)) {
          errors.push(`items[${index}].personId does not match a person`);
        }
      });
    }

    if (Array.isArray(value.reviewStates)) {
      value.reviewStates.filter(isRecord).forEach((state, index) => {
        const itemKey =
          requiresPersonId && isString(state.personId) && isString(state.vocabularyItemId)
            ? `${state.personId}:${state.vocabularyItemId}`
            : state.vocabularyItemId;

        if (isString(itemKey) && !itemKeys.has(itemKey)) {
          errors.push(`reviewStates[${index}].vocabularyItemId does not match an item`);
        }

        if (
          requiresTrackFields &&
          !requiresV2Fields &&
          isString(itemKey) &&
          itemTrackByKey.get(itemKey) === "active"
        ) {
          errors.push(`reviewStates[${index}].vocabularyItemId references an Active item`);
        }
      });
    }

    if (Array.isArray(value.reviewEvents)) {
      value.reviewEvents.filter(isRecord).forEach((event, index) => {
        const itemKey =
          requiresPersonId && isString(event.personId) && isString(event.vocabularyItemId)
            ? `${event.personId}:${event.vocabularyItemId}`
            : event.vocabularyItemId;

        if (isString(itemKey) && !itemKeys.has(itemKey)) {
          errors.push(`reviewEvents[${index}].vocabularyItemId does not match an item`);
        }

        if (
          requiresTrackFields &&
          !requiresV2Fields &&
          isString(itemKey) &&
          itemTrackByKey.get(itemKey) === "active"
        ) {
          errors.push(`reviewEvents[${index}].vocabularyItemId references an Active item`);
        }
      });
    }

    if (requiresV2Fields) {
      validateSchema6References(value, personIds, itemByKey, errors);
    }
  }
}

export function parseVocabularyBackupValue(value: unknown, now = new Date().toISOString()): BackupParseResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ["Backup root must be an object"],
    };
  }

  if (value.format !== BACKUP_FORMAT) {
    errors.push(`format must be ${BACKUP_FORMAT}`);
  }

  if (
    value.backupVersion !== 1 &&
    value.backupVersion !== 2 &&
    value.backupVersion !== 3 &&
    value.backupVersion !== BACKUP_VERSION
  ) {
    errors.push(`backupVersion must be 1, 2, 3, or ${BACKUP_VERSION}`);
  }

  if (!isRecord(value.metadata)) {
    errors.push("metadata must be an object");
  } else {
    if (value.metadata.appName !== BACKUP_APP_NAME) {
      errors.push(`metadata.appName must be ${BACKUP_APP_NAME}`);
    }

    if (!isString(value.metadata.exportedAt)) {
      errors.push("metadata.exportedAt must be a string");
    }

    if (!isString(value.metadata.timezone)) {
      errors.push("metadata.timezone must be a string");
    }

    if (
      value.metadata.schemaVersion !== 2 &&
      value.metadata.schemaVersion !== 3 &&
      value.metadata.schemaVersion !== 4 &&
      value.metadata.schemaVersion !== 5 &&
      value.metadata.schemaVersion !== 6
    ) {
      errors.push("metadata.schemaVersion must be 2, 3, 4, 5, or 6");
    }

    validateCounts(value.metadata.counts, errors, value.metadata.schemaVersion === 6);
  }

  validateBackupData(value.data, errors, value.backupVersion === BACKUP_VERSION);

  if (
    isRecord(value.metadata) &&
    isRecord(value.data) &&
    value.metadata.schemaVersion !== value.data.schemaVersion
  ) {
    errors.push("metadata.schemaVersion must match data.schemaVersion");
  }

  if (
    isRecord(value.metadata) &&
    isRecord(value.metadata.counts) &&
    isRecord(value.data) &&
    value.data.schemaVersion === 6
  ) {
    const collectionKeys = [
      "items",
      "importBatches",
      "reviewStates",
      "reviewEvents",
      "dailyStudyDefaults",
      "dailyStudyPlans",
      "vocabularyCreationFacts",
      "vocabularyCreationReversals",
      "aiRuns",
      "aiEnrichmentDrafts",
      "vocabularyRelations",
    ] as const;
    for (const key of collectionKeys) {
      const expected = Array.isArray(value.data[key]) ? value.data[key].length : -1;
      if (value.metadata.counts[key] !== expected) {
        errors.push(`metadata.counts.${key} does not match data`);
      }
    }
    const peopleCount = Array.isArray(value.data.people) ? value.data.people.length : -1;
    if (value.metadata.counts.people !== peopleCount) {
      errors.push("metadata.counts.people does not match data");
    }
    const archivedItems = Array.isArray(value.data.items)
      ? value.data.items.filter(
          (item) =>
            isRecord(item) && (item.status === "archived" || Boolean(item.archivedAt)),
        ).length
      : -1;
    if (value.metadata.counts.archivedItems !== archivedItems) {
      errors.push("metadata.counts.archivedItems does not match data");
    }
    if (value.metadata.counts.activeItems !== (Array.isArray(value.data.items) ? value.data.items.length - archivedItems : -1)) {
      errors.push("metadata.counts.activeItems does not match data");
    }
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
    };
  }

  const data = migrateVocabularyData(value.data, now);
  const backup: VocabularyBackupFile = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt: isRecord(value.metadata) && isString(value.metadata.exportedAt)
        ? value.metadata.exportedAt
        : now,
      timezone: isRecord(value.metadata) && isString(value.metadata.timezone)
        ? value.metadata.timezone
        : getSelectedReviewSettings(data).timezone,
      schemaVersion: data.schemaVersion,
      counts: summarizeVocabularyData(data),
    },
    data,
  };

  return {
    ok: true,
    backup,
    data,
    counts: backup.metadata.counts,
  };
}

export function parseVocabularyBackupText(text: string, now = new Date().toISOString()): BackupParseResult {
  if (!text.trim()) {
    return {
      ok: false,
      errors: ["Backup file is empty"],
    };
  }

  try {
    return parseVocabularyBackupValue(JSON.parse(text) as unknown, now);
  } catch {
    return {
      ok: false,
      errors: ["Backup file is not valid JSON"],
    };
  }
}
