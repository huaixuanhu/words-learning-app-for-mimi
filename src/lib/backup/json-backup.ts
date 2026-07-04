import { migrateVocabularyData } from "@/lib/vocabulary/local-storage-repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCounts,
  type BackupParseResult,
  type VocabularyBackupFile,
} from "./types";

const VOCABULARY_SOURCES = new Set(["manual", "txt_file", "pasted_text"]);
const VOCABULARY_STATUSES = new Set(["new", "archived"]);
const IMPORT_SOURCE_TYPES = new Set(["txt_file", "pasted_text"]);
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

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function summarizeVocabularyData(data: VocabularyData): BackupCounts {
  const archivedItems = data.items.filter(
    (item) => item.status === "archived" || Boolean(item.archivedAt),
  ).length;

  return {
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
  const timezone = options.timezone ?? data.settings.timezone;

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

function validateVocabularyItem(value: unknown, index: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`items[${index}] must be an object`);
    return;
  }

  const requiredStrings = [
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

function validateImportBatch(value: unknown, index: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`importBatches[${index}] must be an object`);
    return;
  }

  for (const key of ["id", "createdAt"]) {
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

function validateReviewState(value: unknown, index: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`reviewStates[${index}] must be an object`);
    return;
  }

  for (const key of ["id", "vocabularyItemId", "dueAt", "updatedAt"]) {
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

function validateReviewEvent(value: unknown, index: number, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`reviewEvents[${index}] must be an object`);
    return;
  }

  for (const key of ["id", "vocabularyItemId", "reviewedAt", "nextDueAt"]) {
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
}

function validateSettings(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("data.settings must be an object");
    return;
  }

  if (!isNumber(value.sessionLimit)) {
    errors.push("data.settings.sessionLimit must be a number");
  }

  if (!isString(value.timezone)) {
    errors.push("data.settings.timezone must be a string");
  }

  if (!isString(value.updatedAt)) {
    errors.push("data.settings.updatedAt must be a string");
  }
}

function validateBackupData(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("data must be an object");
    return;
  }

  if (value.schemaVersion !== 2) {
    errors.push("data.schemaVersion must be 2");
  }

  if (!Array.isArray(value.items)) {
    errors.push("data.items must be an array");
  } else {
    value.items.forEach((item, index) => validateVocabularyItem(item, index, errors));
  }

  if (!Array.isArray(value.importBatches)) {
    errors.push("data.importBatches must be an array");
  } else {
    value.importBatches.forEach((batch, index) => validateImportBatch(batch, index, errors));
  }

  if (!Array.isArray(value.reviewStates)) {
    errors.push("data.reviewStates must be an array");
  } else {
    value.reviewStates.forEach((state, index) => validateReviewState(state, index, errors));
  }

  if (!Array.isArray(value.reviewEvents)) {
    errors.push("data.reviewEvents must be an array");
  } else {
    value.reviewEvents.forEach((event, index) => validateReviewEvent(event, index, errors));
  }

  validateSettings(value.settings, errors);

  if (!isString(value.updatedAt)) {
    errors.push("data.updatedAt must be a string");
  }

  if (Array.isArray(value.items)) {
    const itemIds = new Set(
      value.items
        .filter(isRecord)
        .map((item) => item.id)
        .filter(isString),
    );

    if (Array.isArray(value.reviewStates)) {
      value.reviewStates.filter(isRecord).forEach((state, index) => {
        if (isString(state.vocabularyItemId) && !itemIds.has(state.vocabularyItemId)) {
          errors.push(`reviewStates[${index}].vocabularyItemId does not match an item`);
        }
      });
    }

    if (Array.isArray(value.reviewEvents)) {
      value.reviewEvents.filter(isRecord).forEach((event, index) => {
        if (isString(event.vocabularyItemId) && !itemIds.has(event.vocabularyItemId)) {
          errors.push(`reviewEvents[${index}].vocabularyItemId does not match an item`);
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

  if (value.backupVersion !== BACKUP_VERSION) {
    errors.push(`backupVersion must be ${BACKUP_VERSION}`);
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

    if (value.metadata.schemaVersion !== 2) {
      errors.push("metadata.schemaVersion must be 2");
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
        : data.settings.timezone,
      schemaVersion: 2,
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
