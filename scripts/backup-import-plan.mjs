import { randomUUID } from "node:crypto";

export const BACKUP_FORMAT = "mimi-pte-vocabulary-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_APP_NAME = "words-learning-app-for-mimi";
export const STAGE5L_FIXTURE_FILE_NAME = "stage5l-fixture-backup.json";
export const STAGE6B_P1E_SCHEMA5_FIXTURE_FILE_NAME = "stage6b-p1e-schema5-backup.json";

const SUPPORTED_SCHEMA_VERSIONS = new Set([3, 4, 5]);
const SUPPORTED_SCHEMA_VERSION_LABEL = "3, 4, or 5";
const DEFAULT_ACTIVE_SESSION_LIMIT = 8;
const VOCABULARY_SOURCES = new Set(["manual", "txt_file", "pasted_text", "json_file", "json_paste"]);
const VOCABULARY_STATUSES = new Set(["new", "archived"]);
const IMPORT_SOURCE_TYPES = new Set(["txt_file", "pasted_text", "json_file", "json_paste"]);
const LEARNING_TRACKS = new Set(["recognition", "active"]);
const VOCABULARY_TAGS = new Set(["PTE", "IELTS", "Listening", "Writing", "Spelling Risk"]);
const REVIEW_STATUSES = new Set(["learning", "review"]);
const REVIEW_RATINGS = new Set(["forgot", "hard", "vague", "remembered"]);

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

  return {
    people: data.people.length,
    items: data.items.length,
    activeItems: data.items.length - archivedItems,
    archivedItems,
    importBatches: data.importBatches.length,
    reviewStates: data.reviewStates.length,
    reviewEvents: data.reviewEvents.length,
  };
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
  if (reviewStateItems.has(itemKey)) {
    errors.push(`${label}.vocabularyItemId must be unique per person`);
  }
  reviewStateItems.add(itemKey);
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
}

function validateReviewEvent(
  event,
  index,
  people,
  vocabularyItems,
  vocabularyItemTracks,
  blockActiveReviewRows,
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

function validateBackup(backup) {
  const errors = [];

  if (!isRecord(backup)) {
    throw new BackupImportPlanError(["Backup root must be an object"]);
  }
  if (backup.format !== BACKUP_FORMAT) {
    errors.push(`format must be ${BACKUP_FORMAT}`);
  }
  if (backup.backupVersion !== BACKUP_VERSION) {
    errors.push(`backupVersion must be ${BACKUP_VERSION}`);
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
      data.schemaVersion >= 4,
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
      data.schemaVersion >= 4,
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

  if (isRecord(metadata.counts)) {
    compareCounts(metadata.counts, actualCounts(data), errors);
  }

  if (errors.length) {
    throw new BackupImportPlanError(errors);
  }
}

function mapSourceIds(records, personMap, uuidFactory) {
  const result = new Map();
  for (const record of records) {
    const personId = personMap.get(record.personId);
    result.set(`${record.personId}:${record.id}`, {
      sourceId: record.id,
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

export function buildBackupImportPlan(backup, options = {}) {
  validateBackup(backup);

  const uuidFactory = options.uuidFactory ?? randomUUID;
  const importedAt = options.importedAt ?? new Date().toISOString();
  const sourceFileName = options.sourceFileName ?? null;
  const notes = options.notes ?? "Stage 5L fixture import trial";
  const { metadata, data } = backup;
  const personMap = new Map(data.people.map((person) => [person.id, uuidFactory()]));
  const importBatchMap = mapSourceIds(data.importBatches, personMap, uuidFactory);
  const vocabularyItemMap = mapSourceIds(data.items, personMap, uuidFactory);
  const reviewStateMap = mapSourceIds(data.reviewStates, personMap, uuidFactory);
  const reviewEventMap = mapSourceIds(data.reviewEvents, personMap, uuidFactory);
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

      return {
        id: mapping.targetId,
        personId: mapping.targetPersonId,
        vocabularyItemId: item.targetId,
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
