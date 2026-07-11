import { migrateVocabularyData } from "@/lib/vocabulary/local-storage-repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { getSelectedReviewSettings } from "@/lib/review/settings";
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCounts,
  type BackupParseResult,
  type VocabularyBackupFile,
} from "./types";

const VOCABULARY_SOURCES = new Set(["manual", "txt_file", "pasted_text", "json_file", "json_paste"]);
const VOCABULARY_STATUSES = new Set(["new", "archived"]);
const IMPORT_SOURCE_TYPES = new Set(["txt_file", "pasted_text", "json_file", "json_paste"]);
const LEARNING_TRACKS = new Set(["recognition", "active"]);
const VOCABULARY_TAGS = new Set(["PTE", "IELTS", "Listening", "Writing", "Spelling Risk"]);
const REVIEW_STATUSES = new Set(["learning", "review"]);
const REVIEW_RATINGS = new Set(["forgot", "hard", "vague", "remembered"]);

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
  };
}

export function createVocabularyBackup(
  data: VocabularyData,
  options: BackupOptions = {},
): VocabularyBackupFile {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const timezone = options.timezone ?? getSelectedReviewSettings(data).timezone;

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    metadata: {
      appName: BACKUP_APP_NAME,
      exportedAt,
      timezone,
      schemaVersion: data.schemaVersion,
      counts: summarizeVocabularyData(data),
    },
    data,
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
}

function validateReviewEvent(
  value: unknown,
  index: number,
  errors: string[],
  requiresPersonId: boolean,
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
}

function validateCounts(value: unknown, errors: string[]) {
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

function validateBackupData(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("data must be an object");
    return;
  }

  if (
    value.schemaVersion !== 2 &&
    value.schemaVersion !== 3 &&
    value.schemaVersion !== 4 &&
    value.schemaVersion !== 5
  ) {
    errors.push("data.schemaVersion must be 2, 3, 4, or 5");
  }
  const requiresPersonId =
    value.schemaVersion === 3 || value.schemaVersion === 4 || value.schemaVersion === 5;
  const requiresTrackFields = value.schemaVersion === 4 || value.schemaVersion === 5;
  const requiresTextListFields = value.schemaVersion === 5;

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
      validateVocabularyItem(item, index, errors, requiresPersonId, requiresTrackFields, requiresTextListFields),
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
      validateReviewState(state, index, errors, requiresPersonId),
    );
  }

  if (!Array.isArray(value.reviewEvents)) {
    errors.push("data.reviewEvents must be an array");
  } else {
    value.reviewEvents.forEach((event, index) =>
      validateReviewEvent(event, index, errors, requiresPersonId),
    );
  }

  if (requiresPersonId) {
    validateSettingsByPerson(value.settingsByPerson, errors, requiresTrackFields);
  } else {
    validateSettings(value.settings, errors, requiresTrackFields);
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

    value.items.filter(isRecord).forEach((item) => {
      const itemKey =
        requiresPersonId && isString(item.personId) && isString(item.id)
          ? `${item.personId}:${item.id}`
          : item.id;

      if (isString(itemKey)) {
        itemTrackByKey.set(itemKey, item.learningTrack);
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

        if (requiresTrackFields && isString(itemKey) && itemTrackByKey.get(itemKey) === "active") {
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

        if (requiresTrackFields && isString(itemKey) && itemTrackByKey.get(itemKey) === "active") {
          errors.push(`reviewEvents[${index}].vocabularyItemId references an Active item`);
        }
      });
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

  if (value.backupVersion !== 1 && value.backupVersion !== BACKUP_VERSION) {
    errors.push(`backupVersion must be 1 or ${BACKUP_VERSION}`);
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
      value.metadata.schemaVersion !== 5
    ) {
      errors.push("metadata.schemaVersion must be 2, 3, 4, or 5");
    }

    validateCounts(value.metadata.counts, errors);
  }

  validateBackupData(value.data, errors);

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
