import { randomUUID } from "node:crypto";

export const BACKUP_FORMAT = "mimi-pte-vocabulary-backup";
export const BACKUP_VERSION = 3;
export const BACKUP_APP_NAME = "words-learning-app-for-mimi";
export const STAGE5L_FIXTURE_FILE_NAME = "stage5l-fixture-backup.json";
export const STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME = "stage6b-p1e-schema5-backup.json";
export const V2_STAGE3_SCHEMA6_FIXTURE_FILE_NAME = "v2-stage3-schema6-backup.json";

const SUPPORTED_BACKUP_VERSIONS = new Set([1, 2, 3]);
const SUPPORTED_SCHEMA_VERSIONS = new Set([3, 4, 5, 6]);
const SUPPORTED_SCHEMA_VERSION_LABEL = "3, 4, 5, or 6";
const DEFAULT_ACTIVE_SESSION_LIMIT = 8;
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
const REVIEW_ACTIVITY_TYPES = new Set(["recognition_card", "say", "spell", "dictation"]);
const ANSWER_OUTCOMES = new Set([
  "self_rated",
  "exact",
  "normalized_match",
  "different",
  "revealed_without_answer",
]);
const CREATION_SOURCE_KINDS = new Set(["single", "batch", "ai_add_to_learning"]);
const RELATION_TYPES = new Set(["similar", "spelling", "sound", "usage"]);
const AI_URL_PATTERN = /(?:https?:\/\/|www\.)/iu;
const AI_CANDIDATE_PATTERN =
  /^[A-Za-z]+(?:['’-][A-Za-z]+)*(?: [A-Za-z]+(?:['’-][A-Za-z]+)*)*$/u;
const AI_ERROR_FORM_EXPLANATION_PATTERN =
  /(?:拼写错误|语法错误|错误的搭配|错误形式|不正确|非标准|不标准|并不标准|此处应(?:使用|改为)|应改为|不可使用|misspell(?:ing|ed)?|ungrammatical|nonstandard|incorrect form)/iu;
const AI_EXAMPLE_ERROR_MARKER_PATTERN =
  /^(?:(?:correct|incorrect|wrong)\s*[:：-]|[✓✗✘]\s*)/iu;

export class BackupImportPlanError extends Error {
  constructor(errors) {
    super(`Backup import plan validation failed: ${errors.join("; ")}`);
    this.name = "BackupImportPlanError";
    this.errors = errors;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

function isStringOrNull(value) {
  return value === null || typeof value === "string";
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isStringArrayOrNull(value) {
  return value === null || isStringArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isSupportedSchemaVersion(value) {
  return SUPPORTED_SCHEMA_VERSIONS.has(value);
}

function isValidDateString(value) {
  return isString(value) && Number.isFinite(Date.parse(value));
}

function requireString(record, key, label, errors) {
  if (!isString(record[key])) {
    errors.push(`${label}.${key} must be a string`);
  }
}

function requireDateString(record, key, label, errors) {
  if (!isValidDateString(record[key])) {
    errors.push(`${label}.${key} must be a valid date string`);
  }
}

function requireSessionLimit(record, key, label, errors) {
  if (!isInteger(record[key]) || record[key] < 1 || record[key] > 80) {
    errors.push(`${label}.${key} must be an integer from 1 to 80`);
  }
}

function requireUnique(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`${label} must be unique: ${value}`);
    }
    seen.add(value);
  }
}

function actualCounts(data) {
  const archivedItems = data.items.filter(
    (item) => item.status === "archived" || Boolean(item.archivedAt),
  ).length;

  const counts = {
    people: data.people.length,
    items: data.items.length,
    activeItems: data.items.length - archivedItems,
    archivedItems,
    importBatches: data.importBatches.length,
    reviewStates: data.reviewStates.length,
    reviewEvents: data.reviewEvents.length,
  };

  if (data.schemaVersion >= 6) {
    Object.assign(counts, {
      dailyStudyDefaults: data.dailyStudyDefaults.length,
      dailyStudyPlans: data.dailyStudyPlans.length,
      vocabularyCreationFacts: data.vocabularyCreationFacts.length,
      vocabularyCreationReversals: data.vocabularyCreationReversals.length,
      aiRuns: data.aiRuns.length,
      aiEnrichmentDrafts: data.aiEnrichmentDrafts.length,
      vocabularyRelations: data.vocabularyRelations.length,
    });
  }

  return counts;
}

function compareCounts(metadataCounts, counts, errors) {
  for (const key of Object.keys(counts)) {
    if (metadataCounts[key] !== counts[key]) {
      errors.push(`metadata.counts.${key} expected ${counts[key]} but got ${metadataCounts[key]}`);
    }
  }
}

function validatePerson(person, index, errors) {
  const label = `people[${index}]`;
  if (!isRecord(person)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of ["id", "displayName", "slug"]) {
    requireString(person, key, label, errors);
    if (isString(person[key]) && person[key].trim() === "") {
      errors.push(`${label}.${key} must not be blank`);
    }
  }
  requireDateString(person, "createdAt", label, errors);
  requireDateString(person, "updatedAt", label, errors);

  if (typeof person.isActive !== "boolean") {
    errors.push(`${label}.isActive must be a boolean`);
  }
}

function validateImportBatch(batch, index, people, errors) {
  const label = `importBatches[${index}]`;
  if (!isRecord(batch)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of ["id", "personId"]) {
    requireString(batch, key, label, errors);
  }
  requireDateString(batch, "createdAt", label, errors);

  if (!people.has(batch.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (!IMPORT_SOURCE_TYPES.has(String(batch.sourceType))) {
    errors.push(`${label}.sourceType is unsupported`);
  }
  if (!isStringOrNull(batch.fileName)) {
    errors.push(`${label}.fileName must be a string or null`);
  }

  for (const key of ["totalRows", "acceptedRows", "duplicateRows", "invalidRows"]) {
    if (!isNonNegativeInteger(batch[key])) {
      errors.push(`${label}.${key} must be a non-negative integer`);
    }
  }
}

function validateVocabularyItem(item, index, people, importBatches, schemaVersion, errors) {
  const label = `items[${index}]`;
  if (!isRecord(item)) {
    errors.push(`${label} must be an object`);
    return;
  }
  const requiresTrackFields = schemaVersion >= 4;
  const requiresTextListFields = schemaVersion >= 5;

  for (const key of [
    "id",
    "personId",
    "surfaceText",
    "normalizedText",
    "meaningZh",
    "example",
    "notes",
    "timezone",
  ]) {
    requireString(item, key, label, errors);
  }
  for (const key of ["createdAt", "systemCreatedAt", "updatedAt"]) {
    requireDateString(item, key, label, errors);
  }

  if (!people.has(item.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (isString(item.surfaceText) && item.surfaceText.trim() === "") {
    errors.push(`${label}.surfaceText must not be blank`);
  }
  if (isString(item.normalizedText) && item.normalizedText.trim() === "") {
    errors.push(`${label}.normalizedText must not be blank`);
  }
  if (!VOCABULARY_SOURCES.has(String(item.source))) {
    errors.push(`${label}.source is unsupported`);
  }
  if (!VOCABULARY_STATUSES.has(String(item.status))) {
    errors.push(`${label}.status is unsupported`);
  }
  if (requiresTrackFields) {
    if (!LEARNING_TRACKS.has(String(item.learningTrack))) {
      errors.push(`${label}.learningTrack is unsupported`);
    }
    if (!isStringArrayOrNull(item.tags)) {
      errors.push(`${label}.tags must be an array or null`);
    } else if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        if (!VOCABULARY_TAGS.has(tag)) {
          errors.push(`${label}.tags contains unsupported tag`);
        }
      }
    }
  }
  if (requiresTextListFields) {
    if (!isStringArray(item.meaningsZh)) {
      errors.push(`${label}.meaningsZh must be an array`);
    }
    if (!isStringArray(item.examples)) {
      errors.push(`${label}.examples must be an array`);
    }
  }
  if (!isStringOrNull(item.importBatchId)) {
    errors.push(`${label}.importBatchId must be a string or null`);
  } else if (item.importBatchId) {
    const batchKey = `${item.personId}:${item.importBatchId}`;
    if (!importBatches.has(batchKey)) {
      errors.push(`${label}.importBatchId does not match an import batch for the same person`);
    }
  }
  if (!isStringOrNull(item.archivedAt)) {
    errors.push(`${label}.archivedAt must be a string or null`);
  }
  if (item.archivedAt !== null && !isValidDateString(item.archivedAt)) {
    errors.push(`${label}.archivedAt must be a valid date string or null`);
  }
  if (item.rarityScore !== null && !(isInteger(item.rarityScore) && item.rarityScore >= 1 && item.rarityScore <= 5)) {
    errors.push(`${label}.rarityScore must be null or an integer from 1 to 5`);
  }
  if (item.status === "archived" && !item.archivedAt) {
    errors.push(`${label}.archivedAt is required when status is archived`);
  }
  if (item.status !== "archived" && item.archivedAt) {
    errors.push(`${label}.archivedAt must be null when status is not archived`);
  }
}

function validateReviewState(
  state,
  index,
  people,
  vocabularyItems,
  reviewStateItems,
  vocabularyItemTracks,
  blockActiveReviewRows,
  requiresV2Fields,
  errors,
) {
  const label = `reviewStates[${index}]`;
  if (!isRecord(state)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of ["id", "personId", "vocabularyItemId"]) {
    requireString(state, key, label, errors);
  }
  for (const key of ["dueAt", "updatedAt"]) {
    requireDateString(state, key, label, errors);
  }

  if (!people.has(state.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  const itemKey = `${state.personId}:${state.vocabularyItemId}`;
  if (!vocabularyItems.has(itemKey)) {
    errors.push(`${label}.vocabularyItemId does not match an item for the same person`);
  }
  if (blockActiveReviewRows && vocabularyItemTracks.get(itemKey) === "active") {
    errors.push(`${label}.vocabularyItemId references an Active item`);
  }
  const stateKey = requiresV2Fields ? `${itemKey}:${state.reviewProfile}` : itemKey;
  if (reviewStateItems.has(stateKey)) {
    errors.push(
      requiresV2Fields
        ? `${label}.vocabularyItemId and reviewProfile must be unique per person`
        : `${label}.vocabularyItemId must be unique per person`,
    );
  }
  reviewStateItems.add(stateKey);
  if (!REVIEW_STATUSES.has(String(state.status))) {
    errors.push(`${label}.status is unsupported`);
  }
  if (!isStringOrNull(state.lastReviewedAt)) {
    errors.push(`${label}.lastReviewedAt must be a string or null`);
  }
  if (state.lastReviewedAt !== null && !isValidDateString(state.lastReviewedAt)) {
    errors.push(`${label}.lastReviewedAt must be a valid date string or null`);
  }
  for (const key of ["reviewCount", "lapseCount"]) {
    if (!isNonNegativeInteger(state[key])) {
      errors.push(`${label}.${key} must be a non-negative integer`);
    }
  }
  if (!isPositiveInteger(state.intervalMinutes)) {
    errors.push(`${label}.intervalMinutes must be a positive integer`);
  }
  for (const key of ["difficulty", "stability"]) {
    if (state[key] !== null && !isFiniteNumber(state[key])) {
      errors.push(`${label}.${key} must be a number or null`);
    }
  }

  if (requiresV2Fields) {
    if (!LEARNING_TRACKS.has(String(state.reviewProfile))) {
      errors.push(`${label}.reviewProfile is unsupported`);
    }
    if (!isString(state.parameterSetId) || !state.parameterSetId.trim()) {
      errors.push(`${label}.parameterSetId must be a non-blank string`);
    }
    if (!isStringOrNull(state.firstRatedAt)) {
      errors.push(`${label}.firstRatedAt must be a string or null`);
    } else if (state.firstRatedAt !== null && !isValidDateString(state.firstRatedAt)) {
      errors.push(`${label}.firstRatedAt must be a valid date string or null`);
    }
    if (state.historyOrigin !== "recorded" && state.historyOrigin !== "legacy_unknown") {
      errors.push(`${label}.historyOrigin is unsupported`);
    }
    if (
      (state.historyOrigin === "recorded" && !isValidDateString(state.firstRatedAt)) ||
      (state.historyOrigin === "legacy_unknown" && state.firstRatedAt !== null)
    ) {
      errors.push(`${label}.firstRatedAt does not match historyOrigin`);
    }
    if (
      (state.reviewProfile === "recognition" && state.parameterSetId !== "recognition-fsrs-v1") ||
      (state.reviewProfile === "active" && state.parameterSetId === "recognition-fsrs-v1")
    ) {
      errors.push(`${label}.parameterSetId does not match reviewProfile`);
    }
  }
}

function validateReviewEvent(
  event,
  index,
  people,
  vocabularyItems,
  vocabularyItemTracks,
  blockActiveReviewRows,
  requiresV2Fields,
  errors,
) {
  const label = `reviewEvents[${index}]`;
  if (!isRecord(event)) {
    errors.push(`${label} must be an object`);
    return;
  }

  for (const key of ["id", "personId", "vocabularyItemId"]) {
    requireString(event, key, label, errors);
  }
  for (const key of ["reviewedAt", "nextDueAt"]) {
    requireDateString(event, key, label, errors);
  }

  if (!people.has(event.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  const itemKey = `${event.personId}:${event.vocabularyItemId}`;
  if (!vocabularyItems.has(itemKey)) {
    errors.push(`${label}.vocabularyItemId does not match an item for the same person`);
  }
  if (blockActiveReviewRows && vocabularyItemTracks.get(itemKey) === "active") {
    errors.push(`${label}.vocabularyItemId references an Active item`);
  }
  if (!REVIEW_RATINGS.has(String(event.rating))) {
    errors.push(`${label}.rating is unsupported`);
  }
  if (!isStringOrNull(event.previousDueAt)) {
    errors.push(`${label}.previousDueAt must be a string or null`);
  }
  if (event.previousDueAt !== null && !isValidDateString(event.previousDueAt)) {
    errors.push(`${label}.previousDueAt must be a valid date string or null`);
  }
  if (event.previousIntervalMinutes !== null && !isPositiveInteger(event.previousIntervalMinutes)) {
    errors.push(`${label}.previousIntervalMinutes must be a positive integer or null`);
  }
  if (!isPositiveInteger(event.nextIntervalMinutes)) {
    errors.push(`${label}.nextIntervalMinutes must be a positive integer`);
  }
  if (!isNonNegativeInteger(event.elapsedMs)) {
    errors.push(`${label}.elapsedMs must be a non-negative integer`);
  }

  if (requiresV2Fields) {
    if (!isStringOrNull(event.promptId)) {
      errors.push(`${label}.promptId must be a string or null`);
    }
    if (!LEARNING_TRACKS.has(String(event.reviewProfile))) {
      errors.push(`${label}.reviewProfile is unsupported`);
    }
    if (!REVIEW_ACTIVITY_TYPES.has(String(event.activityType))) {
      errors.push(`${label}.activityType is unsupported`);
    }
    if (!ANSWER_OUTCOMES.has(String(event.answerOutcome))) {
      errors.push(`${label}.answerOutcome is unsupported`);
    }
    if (!isStringOrNull(event.answerNormalizationVersion)) {
      errors.push(`${label}.answerNormalizationVersion must be a string or null`);
    }
    if (!isStringOrNull(event.targetRevision)) {
      errors.push(`${label}.targetRevision must be a string or null`);
    }
    if (!isString(event.parameterSetId) || !event.parameterSetId.trim()) {
      errors.push(`${label}.parameterSetId must be a non-blank string`);
    }
    if (isNonNegativeInteger(event.elapsedMs) && event.elapsedMs > 90_000_000) {
      errors.push(`${label}.elapsedMs is outside the accepted range`);
    }

    const isRecognitionEvidence =
      event.reviewProfile === "recognition" &&
      event.activityType === "recognition_card" &&
      event.answerOutcome === "self_rated" &&
      event.answerNormalizationVersion === null &&
      event.targetRevision === null &&
      event.parameterSetId === "recognition-fsrs-v1";
    const isActiveSayEvidence =
      event.reviewProfile === "active" &&
      event.activityType === "say" &&
      event.answerOutcome === "self_rated" &&
      event.answerNormalizationVersion === null &&
      isString(event.targetRevision) &&
      Boolean(event.targetRevision.trim()) &&
      event.parameterSetId !== "recognition-fsrs-v1";
    const isActiveTypedEvidence =
      event.reviewProfile === "active" &&
      (event.activityType === "spell" || event.activityType === "dictation") &&
      event.answerOutcome !== "self_rated" &&
      ANSWER_OUTCOMES.has(String(event.answerOutcome)) &&
      event.answerNormalizationVersion === "active-answer-v1" &&
      isString(event.targetRevision) &&
      Boolean(event.targetRevision.trim()) &&
      event.parameterSetId !== "recognition-fsrs-v1";

    if (!isRecognitionEvidence && !isActiveSayEvidence && !isActiveTypedEvidence) {
      errors.push(`${label} evidence fields are inconsistent`);
    }
  }
}

function validateReviewSettings(settings, index, people, requiresDualLimits, errors) {
  const label = `settingsByPerson[${index}]`;
  if (!isRecord(settings)) {
    errors.push(`${label} must be an object`);
    return;
  }

  requireString(settings, "personId", label, errors);
  requireString(settings, "timezone", label, errors);
  requireDateString(settings, "updatedAt", label, errors);

  if (!people.has(settings.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  requireSessionLimit(settings, "sessionLimit", label, errors);
  if (requiresDualLimits) {
    requireSessionLimit(settings, "recognitionSessionLimit", label, errors);
    requireSessionLimit(settings, "activeSessionLimit", label, errors);
  }
  if (isString(settings.timezone) && settings.timezone.trim() === "") {
    errors.push(`${label}.timezone must not be blank`);
  }
}

function validateDailyStudyDefault(record, index, people, errors) {
  const label = `dailyStudyDefaults[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  requireString(record, "personId", label, errors);
  requireString(record, "timezone", label, errors);
  requireDateString(record, "updatedAt", label, errors);
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (!LEARNING_TRACKS.has(String(record.reviewProfile))) {
    errors.push(`${label}.reviewProfile is unsupported`);
  }
  for (const key of ["reviewGoal", "newWordGoal"]) {
    if (!isNonNegativeInteger(record[key]) || record[key] > 2_147_483_647) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
  if (isString(record.timezone) && !record.timezone.trim()) {
    errors.push(`${label}.timezone must not be blank`);
  }
}

function validateDailyStudyPlan(record, index, people, errors) {
  const label = `dailyStudyPlans[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of ["id", "personId", "localDate", "timezone", "recommendationVersion"]) {
    requireString(record, key, label, errors);
  }
  for (const key of ["dayStartsAt", "dayEndsAt", "calculatedAt", "updatedAt"]) {
    requireDateString(record, key, label, errors);
  }
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (!LEARNING_TRACKS.has(String(record.reviewProfile))) {
    errors.push(`${label}.reviewProfile is unsupported`);
  }
  for (const key of ["suggestedReview", "reviewGoal", "newWordGoal"]) {
    if (!isNonNegativeInteger(record[key]) || record[key] > 2_147_483_647) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
  if (!isPositiveInteger(record.planVersion)) {
    errors.push(`${label}.planVersion must be a positive integer`);
  }
  if (
    isValidDateString(record.dayStartsAt) &&
    isValidDateString(record.dayEndsAt) &&
    Date.parse(record.dayEndsAt) <= Date.parse(record.dayStartsAt)
  ) {
    errors.push(`${label} day window is invalid`);
  }
  if (isString(record.recommendationVersion) && !record.recommendationVersion.trim()) {
    errors.push(`${label}.recommendationVersion must not be blank`);
  }
}

function validateCreationFact(record, index, people, errors) {
  const label = `vocabularyCreationFacts[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of [
    "creationFactId",
    "personId",
    "originalVocabularyItemId",
    "sourceActionId",
  ]) {
    requireString(record, key, label, errors);
    if (isString(record[key]) && !record[key].trim()) {
      errors.push(`${label}.${key} must not be blank`);
    }
  }
  requireDateString(record, "systemCreatedAt", label, errors);
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (!LEARNING_TRACKS.has(String(record.trackAtCreation))) {
    errors.push(`${label}.trackAtCreation is unsupported`);
  }
  if (!CREATION_SOURCE_KINDS.has(String(record.sourceKind))) {
    errors.push(`${label}.sourceKind is unsupported`);
  }
  if (record.historyOrigin !== "recorded" && record.historyOrigin !== "legacy_backfill") {
    errors.push(`${label}.historyOrigin is unsupported`);
  }
}

function validateCreationReversal(record, index, people, errors) {
  const label = `vocabularyCreationReversals[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of ["reversalFactId", "personId", "sourceActionId"]) {
    requireString(record, key, label, errors);
  }
  requireDateString(record, "reversedAt", label, errors);
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (record.reason !== "batch_rollback") {
    errors.push(`${label}.reason is unsupported`);
  }
}

function normalizedAiText(value) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/gu, " ")
    .replace(/[\s,，;；:：。.!！?？、]+$/gu, "")
    .trim();
}

function validateBoundedAiText(value, label, maximum, errors) {
  if (!isString(value) || !value.trim()) {
    errors.push(`${label} must be non-blank text`);
    return null;
  }
  const text = value.trim();
  if ([...text].length > maximum) errors.push(`${label} is too long`);
  if (AI_URL_PATTERN.test(text)) errors.push(`${label} must not contain a URL`);
  return text;
}

function validateAiTextArray(
  value,
  label,
  maximumItems,
  maximumLength,
  existing,
  errors,
  rejectErrorMarkers = false,
) {
  if (!isStringArray(value) || value.length > maximumItems) {
    errors.push(`${label} must contain 0 to ${maximumItems} strings`);
    return;
  }
  const seen = new Set(existing.map(normalizedAiText));
  value.forEach((entry, index) => {
    const text = validateBoundedAiText(entry, `${label}[${index}]`, maximumLength, errors);
    if (!text) return;
    if (rejectErrorMarkers && AI_EXAMPLE_ERROR_MARKER_PATTERN.test(text)) {
      errors.push(`${label}[${index}] must not be an error-labelled example`);
    }
    const normalized = normalizedAiText(text);
    if (seen.has(normalized)) errors.push(`${label} must be unique and novel`);
    seen.add(normalized);
  });
}

function validateAiDraftContent(value, label, errors) {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  const expectedKeys = [
    "additionalMeaningsZh",
    "examples",
    "similarWords",
    "confusableWords",
  ].sort();
  if (Object.keys(value).sort().join("|") !== expectedKeys.join("|")) {
    errors.push(`${label} fields do not match the contract`);
  }
  validateAiTextArray(
    value.additionalMeaningsZh,
    `${label}.additionalMeaningsZh`,
    3,
    80,
    [],
    errors,
  );
  validateAiTextArray(value.examples, `${label}.examples`, 3, 240, [], errors, true);
  const candidateWords = new Set();
  if (!Array.isArray(value.similarWords)) {
    errors.push(`${label}.similarWords must be an array`);
  } else if (value.similarWords.length > 3) {
    errors.push(`${label}.similarWords must contain 0 to 3 items`);
  } else {
    value.similarWords.forEach((entry, index) => {
      if (!isRecord(entry) || Object.keys(entry).sort().join("|") !== "differenceZh|word") {
        errors.push(`${label}.similarWords[${index}] is invalid`);
        return;
      }
      const word = validateBoundedAiText(entry.word, `${label}.similarWords[${index}].word`, 80, errors);
      const difference = validateBoundedAiText(
        entry.differenceZh,
        `${label}.similarWords[${index}].differenceZh`,
        180,
        errors,
      );
      if (word && !AI_CANDIDATE_PATTERN.test(word)) {
        errors.push(`${label}.similarWords[${index}].word is not learnable text`);
      }
      const normalized = word ? normalizedAiText(word) : "";
      if (normalized.split(" ").some((token) => token === "vs" || token === "versus")) {
        errors.push(`${label}.similarWords[${index}].word contains a comparison label`);
      }
      if (difference && AI_ERROR_FORM_EXPLANATION_PATTERN.test(difference)) {
        errors.push(
          `${label}.similarWords[${index}].differenceZh describes an incorrect form`,
        );
      }
      if (candidateWords.has(normalized)) errors.push(`${label} candidate words must be unique`);
      candidateWords.add(normalized);
    });
  }
  if (!Array.isArray(value.confusableWords)) {
    errors.push(`${label}.confusableWords must be an array`);
  } else if (value.confusableWords.length > 3) {
    errors.push(`${label}.confusableWords must contain 0 to 3 items`);
  } else {
    value.confusableWords.forEach((entry, index) => {
      if (
        !isRecord(entry) ||
        Object.keys(entry).sort().join("|") !== "differenceZh|examplePair|type|word" ||
        !["spelling", "sound", "usage"].includes(entry.type) ||
        !isStringArray(entry.examplePair) ||
        ![0, 2].includes(Array.isArray(entry.examplePair) ? entry.examplePair.length : -1)
      ) {
        errors.push(`${label}.confusableWords[${index}] is invalid`);
        return;
      }
      const word = validateBoundedAiText(entry.word, `${label}.confusableWords[${index}].word`, 80, errors);
      const difference = validateBoundedAiText(
        entry.differenceZh,
        `${label}.confusableWords[${index}].differenceZh`,
        180,
        errors,
      );
      entry.examplePair.forEach((example, exampleIndex) => {
        const checkedExample = validateBoundedAiText(
          example,
          `${label}.confusableWords[${index}].examplePair[${exampleIndex}]`,
          240,
          errors,
        );
        if (checkedExample && AI_EXAMPLE_ERROR_MARKER_PATTERN.test(checkedExample)) {
          errors.push(
            `${label}.confusableWords[${index}].examplePair[${exampleIndex}] must not be an error-labelled example`,
          );
        }
      });
      if (word && !AI_CANDIDATE_PATTERN.test(word)) {
        errors.push(`${label}.confusableWords[${index}].word is not learnable text`);
      }
      const normalized = word ? normalizedAiText(word) : "";
      if (normalized.split(" ").some((token) => token === "vs" || token === "versus")) {
        errors.push(`${label}.confusableWords[${index}].word contains a comparison label`);
      }
      if (difference && AI_ERROR_FORM_EXPLANATION_PATTERN.test(difference)) {
        errors.push(
          `${label}.confusableWords[${index}].differenceZh describes an incorrect form`,
        );
      }
      if (candidateWords.has(normalized)) errors.push(`${label} candidate words must be unique`);
      candidateWords.add(normalized);
    });
  }
  if (
    Array.isArray(value.similarWords) &&
    Array.isArray(value.confusableWords) &&
    value.similarWords.length + value.confusableWords.length > 3
  ) {
    errors.push(`${label} must contain at most 3 candidates combined`);
  }
}

function validateAiRun(record, index, people, vocabularyItems, errors) {
  const label = `aiRuns[${index}]`;
  if (!isRecord(record)) {
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
  ]) {
    requireString(record, key, label, errors);
    if (isString(record[key]) && !record[key].trim()) {
      errors.push(`${label}.${key} must not be blank`);
    }
  }
  requireDateString(record, "createdAt", label, errors);
  requireDateString(record, "completedAt", label, errors);
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (
    record.sourceVocabularyItemId !== null &&
    !vocabularyItems.has(`${record.personId}:${record.sourceVocabularyItemId}`)
  ) {
    errors.push(`${label}.sourceVocabularyItemId does not match an item`);
  }
  if (
    record.feature !== "enrichment_v1" ||
    !["google-gemini-api", "local-fixture"].includes(record.provider)
  ) {
    errors.push(`${label} provider or feature is unsupported`);
  }
  if (record.status !== "succeeded" || record.structureValidationStatus !== "valid") {
    errors.push(`${label} must be a succeeded, structurally valid retained run`);
  }
  if (!isStringOrNull(record.providerResponseId)) {
    errors.push(`${label}.providerResponseId must be a string or null`);
  }
  for (const key of ["inputTokens", "outputTokens", "thinkingTokens", "totalTokens", "latencyMs"]) {
    if (!isNonNegativeInteger(record[key]) || record[key] > 2_147_483_647) {
      errors.push(`${label}.${key} must be a non-negative database integer`);
    }
  }
  if (
    isNonNegativeInteger(record.inputTokens) &&
    isNonNegativeInteger(record.outputTokens) &&
    isNonNegativeInteger(record.thinkingTokens) &&
    isNonNegativeInteger(record.totalTokens) &&
    record.totalTokens < record.inputTokens + record.outputTokens + record.thinkingTokens
  ) {
    errors.push(`${label}.totalTokens is inconsistent`);
  }
  if (!isFiniteNumber(record.estimatedCostUsd) || record.estimatedCostUsd < 0) {
    errors.push(`${label}.estimatedCostUsd must be a non-negative number`);
  }
  if (record.provider === "local-fixture") {
    const localFixtureIsHonest =
      record.model === "fixture-v1" &&
      record.modelLabel === "Local preview" &&
      record.promptVersion === "local-fixture-v1" &&
      record.disclosureVersion === "local-fixture-no-network-v1" &&
      record.providerResponseId === null &&
      record.inputTokens === 0 &&
      record.outputTokens === 0 &&
      record.thinkingTokens === 0 &&
      record.totalTokens === 0 &&
      record.latencyMs === 0 &&
      record.estimatedCostUsd === 0;
    if (!localFixtureIsHonest) errors.push(`${label} local-fixture lineage is inconsistent`);
  }
  if (
    record.provider === "google-gemini-api" &&
    (
      record.model !== "gemini-3.1-flash-lite" ||
      record.modelLabel !== "Gemini 3.1 Flash-Lite" ||
      !["ai-disclosure-v1", "ai-disclosure-v2", "ai-disclosure-v3"].includes(
        record.disclosureVersion,
      )
    )
  ) {
    errors.push(`${label} Gemini lineage is inconsistent`);
  }
}

function validateAiEnrichmentDraft(record, index, people, vocabularyItems, aiRuns, errors) {
  const label = `aiEnrichmentDrafts[${index}]`;
  if (!isRecord(record)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of ["id", "personId", "sourceVocabularyItemId", "aiRunId"]) {
    requireString(record, key, label, errors);
  }
  for (const key of ["createdAt", "updatedAt", "decidedAt"]) {
    requireDateString(record, key, label, errors);
  }
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  if (!vocabularyItems.has(`${record.personId}:${record.sourceVocabularyItemId}`)) {
    errors.push(`${label}.sourceVocabularyItemId does not match an item`);
  }
  if (!aiRuns.has(`${record.personId}:${record.aiRunId}`)) {
    errors.push(`${label}.aiRunId does not match a retained run`);
  }
  if (record.status !== "accepted") {
    errors.push(`${label}.status must be accepted in a user backup`);
  }
  validateAiDraftContent(record.draft, `${label}.draft`, errors);
  validateAiDraftContent(record.acceptedContent, `${label}.acceptedContent`, errors);
  if (JSON.stringify(record.draft) !== JSON.stringify(record.acceptedContent)) {
    errors.push(`${label}.draft must equal acceptedContent in a user backup`);
  }
}

function validateVocabularyRelation(record, index, people, vocabularyItems, aiRuns, errors) {
  const label = `vocabularyRelations[${index}]`;
  if (!isRecord(record)) {
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
  ]) {
    requireString(record, key, label, errors);
  }
  requireDateString(record, "createdAt", label, errors);
  if (!people.has(record.personId)) {
    errors.push(`${label}.personId does not match a person`);
  }
  for (const key of ["sourceVocabularyItemId", "targetVocabularyItemId"]) {
    if (!vocabularyItems.has(`${record.personId}:${record[key]}`)) {
      errors.push(`${label}.${key} does not match an item`);
    }
  }
  if (record.sourceVocabularyItemId === record.targetVocabularyItemId) {
    errors.push(`${label} must reference two different items`);
  }
  if (!RELATION_TYPES.has(String(record.relationType))) {
    errors.push(`${label}.relationType is unsupported`);
  }
  if (!isStringArray(record.examplePair) || ![0, 2].includes(record.examplePair?.length ?? -1)) {
    errors.push(`${label}.examplePair must be empty or contain two strings`);
  } else {
    record.examplePair.forEach((example, exampleIndex) =>
      validateBoundedAiText(
        example,
        `${label}.examplePair[${exampleIndex}]`,
        240,
        errors,
      ),
    );
  }
  validateBoundedAiText(record.differenceZh, `${label}.differenceZh`, 180, errors);
  if (!aiRuns.has(`${record.personId}:${record.aiRunId}`)) {
    errors.push(`${label}.aiRunId does not match a retained run`);
  }
}

function validateBackup(backup) {
  const errors = [];

  if (!isRecord(backup)) {
    throw new BackupImportPlanError(["Backup root must be an object"]);
  }
  if (backup.format !== BACKUP_FORMAT) {
    errors.push(`format must be ${BACKUP_FORMAT}`);
  }
  if (!SUPPORTED_BACKUP_VERSIONS.has(backup.backupVersion)) {
    errors.push("backupVersion must be 1, 2, or 3");
  }
  if (!isRecord(backup.metadata)) {
    errors.push("metadata must be an object");
  }
  if (!isRecord(backup.data)) {
    errors.push("data must be an object");
  }

  if (errors.length) {
    throw new BackupImportPlanError(errors);
  }

  const { metadata, data } = backup;
  if (metadata.appName !== BACKUP_APP_NAME) {
    errors.push(`metadata.appName must be ${BACKUP_APP_NAME}`);
  }
  if (!isValidDateString(metadata.exportedAt)) {
    errors.push("metadata.exportedAt must be a valid date string");
  }
  if (!isString(metadata.timezone) || metadata.timezone.trim() === "") {
    errors.push("metadata.timezone must be a non-blank string");
  }
  if (!isSupportedSchemaVersion(metadata.schemaVersion)) {
    errors.push(`metadata.schemaVersion must be ${SUPPORTED_SCHEMA_VERSION_LABEL}`);
  }
  if (!isRecord(metadata.counts)) {
    errors.push("metadata.counts must be an object");
  }

  if (!isSupportedSchemaVersion(data.schemaVersion)) {
    errors.push(`data.schemaVersion must be ${SUPPORTED_SCHEMA_VERSION_LABEL}`);
  }
  if (
    isSupportedSchemaVersion(metadata.schemaVersion) &&
    isSupportedSchemaVersion(data.schemaVersion) &&
    metadata.schemaVersion !== data.schemaVersion
  ) {
    errors.push("metadata.schemaVersion must match data.schemaVersion");
  }
  if (!Array.isArray(data.people)) {
    errors.push("data.people must be an array");
  }
  if (!Array.isArray(data.items)) {
    errors.push("data.items must be an array");
  }
  if (!Array.isArray(data.importBatches)) {
    errors.push("data.importBatches must be an array");
  }
  if (!Array.isArray(data.reviewStates)) {
    errors.push("data.reviewStates must be an array");
  }
  if (!Array.isArray(data.reviewEvents)) {
    errors.push("data.reviewEvents must be an array");
  }
  if (!Array.isArray(data.settingsByPerson)) {
    errors.push("data.settingsByPerson must be an array");
  }
  if (data.schemaVersion === 6) {
    for (const key of [
      "dailyStudyDefaults",
      "dailyStudyPlans",
      "vocabularyCreationFacts",
      "vocabularyCreationReversals",
      "aiRuns",
      "aiEnrichmentDrafts",
      "vocabularyRelations",
    ]) {
      if (!Array.isArray(data[key])) {
        errors.push(`data.${key} must be an array`);
      }
    }
  }
  if (!isString(data.selectedPersonId)) {
    errors.push("data.selectedPersonId must be a string");
  }
  if (!isValidDateString(data.updatedAt)) {
    errors.push("data.updatedAt must be a valid date string");
  }

  if (errors.length) {
    throw new BackupImportPlanError(errors);
  }

  data.people.forEach((person, index) => validatePerson(person, index, errors));
  const people = new Set(data.people.filter(isRecord).map((person) => person.id).filter(isString));
  requireUnique([...people], "people.id", errors);
  requireUnique(data.people.filter(isRecord).map((person) => person.slug).filter(isString), "people.slug", errors);
  if (!people.has(data.selectedPersonId)) {
    errors.push("data.selectedPersonId does not match a person");
  }

  data.importBatches.forEach((batch, index) => validateImportBatch(batch, index, people, errors));
  const importBatches = new Set(
    data.importBatches
      .filter(isRecord)
      .map((batch) => `${batch.personId}:${batch.id}`),
  );
  requireUnique([...importBatches], "importBatches person/id pair", errors);

  data.items.forEach((item, index) =>
    validateVocabularyItem(item, index, people, importBatches, data.schemaVersion, errors),
  );
  const vocabularyItems = new Set(
    data.items
      .filter(isRecord)
      .map((item) => `${item.personId}:${item.id}`),
  );
  requireUnique([...vocabularyItems], "items person/id pair", errors);
  const vocabularyItemTracks = new Map(
    data.items
      .filter(isRecord)
      .map((item) => [
        `${item.personId}:${item.id}`,
        data.schemaVersion >= 4 && item.learningTrack === "active" ? "active" : "recognition",
      ]),
  );

  const reviewStateItems = new Set();
  data.reviewStates.forEach((state, index) =>
    validateReviewState(
      state,
      index,
      people,
      vocabularyItems,
      reviewStateItems,
      vocabularyItemTracks,
      data.schemaVersion >= 4 && data.schemaVersion < 6,
      data.schemaVersion === 6,
      errors,
    ),
  );
  requireUnique(
    data.reviewStates.filter(isRecord).map((state) => `${state.personId}:${state.id}`),
    "reviewStates person/id pair",
    errors,
  );

  data.reviewEvents.forEach((event, index) =>
    validateReviewEvent(
      event,
      index,
      people,
      vocabularyItems,
      vocabularyItemTracks,
      data.schemaVersion >= 4 && data.schemaVersion < 6,
      data.schemaVersion === 6,
      errors,
    ),
  );
  requireUnique(
    data.reviewEvents.filter(isRecord).map((event) => `${event.personId}:${event.id}`),
    "reviewEvents person/id pair",
    errors,
  );

  data.settingsByPerson.forEach((settings, index) =>
    validateReviewSettings(settings, index, people, data.schemaVersion >= 4, errors),
  );
  const settingsPeople = data.settingsByPerson
    .filter(isRecord)
    .map((settings) => settings.personId)
    .filter(isString);
  requireUnique(settingsPeople, "settingsByPerson.personId", errors);
  for (const personId of people) {
    if (!settingsPeople.includes(personId)) {
      errors.push(`settingsByPerson missing settings for ${personId}`);
    }
  }

  if (data.schemaVersion === 6) {
    data.dailyStudyDefaults.forEach((record, index) =>
      validateDailyStudyDefault(record, index, people, errors),
    );
    const dailyDefaultKeys = data.dailyStudyDefaults
      .filter(isRecord)
      .map((record) => `${record.personId}:${record.reviewProfile}`);
    requireUnique(dailyDefaultKeys, "dailyStudyDefaults person/profile pair", errors);
    for (const personId of people) {
      for (const reviewProfile of LEARNING_TRACKS) {
        if (!dailyDefaultKeys.includes(`${personId}:${reviewProfile}`)) {
          errors.push(`dailyStudyDefaults missing ${reviewProfile} defaults for ${personId}`);
        }
      }
    }

    data.dailyStudyPlans.forEach((record, index) =>
      validateDailyStudyPlan(record, index, people, errors),
    );
    requireUnique(
      data.dailyStudyPlans
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.reviewProfile}:${record.localDate}`),
      "dailyStudyPlans person/profile/date tuple",
      errors,
    );
    requireUnique(
      data.dailyStudyPlans.filter(isRecord).map((record) => `${record.personId}:${record.id}`),
      "dailyStudyPlans person/id pair",
      errors,
    );

    data.vocabularyCreationFacts.forEach((record, index) =>
      validateCreationFact(record, index, people, errors),
    );
    requireUnique(
      data.vocabularyCreationFacts
        .filter(isRecord)
        .map(
          (record) =>
            `${record.personId}:${record.sourceActionId}:${record.originalVocabularyItemId}`,
        ),
      "vocabularyCreationFacts stable tuple",
      errors,
    );
    requireUnique(
      data.vocabularyCreationFacts
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.creationFactId}`),
      "vocabularyCreationFacts person/id pair",
      errors,
    );
    const creationKindByAction = new Map();
    for (const record of data.vocabularyCreationFacts.filter(isRecord)) {
      const key = `${record.personId}:${record.sourceActionId}`;
      const previousKind = creationKindByAction.get(key);
      if (previousKind && previousKind !== record.sourceKind) {
        errors.push(`vocabularyCreationFacts mix source kinds for ${key}`);
      }
      creationKindByAction.set(key, record.sourceKind);
    }

    data.vocabularyCreationReversals.forEach((record, index) =>
      validateCreationReversal(record, index, people, errors),
    );
    requireUnique(
      data.vocabularyCreationReversals
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.sourceActionId}:${record.reason}`),
      "vocabularyCreationReversals stable tuple",
      errors,
    );
    requireUnique(
      data.vocabularyCreationReversals
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.reversalFactId}`),
      "vocabularyCreationReversals person/id pair",
      errors,
    );
    for (const record of data.vocabularyCreationReversals.filter(isRecord)) {
      if (creationKindByAction.get(`${record.personId}:${record.sourceActionId}`) !== "batch") {
        errors.push(
          `vocabularyCreationReversals action is not a known batch: ${record.personId}:${record.sourceActionId}`,
        );
      }
    }

    const aiRunKeys = data.aiRuns
      .filter(isRecord)
      .map((record) => `${record.personId}:${record.id}`);
    requireUnique(aiRunKeys, "aiRuns person/id pair", errors);
    const aiRuns = new Set(aiRunKeys);
    requireUnique(
      data.aiRuns
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.idempotencyKeyHash}`),
      "aiRuns person/idempotencyKeyHash pair",
      errors,
    );
    data.aiRuns.forEach((record, index) =>
      validateAiRun(record, index, people, vocabularyItems, errors),
    );

    data.aiEnrichmentDrafts.forEach((record, index) =>
      validateAiEnrichmentDraft(
        record,
        index,
        people,
        vocabularyItems,
        aiRuns,
        errors,
      ),
    );
    requireUnique(
      data.aiEnrichmentDrafts
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.id}`),
      "aiEnrichmentDrafts person/id pair",
      errors,
    );

    data.vocabularyRelations.forEach((record, index) =>
      validateVocabularyRelation(record, index, people, vocabularyItems, aiRuns, errors),
    );
    requireUnique(
      data.vocabularyRelations
        .filter(isRecord)
        .map((record) => `${record.personId}:${record.id}`),
      "vocabularyRelations person/id pair",
      errors,
    );
    requireUnique(
      data.vocabularyRelations
        .filter(isRecord)
        .map(
          (record) =>
            `${record.personId}:${record.sourceVocabularyItemId}:${record.targetVocabularyItemId}:${record.relationType}`,
        ),
      "vocabularyRelations stable tuple",
      errors,
    );

    requireUnique(
      data.reviewEvents
        .filter((event) => isRecord(event) && isString(event.promptId))
        .map((event) => `${event.personId}:${event.promptId}`),
      "reviewEvents person/promptId pair",
      errors,
    );
  }

  if (isRecord(metadata.counts)) {
    compareCounts(metadata.counts, actualCounts(data), errors);
  }

  if (errors.length) {
    throw new BackupImportPlanError(errors);
  }
}

function mapSourceIds(records, personMap, uuidFactory) {
  return mapSourceIdsBy(records, personMap, "id", uuidFactory);
}

function mapSourceIdsBy(records, personMap, idKey, uuidFactory) {
  const result = new Map();
  for (const record of records) {
    const personId = personMap.get(record.personId);
    const sourceId = record[idKey];
    result.set(`${record.personId}:${sourceId}`, {
      sourceId,
      sourcePersonId: record.personId,
      targetId: uuidFactory(),
      targetPersonId: personId,
    });
  }
  return result;
}

function lookup(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing target mapping for ${label}: ${key}`);
  }
  return value;
}

function createMappingRow({
  uuidFactory,
  importedAt,
  backupImportByPerson,
  targetPersonId,
  sourcePersonId,
  entityType,
  sourceId,
  targetId,
}) {
  return {
    id: uuidFactory(),
    personId: targetPersonId,
    backupImportId: backupImportByPerson.get(sourcePersonId),
    entityType,
    sourceId,
    targetId,
    createdAt: importedAt,
  };
}

function normalizeTextList(value) {
  const source = Array.isArray(value) ? value : [value];

  return source
    .filter(isString)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function textListOrLegacy(value, legacyValue) {
  const list = normalizeTextList(value);

  return list.length ? list : normalizeTextList(legacyValue);
}

function normalizeLearningTrackForImport(item, sourceSchemaVersion) {
  if (sourceSchemaVersion >= 4 && item.learningTrack === "active") {
    return "active";
  }

  return "recognition";
}

function normalizeTagsForImport(item, sourceSchemaVersion) {
  if (sourceSchemaVersion < 4 || !Array.isArray(item.tags)) {
    return null;
  }

  return item.tags;
}

function normalizeReviewSettingsForImport(settings) {
  const recognitionSessionLimit = settings.recognitionSessionLimit ?? settings.sessionLimit;
  const activeSessionLimit = settings.activeSessionLimit ?? DEFAULT_ACTIVE_SESSION_LIMIT;

  return {
    personId: settings.personId,
    sessionLimit: recognitionSessionLimit,
    recognitionSessionLimit,
    activeSessionLimit,
    timezone: settings.timezone,
    updatedAt: settings.updatedAt,
  };
}

function normalizeDailyStudyDefaultsForImport(data) {
  if (data.schemaVersion === 6) {
    return data.dailyStudyDefaults;
  }

  return data.settingsByPerson.flatMap((settings) => {
    const normalized = normalizeReviewSettingsForImport(settings);

    return [
      {
        personId: settings.personId,
        reviewProfile: "recognition",
        reviewGoal: normalized.recognitionSessionLimit,
        newWordGoal: 0,
        timezone: normalized.timezone,
        updatedAt: normalized.updatedAt,
      },
      {
        personId: settings.personId,
        reviewProfile: "active",
        reviewGoal: normalized.activeSessionLimit,
        newWordGoal: 0,
        timezone: normalized.timezone,
        updatedAt: normalized.updatedAt,
      },
    ];
  });
}

function normalizeCreationFactsForImport(data) {
  if (data.schemaVersion === 6) {
    return data.vocabularyCreationFacts;
  }

  return data.items.map((item) => ({
    creationFactId: `legacy_creation_fact:${item.id}`,
    personId: item.personId,
    originalVocabularyItemId: item.id,
    sourceActionId: item.importBatchId ?? item.id,
    trackAtCreation: normalizeLearningTrackForImport(item, data.schemaVersion),
    sourceKind: item.importBatchId ? "batch" : "single",
    historyOrigin: "legacy_backfill",
    systemCreatedAt: item.systemCreatedAt,
  }));
}

function earliestReviewEventByItem(data) {
  const result = new Map();

  for (const event of data.reviewEvents) {
    const key = `${event.personId}:${event.vocabularyItemId}`;
    const previous = result.get(key);
    if (!previous || Date.parse(event.reviewedAt) < Date.parse(previous)) {
      result.set(key, event.reviewedAt);
    }
  }

  return result;
}

export function buildBackupImportPlan(backup, options = {}) {
  validateBackup(backup);

  const uuidFactory = options.uuidFactory ?? randomUUID;
  const importedAt = options.importedAt ?? new Date().toISOString();
  const sourceFileName = options.sourceFileName ?? null;
  const notes = options.notes ?? "Stage 5L fixture import trial";
  const { metadata, data } = backup;
  const sourceDailyStudyDefaults = normalizeDailyStudyDefaultsForImport(data);
  const sourceDailyStudyPlans = data.schemaVersion === 6 ? data.dailyStudyPlans : [];
  const sourceCreationFacts = normalizeCreationFactsForImport(data);
  const sourceCreationReversals =
    data.schemaVersion === 6 ? data.vocabularyCreationReversals : [];
  const sourceAiRuns = data.schemaVersion === 6 ? data.aiRuns : [];
  const sourceAiEnrichmentDrafts = data.schemaVersion === 6 ? data.aiEnrichmentDrafts : [];
  const sourceVocabularyRelations = data.schemaVersion === 6 ? data.vocabularyRelations : [];
  const earliestReviewEvents = earliestReviewEventByItem(data);
  const personMap = new Map(data.people.map((person) => [person.id, uuidFactory()]));
  const importBatchMap = mapSourceIds(data.importBatches, personMap, uuidFactory);
  const vocabularyItemMap = mapSourceIds(data.items, personMap, uuidFactory);
  const reviewStateMap = mapSourceIds(data.reviewStates, personMap, uuidFactory);
  const reviewEventMap = mapSourceIds(data.reviewEvents, personMap, uuidFactory);
  const dailyStudyPlanMap = mapSourceIds(sourceDailyStudyPlans, personMap, uuidFactory);
  const creationFactMap = mapSourceIdsBy(
    sourceCreationFacts,
    personMap,
    "creationFactId",
    uuidFactory,
  );
  const creationReversalMap = mapSourceIdsBy(
    sourceCreationReversals,
    personMap,
    "reversalFactId",
    uuidFactory,
  );
  const aiRunMap = mapSourceIds(sourceAiRuns, personMap, uuidFactory);
  const aiEnrichmentDraftMap = mapSourceIds(
    sourceAiEnrichmentDrafts,
    personMap,
    uuidFactory,
  );
  const vocabularyRelationMap = mapSourceIds(
    sourceVocabularyRelations,
    personMap,
    uuidFactory,
  );
  const originalVocabularyItemMap = new Map(vocabularyItemMap);
  const sourceActionMap = new Map();

  for (const fact of sourceCreationFacts) {
    const originalKey = `${fact.personId}:${fact.originalVocabularyItemId}`;
    if (!originalVocabularyItemMap.has(originalKey)) {
      originalVocabularyItemMap.set(originalKey, {
        sourceId: fact.originalVocabularyItemId,
        sourcePersonId: fact.personId,
        targetId: uuidFactory(),
        targetPersonId: lookup(personMap, fact.personId, "creation fact person"),
      });
    }

    const actionKey = `${fact.personId}:${fact.sourceActionId}`;
    if (!sourceActionMap.has(actionKey)) {
      const importedBatch = importBatchMap.get(actionKey);
      const importedItem = originalVocabularyItemMap.get(actionKey);
      const importedDraft = aiEnrichmentDraftMap.get(actionKey);
      const mappedActionId =
        fact.sourceKind === "batch"
          ? importedBatch?.targetId
          : fact.sourceKind === "ai_add_to_learning"
            ? importedDraft?.targetId
            : importedItem?.targetId;
      sourceActionMap.set(
        actionKey,
        mappedActionId ?? uuidFactory(),
      );
    }
  }
  const backupImportByPerson = new Map(
    data.people.map((person) => [person.id, uuidFactory()]),
  );

  const rows = {
    people: data.people.map((person) => ({
      id: lookup(personMap, person.id, "person"),
      displayName: person.displayName,
      slug: person.slug,
      isActive: person.isActive,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    })),
    importBatches: data.importBatches.map((batch) => {
      const mapping = lookup(importBatchMap, `${batch.personId}:${batch.id}`, "import batch");

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        sourceType: batch.sourceType,
        fileName: batch.fileName,
        createdAt: batch.createdAt,
        totalRows: batch.totalRows,
        acceptedRows: batch.acceptedRows,
        duplicateRows: batch.duplicateRows,
        invalidRows: batch.invalidRows,
      };
    }),
    vocabularyItems: data.items.map((item) => {
      const mapping = lookup(vocabularyItemMap, `${item.personId}:${item.id}`, "vocabulary item");
      const importBatch = item.importBatchId
        ? lookup(importBatchMap, `${item.personId}:${item.importBatchId}`, "vocabulary item import batch")
        : null;

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        surfaceText: item.surfaceText,
        normalizedText: item.normalizedText,
        meaningZh: item.meaningZh,
        meaningsZh: textListOrLegacy(item.meaningsZh, item.meaningZh),
        example: item.example,
        examples: textListOrLegacy(item.examples, item.example),
        notes: item.notes,
        rarityScore: item.rarityScore,
        learningTrack: normalizeLearningTrackForImport(item, data.schemaVersion),
        tags: normalizeTagsForImport(item, data.schemaVersion),
        source: item.source,
        importBatchId: importBatch?.targetId ?? null,
        status: item.status,
        createdAt: item.createdAt,
        systemCreatedAt: item.systemCreatedAt,
        updatedAt: item.updatedAt,
        timezone: item.timezone,
        archivedAt: item.archivedAt,
      };
    }),
    reviewStates: data.reviewStates.map((state) => {
      const mapping = lookup(reviewStateMap, `${state.personId}:${state.id}`, "review state");
      const item = lookup(vocabularyItemMap, `${state.personId}:${state.vocabularyItemId}`, "review state item");
      const firstRatedAt =
        data.schemaVersion === 6
          ? state.firstRatedAt
          : (earliestReviewEvents.get(`${state.personId}:${state.vocabularyItemId}`) ?? null);

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        vocabularyItemId: item.targetId,
        reviewProfile: data.schemaVersion === 6 ? state.reviewProfile : "recognition",
        parameterSetId:
          data.schemaVersion === 6 ? state.parameterSetId : "recognition-fsrs-v1",
        firstRatedAt,
        historyOrigin:
          data.schemaVersion === 6
            ? state.historyOrigin
            : firstRatedAt
              ? "recorded"
              : "legacy_unknown",
        status: state.status,
        dueAt: state.dueAt,
        lastReviewedAt: state.lastReviewedAt,
        reviewCount: state.reviewCount,
        lapseCount: state.lapseCount,
        intervalMinutes: state.intervalMinutes,
        difficulty: state.difficulty,
        stability: state.stability,
        updatedAt: state.updatedAt,
      };
    }),
    reviewEvents: data.reviewEvents.map((event) => {
      const mapping = lookup(reviewEventMap, `${event.personId}:${event.id}`, "review event");
      const item = lookup(vocabularyItemMap, `${event.personId}:${event.vocabularyItemId}`, "review event item");

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        vocabularyItemId: item.targetId,
        promptId:
          data.schemaVersion === 6 && event.promptId
            ? uuidFactory()
            : null,
        reviewProfile: data.schemaVersion === 6 ? event.reviewProfile : "recognition",
        activityType: data.schemaVersion === 6 ? event.activityType : "recognition_card",
        answerOutcome: data.schemaVersion === 6 ? event.answerOutcome : "self_rated",
        answerNormalizationVersion:
          data.schemaVersion === 6 ? event.answerNormalizationVersion : null,
        targetRevision: data.schemaVersion === 6 ? event.targetRevision : null,
        parameterSetId:
          data.schemaVersion === 6 ? event.parameterSetId : "recognition-fsrs-v1",
        reviewedAt: event.reviewedAt,
        rating: event.rating,
        previousDueAt: event.previousDueAt,
        nextDueAt: event.nextDueAt,
        previousIntervalMinutes: event.previousIntervalMinutes,
        nextIntervalMinutes: event.nextIntervalMinutes,
        elapsedMs: event.elapsedMs,
      };
    }),
    reviewSettings: data.settingsByPerson.map((settings) => {
      const normalizedSettings = normalizeReviewSettingsForImport(settings);

      return {
        personId: lookup(personMap, settings.personId, "review settings person"),
        sessionLimit: normalizedSettings.sessionLimit,
        recognitionSessionLimit: normalizedSettings.recognitionSessionLimit,
        activeSessionLimit: normalizedSettings.activeSessionLimit,
        timezone: normalizedSettings.timezone,
        updatedAt: normalizedSettings.updatedAt,
      };
    }),
    dailyStudyDefaults: sourceDailyStudyDefaults.map((record) => ({
      personId: lookup(personMap, record.personId, "daily defaults person"),
      reviewProfile: record.reviewProfile,
      reviewGoal: record.reviewGoal,
      newWordGoal: record.newWordGoal,
      timezone: record.timezone,
      updatedAt: record.updatedAt,
    })),
    dailyStudyPlans: sourceDailyStudyPlans.map((record) => {
      const mapping = lookup(
        dailyStudyPlanMap,
        `${record.personId}:${record.id}`,
        "daily study plan",
      );

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        reviewProfile: record.reviewProfile,
        localDate: record.localDate,
        timezone: record.timezone,
        dayStartsAt: record.dayStartsAt,
        dayEndsAt: record.dayEndsAt,
        suggestedReview: record.suggestedReview,
        reviewGoal: record.reviewGoal,
        newWordGoal: record.newWordGoal,
        planVersion: record.planVersion,
        recommendationVersion: record.recommendationVersion,
        calculatedAt: record.calculatedAt,
        updatedAt: record.updatedAt,
      };
    }),
    vocabularyCreationFacts: sourceCreationFacts.map((record) => {
      const mapping = lookup(
        creationFactMap,
        `${record.personId}:${record.creationFactId}`,
        "vocabulary creation fact",
      );
      const originalItem = lookup(
        originalVocabularyItemMap,
        `${record.personId}:${record.originalVocabularyItemId}`,
        "creation fact original item",
      );

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        originalVocabularyItemId: originalItem.targetId,
        sourceActionId: lookup(
          sourceActionMap,
          `${record.personId}:${record.sourceActionId}`,
          "creation fact source action",
        ),
        trackAtCreation: record.trackAtCreation,
        sourceKind: record.sourceKind,
        historyOrigin: record.historyOrigin,
        systemCreatedAt: record.systemCreatedAt,
      };
    }),
    vocabularyCreationReversals: sourceCreationReversals.map((record) => {
      const mapping = lookup(
        creationReversalMap,
        `${record.personId}:${record.reversalFactId}`,
        "vocabulary creation reversal",
      );

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        sourceActionId: lookup(
          sourceActionMap,
          `${record.personId}:${record.sourceActionId}`,
          "creation reversal source action",
        ),
        reason: record.reason,
        reversedAt: record.reversedAt,
      };
    }),
    aiRuns: sourceAiRuns.map((record) => {
      const mapping = lookup(aiRunMap, `${record.personId}:${record.id}`, "AI run");
      const sourceItem = record.sourceVocabularyItemId
        ? lookup(
            vocabularyItemMap,
            `${record.personId}:${record.sourceVocabularyItemId}`,
            "AI run source item",
          )
        : null;

      return {
        ...record,
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        sourceVocabularyItemId: sourceItem?.targetId ?? null,
      };
    }),
    aiEnrichmentDrafts: sourceAiEnrichmentDrafts.map((record) => {
      const mapping = lookup(
        aiEnrichmentDraftMap,
        `${record.personId}:${record.id}`,
        "AI enrichment draft",
      );
      const sourceItem = lookup(
        vocabularyItemMap,
        `${record.personId}:${record.sourceVocabularyItemId}`,
        "AI enrichment source item",
      );
      const aiRun = lookup(aiRunMap, `${record.personId}:${record.aiRunId}`, "AI draft run");

      return {
        ...record,
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        sourceVocabularyItemId: sourceItem.targetId,
        aiRunId: aiRun.targetId,
      };
    }),
    vocabularyRelations: sourceVocabularyRelations.map((record) => {
      const mapping = lookup(
        vocabularyRelationMap,
        `${record.personId}:${record.id}`,
        "vocabulary relation",
      );
      const sourceItem = lookup(
        vocabularyItemMap,
        `${record.personId}:${record.sourceVocabularyItemId}`,
        "relation source item",
      );
      const targetItem = lookup(
        vocabularyItemMap,
        `${record.personId}:${record.targetVocabularyItemId}`,
        "relation target item",
      );
      const aiRun = lookup(aiRunMap, `${record.personId}:${record.aiRunId}`, "relation AI run");

      return {
        ...record,
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        sourceVocabularyItemId: sourceItem.targetId,
        targetVocabularyItemId: targetItem.targetId,
        aiRunId: aiRun.targetId,
      };
    }),
    backupImports: data.people.map((person) => {
      const personId = lookup(personMap, person.id, "backup import person");

      return {
        id: lookup(backupImportByPerson, person.id, "backup import"),
        personId,
        sourceFileName,
        sourceExportedAt: metadata.exportedAt,
        importedAt,
        schemaVersion: data.schemaVersion,
        itemCount: data.items.filter((item) => item.personId === person.id).length,
        reviewEventCount: data.reviewEvents.filter((event) => event.personId === person.id).length,
        notes,
      };
    }),
    backupImportMappings: [],
  };

  for (const person of data.people) {
    const targetPersonId = lookup(personMap, person.id, "person mapping");
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId,
        sourcePersonId: person.id,
        entityType: "person",
        sourceId: person.id,
        targetId: targetPersonId,
      }),
    );
  }
  for (const mapping of importBatchMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "import_batch",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of vocabularyItemMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "vocabulary_item",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of reviewStateMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "review_state",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of reviewEventMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "review_event",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const settings of data.settingsByPerson) {
    const targetPersonId = lookup(personMap, settings.personId, "review settings mapping");
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId,
        sourcePersonId: settings.personId,
        entityType: "review_settings",
        sourceId: settings.personId,
        targetId: targetPersonId,
      }),
    );
  }
  for (const defaults of sourceDailyStudyDefaults) {
    const targetPersonId = lookup(personMap, defaults.personId, "daily defaults mapping");
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId,
        sourcePersonId: defaults.personId,
        entityType: "daily_study_default",
        sourceId: `${defaults.personId}:${defaults.reviewProfile}`,
        targetId: targetPersonId,
      }),
    );
  }
  for (const mapping of dailyStudyPlanMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "daily_study_plan",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of creationFactMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "vocabulary_creation_fact",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of creationReversalMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "vocabulary_creation_reversal",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of aiRunMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "ai_run",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of aiEnrichmentDraftMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "ai_enrichment_draft",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }
  for (const mapping of vocabularyRelationMap.values()) {
    rows.backupImportMappings.push(
      createMappingRow({
        uuidFactory,
        importedAt,
        backupImportByPerson,
        targetPersonId: mapping.targetPersonId,
        sourcePersonId: mapping.sourcePersonId,
        entityType: "vocabulary_relation",
        sourceId: mapping.sourceId,
        targetId: mapping.targetId,
      }),
    );
  }

  return {
    mode: "workspace",
    sourceSchemaVersion: data.schemaVersion,
    sourceFileName,
    sourceExportedAt: metadata.exportedAt,
    importedAt,
    selectedSourcePersonId: data.selectedPersonId,
    counts: {
      people: rows.people.length,
      importBatches: rows.importBatches.length,
      vocabularyItems: rows.vocabularyItems.length,
      reviewStates: rows.reviewStates.length,
      reviewEvents: rows.reviewEvents.length,
      reviewSettings: rows.reviewSettings.length,
      dailyStudyDefaults: rows.dailyStudyDefaults.length,
      dailyStudyPlans: rows.dailyStudyPlans.length,
      vocabularyCreationFacts: rows.vocabularyCreationFacts.length,
      vocabularyCreationReversals: rows.vocabularyCreationReversals.length,
      aiRuns: rows.aiRuns.length,
      aiEnrichmentDrafts: rows.aiEnrichmentDrafts.length,
      vocabularyRelations: rows.vocabularyRelations.length,
      backupImports: rows.backupImports.length,
      backupImportMappings: rows.backupImportMappings.length,
    },
    perPersonCounts: data.people.map((person) => ({
      sourcePersonId: person.id,
      targetPersonId: lookup(personMap, person.id, "per-person count"),
      backupImportId: lookup(backupImportByPerson, person.id, "per-person import"),
      itemCount: data.items.filter((item) => item.personId === person.id).length,
      reviewEventCount: data.reviewEvents.filter((event) => event.personId === person.id).length,
    })),
    rows,
  };
}

export function buildBackupImportPlanFromText(text, options = {}) {
  if (!text.trim()) {
    throw new BackupImportPlanError(["Backup file is empty"]);
  }

  try {
    return buildBackupImportPlan(JSON.parse(text), options);
  } catch (error) {
    if (error instanceof BackupImportPlanError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new BackupImportPlanError(["Backup file is not valid JSON"]);
    }
    throw error;
  }
}

export function createStage5LFixtureBackup() {
  const createdAt = "2026-07-05T05:30:00.000Z";
  const reviewedAt = "2026-07-05T05:35:00.000Z";
  const dueAt = "2026-07-06T05:35:00.000Z";
  const personId = "person_stage5l_fixture";
  const itemId = "vocab_stage5l_fixture";
  const batchId = "batch_stage5l_fixture";
  const stateId = "review_state_stage5l_fixture";
  const eventId = "review_event_stage5l_fixture";
  const data = {
    schemaVersion: 3,
    people: [
      {
        id: personId,
        displayName: "Stage 5L Fixture",
        slug: "stage5l-fixture",
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    selectedPersonId: personId,
    items: [
      {
        id: itemId,
        personId,
        surfaceText: "stage five import",
        normalizedText: "stage five import",
        meaningZh: "Stage 5L import fixture",
        example: "This fixture proves backup import mapping without persisting trial rows.",
        notes: "Stage 5L fixture",
        rarityScore: 3,
        source: "txt_file",
        importBatchId: batchId,
        status: "new",
        createdAt,
        systemCreatedAt: createdAt,
        updatedAt: createdAt,
        timezone: "Australia/Melbourne",
        archivedAt: null,
      },
    ],
    importBatches: [
      {
        id: batchId,
        personId,
        sourceType: "txt_file",
        fileName: "stage5l-fixture.txt",
        createdAt,
        totalRows: 1,
        acceptedRows: 1,
        duplicateRows: 0,
        invalidRows: 0,
      },
    ],
    reviewStates: [
      {
        id: stateId,
        personId,
        vocabularyItemId: itemId,
        status: "learning",
        dueAt,
        lastReviewedAt: reviewedAt,
        reviewCount: 1,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: null,
        stability: null,
        updatedAt: reviewedAt,
      },
    ],
    reviewEvents: [
      {
        id: eventId,
        personId,
        vocabularyItemId: itemId,
        reviewedAt,
        rating: "remembered",
        previousDueAt: null,
        nextDueAt: dueAt,
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 0,
      },
    ],
    settingsByPerson: [
      {
        personId,
        sessionLimit: 12,
        timezone: "Australia/Melbourne",
        updatedAt: createdAt,
      },
    ],
    updatedAt: reviewedAt,
  };

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt: reviewedAt,
      timezone: "Australia/Melbourne",
      schemaVersion: data.schemaVersion,
      counts: actualCounts(data),
    },
    data,
  };
}

export function createStage6BP1ESchema5FixtureBackup() {
  const createdAt = "2026-07-09T01:10:00.000Z";
  const reviewedAt = "2026-07-09T01:20:00.000Z";
  const dueAt = "2026-07-10T00:00:00.000Z";
  const personId = "person_stage6b_p1e_schema5_fixture";
  const recognitionItemId = "vocab_stage6b_p1e_schema5_recognition";
  const activeItemId = "vocab_stage6b_p1e_schema5_active";
  const batchId = "batch_stage6b_p1e_schema5_fixture";
  const stateId = "review_state_stage6b_p1e_schema5_recognition";
  const eventId = "review_event_stage6b_p1e_schema5_recognition";
  const data = {
    schemaVersion: 5,
    people: [
      {
        id: personId,
        displayName: "Stage 6B P1-E Schema 5 Fixture",
        slug: "stage6b-p1e-schema5-fixture",
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    selectedPersonId: personId,
    items: [
      {
        id: recognitionItemId,
        personId,
        surfaceText: "allocate",
        normalizedText: "allocate",
        meaningZh: "分配",
        meaningsZh: ["分配", "划拨"],
        example: "Allocate time wisely.",
        examples: [
          "Allocate time wisely.",
          "The manager allocated extra resources to the project.",
        ],
        notes: "Recognition item with multiple meanings and examples.",
        rarityScore: 3,
        learningTrack: "recognition",
        tags: ["PTE", "Writing"],
        source: "json_paste",
        importBatchId: batchId,
        status: "new",
        createdAt,
        systemCreatedAt: createdAt,
        updatedAt: createdAt,
        timezone: "Australia/Melbourne",
        archivedAt: null,
      },
      {
        id: activeItemId,
        personId,
        surfaceText: "coherent",
        normalizedText: "coherent",
        meaningZh: "连贯的",
        meaningsZh: ["连贯的", "条理清楚的"],
        example: "Write a coherent paragraph.",
        examples: [
          "Write a coherent paragraph.",
          "A coherent response is easier to follow.",
        ],
        notes: "Active item is stored and mapped but has no V1 review rows.",
        rarityScore: null,
        learningTrack: "active",
        tags: ["PTE", "Writing"],
        source: "json_paste",
        importBatchId: batchId,
        status: "new",
        createdAt,
        systemCreatedAt: createdAt,
        updatedAt: createdAt,
        timezone: "Australia/Melbourne",
        archivedAt: null,
      },
    ],
    importBatches: [
      {
        id: batchId,
        personId,
        sourceType: "json_paste",
        fileName: null,
        createdAt,
        totalRows: 2,
        acceptedRows: 2,
        duplicateRows: 0,
        invalidRows: 0,
      },
    ],
    reviewStates: [
      {
        id: stateId,
        personId,
        vocabularyItemId: recognitionItemId,
        status: "review",
        dueAt,
        lastReviewedAt: reviewedAt,
        reviewCount: 2,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: 4.2,
        stability: 1.35,
        updatedAt: reviewedAt,
      },
    ],
    reviewEvents: [
      {
        id: eventId,
        personId,
        vocabularyItemId: recognitionItemId,
        reviewedAt,
        rating: "remembered",
        previousDueAt: "2026-07-09T00:00:00.000Z",
        nextDueAt: dueAt,
        previousIntervalMinutes: 720,
        nextIntervalMinutes: 1440,
        elapsedMs: 6200,
      },
    ],
    settingsByPerson: [
      {
        personId,
        sessionLimit: 18,
        recognitionSessionLimit: 18,
        activeSessionLimit: 6,
        timezone: "Australia/Melbourne",
        updatedAt: createdAt,
      },
    ],
    updatedAt: reviewedAt,
  };

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt: reviewedAt,
      timezone: "Australia/Melbourne",
      schemaVersion: data.schemaVersion,
      counts: actualCounts(data),
    },
    data,
  };
}

export function createV2Stage3Schema6FixtureBackup() {
  const createdAt = "2026-07-13T10:00:00.000Z";
  const reviewedAt = "2026-07-13T10:15:00.000Z";
  const activeReviewedAt = "2026-07-13T10:20:00.000Z";
  const dueAt = "2026-07-14T00:00:00.000Z";
  const personId = "person_v2_stage3_schema6_fixture";
  const recognitionItemId = "vocab_v2_stage3_adapt";
  const activeItemId = "vocab_v2_stage3_adopt";
  const aiRunId = "ai_run_v2_stage3_adapt";
  const aiDraftId = "ai_draft_v2_stage3_adapt";
  const acceptedDraft = {
    additionalMeaningsZh: ["改编"],
    examples: ["People adapt gradually."],
    similarWords: [],
    confusableWords: [
      {
        word: "adopt",
        type: "spelling",
        differenceZh: "adapt 表示适应，adopt 表示采纳或收养。",
        examplePair: ["We adapt to change.", "We adopt a new policy."],
      },
    ],
  };
  const data = {
    schemaVersion: 6,
    people: [
      {
        id: personId,
        displayName: "V2 Stage 3 Schema 6 Fixture",
        slug: "v2-stage3-schema6-fixture",
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    selectedPersonId: personId,
    items: [
      {
        id: recognitionItemId,
        personId,
        surfaceText: "adapt",
        normalizedText: "adapt",
        meaningZh: "适应",
        meaningsZh: ["适应"],
        example: "It takes time to adapt to a new routine.",
        examples: ["It takes time to adapt to a new routine."],
        notes: "",
        rarityScore: 2,
        learningTrack: "recognition",
        tags: ["PTE"],
        source: "manual",
        importBatchId: null,
        status: "new",
        createdAt,
        systemCreatedAt: createdAt,
        updatedAt: createdAt,
        timezone: "Australia/Melbourne",
        archivedAt: null,
      },
      {
        id: activeItemId,
        personId,
        surfaceText: "adopt",
        normalizedText: "adopt",
        meaningZh: "采纳；收养",
        meaningsZh: ["采纳", "收养"],
        example: "We adopted a new policy.",
        examples: ["We adopted a new policy."],
        notes: "Added from an accepted AI suggestion.",
        rarityScore: null,
        learningTrack: "active",
        tags: ["PTE", "Spelling Risk"],
        source: "ai_generated",
        importBatchId: null,
        status: "new",
        createdAt,
        systemCreatedAt: createdAt,
        updatedAt: createdAt,
        timezone: "Australia/Melbourne",
        archivedAt: null,
      },
    ],
    importBatches: [],
    reviewStates: [
      {
        id: "review_state_v2_stage3_adapt",
        personId,
        vocabularyItemId: recognitionItemId,
        reviewProfile: "recognition",
        parameterSetId: "recognition-fsrs-v1",
        firstRatedAt: reviewedAt,
        historyOrigin: "recorded",
        status: "review",
        dueAt,
        lastReviewedAt: reviewedAt,
        reviewCount: 1,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: 4.1,
        stability: 1.2,
        updatedAt: reviewedAt,
      },
      {
        id: "review_state_v2_stage3_adopt",
        personId,
        vocabularyItemId: activeItemId,
        reviewProfile: "active",
        parameterSetId: "active-fsrs-v1",
        firstRatedAt: activeReviewedAt,
        historyOrigin: "recorded",
        status: "learning",
        dueAt,
        lastReviewedAt: activeReviewedAt,
        reviewCount: 1,
        lapseCount: 0,
        intervalMinutes: 1440,
        difficulty: 5.2,
        stability: 0.9,
        updatedAt: activeReviewedAt,
      },
    ],
    reviewEvents: [
      {
        id: "review_event_v2_stage3_adapt",
        promptId: "prompt_v2_stage3_adapt",
        personId,
        vocabularyItemId: recognitionItemId,
        reviewProfile: "recognition",
        activityType: "recognition_card",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        targetRevision: null,
        parameterSetId: "recognition-fsrs-v1",
        reviewedAt,
        rating: "remembered",
        previousDueAt: null,
        nextDueAt: dueAt,
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 4200,
      },
      {
        id: "review_event_v2_stage3_adopt",
        promptId: "prompt_v2_stage3_adopt",
        personId,
        vocabularyItemId: activeItemId,
        reviewProfile: "active",
        activityType: "dictation",
        answerOutcome: "exact",
        answerNormalizationVersion: "active-answer-v1",
        targetRevision: "adopt:v1",
        parameterSetId: "active-fsrs-v1",
        reviewedAt: activeReviewedAt,
        rating: "remembered",
        previousDueAt: null,
        nextDueAt: dueAt,
        previousIntervalMinutes: null,
        nextIntervalMinutes: 1440,
        elapsedMs: 6100,
      },
    ],
    settingsByPerson: [
      {
        personId,
        sessionLimit: 20,
        recognitionSessionLimit: 20,
        activeSessionLimit: 10,
        timezone: "Australia/Melbourne",
        updatedAt: createdAt,
      },
    ],
    dailyStudyDefaults: [
      {
        personId,
        reviewProfile: "recognition",
        reviewGoal: 20,
        newWordGoal: 8,
        timezone: "Australia/Melbourne",
        updatedAt: createdAt,
      },
      {
        personId,
        reviewProfile: "active",
        reviewGoal: 10,
        newWordGoal: 4,
        timezone: "Australia/Melbourne",
        updatedAt: createdAt,
      },
    ],
    dailyStudyPlans: [
      {
        id: "daily_plan_v2_stage3_recognition",
        personId,
        reviewProfile: "recognition",
        localDate: "2026-07-13",
        timezone: "Australia/Melbourne",
        dayStartsAt: "2026-07-12T14:00:00.000Z",
        dayEndsAt: "2026-07-13T14:00:00.000Z",
        suggestedReview: 13,
        reviewGoal: 20,
        newWordGoal: 8,
        planVersion: 1,
        recommendationVersion: "suggested-review-v1",
        calculatedAt: createdAt,
        updatedAt: createdAt,
      },
      {
        id: "daily_plan_v2_stage3_active",
        personId,
        reviewProfile: "active",
        localDate: "2026-07-13",
        timezone: "Australia/Melbourne",
        dayStartsAt: "2026-07-12T14:00:00.000Z",
        dayEndsAt: "2026-07-13T14:00:00.000Z",
        suggestedReview: 5,
        reviewGoal: 10,
        newWordGoal: 4,
        planVersion: 1,
        recommendationVersion: "suggested-review-v1",
        calculatedAt: createdAt,
        updatedAt: createdAt,
      },
    ],
    vocabularyCreationFacts: [
      {
        creationFactId: "creation_fact_v2_stage3_adapt",
        personId,
        originalVocabularyItemId: recognitionItemId,
        sourceActionId: recognitionItemId,
        trackAtCreation: "recognition",
        sourceKind: "single",
        historyOrigin: "recorded",
        systemCreatedAt: createdAt,
      },
      {
        creationFactId: "creation_fact_v2_stage3_adopt",
        personId,
        originalVocabularyItemId: activeItemId,
        sourceActionId: aiDraftId,
        trackAtCreation: "active",
        sourceKind: "ai_add_to_learning",
        historyOrigin: "recorded",
        systemCreatedAt: createdAt,
      },
      {
        creationFactId: "creation_fact_v2_stage3_deleted_batch_item",
        personId,
        originalVocabularyItemId: "deleted_batch_item_v2_stage3",
        sourceActionId: "batch_action_v2_stage3",
        trackAtCreation: "recognition",
        sourceKind: "batch",
        historyOrigin: "recorded",
        systemCreatedAt: createdAt,
      },
    ],
    vocabularyCreationReversals: [
      {
        reversalFactId: "reversal_fact_v2_stage3_batch",
        personId,
        sourceActionId: "batch_action_v2_stage3",
        reason: "batch_rollback",
        reversedAt: reviewedAt,
      },
    ],
    aiRuns: [
      {
        id: aiRunId,
        personId,
        sourceVocabularyItemId: recognitionItemId,
        feature: "enrichment_v1",
        provider: "google-gemini-api",
        model: "gemini-3.1-flash-lite",
        modelLabel: "Gemini 3.1 Flash-Lite",
        promptVersion: "v2-stage2b-prompt-v2",
        sourceHash: "source-hash-fixture",
        outputSchemaVersion: "ai-enrichment-v2",
        disclosureVersion: "ai-disclosure-v1",
        idempotencyKeyHash: "idempotency-hash-fixture",
        cacheKeyHash: "cache-hash-fixture",
        status: "succeeded",
        structureValidationStatus: "valid",
        providerResponseId: "fixture-response-id",
        inputTokens: 100,
        outputTokens: 180,
        thinkingTokens: 0,
        totalTokens: 280,
        latencyMs: 900,
        estimatedCostUsd: 0.000082,
        createdAt,
        completedAt: reviewedAt,
      },
    ],
    aiEnrichmentDrafts: [
      {
        id: aiDraftId,
        personId,
        sourceVocabularyItemId: recognitionItemId,
        aiRunId,
        status: "accepted",
        draft: acceptedDraft,
        acceptedContent: acceptedDraft,
        createdAt,
        updatedAt: reviewedAt,
        decidedAt: reviewedAt,
      },
    ],
    vocabularyRelations: [
      {
        id: "relation_v2_stage3_adapt_adopt",
        personId,
        sourceVocabularyItemId: recognitionItemId,
        targetVocabularyItemId: activeItemId,
        relationType: "spelling",
        differenceZh: "adapt 表示适应，adopt 表示采纳或收养。",
        examplePair: ["We adapt to change.", "We adopt a new policy."],
        aiRunId,
        createdAt: reviewedAt,
      },
    ],
    updatedAt: activeReviewedAt,
  };

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt: activeReviewedAt,
      timezone: "Australia/Melbourne",
      schemaVersion: data.schemaVersion,
      counts: actualCounts(data),
    },
    data,
  };
}
