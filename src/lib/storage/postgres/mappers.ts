import type { PersonReviewSettings, ReviewEvent, ReviewState } from "@/lib/review/types";
import { DEFAULT_ACTIVE_SESSION_LIMIT } from "@/lib/review/settings";
import {
  normalizeLearningTrack,
  normalizeTextList,
  normalizeVocabularyTags,
} from "@/lib/vocabulary/normalize";
import type { ImportBatch, Person, VocabularyItem } from "@/lib/vocabulary/types";

type DatabaseTimestamp = string | Date;

export type PersonRow = {
  id: string;
  display_name: string;
  slug: string;
  is_active: boolean;
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
};

export type VocabularyItemRow = {
  id: string;
  person_id: string;
  surface_text: string;
  normalized_text: string;
  meaning_zh: string;
  example: string;
  notes: string;
  rarity_score: number | null;
  learning_track?: unknown;
  tags?: unknown;
  source: VocabularyItem["source"];
  import_batch_id: string | null;
  status: VocabularyItem["status"];
  created_at: DatabaseTimestamp;
  system_created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  timezone: string;
  archived_at: DatabaseTimestamp | null;
};

export type ImportBatchRow = {
  id: string;
  person_id: string;
  source_type: ImportBatch["sourceType"];
  file_name: string | null;
  created_at: DatabaseTimestamp;
  total_rows: number;
  accepted_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
};

export type ReviewStateRow = {
  id: string;
  person_id: string;
  vocabulary_item_id: string;
  status: ReviewState["status"];
  due_at: DatabaseTimestamp;
  last_reviewed_at: DatabaseTimestamp | null;
  review_count: number;
  lapse_count: number;
  interval_minutes: number;
  difficulty: number | null;
  stability: number | null;
  updated_at: DatabaseTimestamp;
};

export type ReviewEventRow = {
  id: string;
  person_id: string;
  vocabulary_item_id: string;
  reviewed_at: DatabaseTimestamp;
  rating: ReviewEvent["rating"];
  previous_due_at: DatabaseTimestamp | null;
  next_due_at: DatabaseTimestamp;
  previous_interval_minutes: number | null;
  next_interval_minutes: number;
  elapsed_ms: number;
};

export type ReviewSettingsRow = {
  person_id: string;
  session_limit: number;
  active_session_limit?: number | null;
  timezone: string;
  updated_at: DatabaseTimestamp;
};

function toIsoString(value: DatabaseTimestamp) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid database timestamp: ${value}`);
  }

  return date.toISOString();
}

function toNullableIsoString(value: DatabaseTimestamp | null) {
  return value === null ? null : toIsoString(value);
}

export function mapPersonRow(row: PersonRow): Person {
  return {
    id: row.id,
    displayName: row.display_name,
    slug: row.slug,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapVocabularyItemRow(row: VocabularyItemRow): VocabularyItem {
  return {
    id: row.id,
    personId: row.person_id,
    surfaceText: row.surface_text,
    normalizedText: row.normalized_text,
    meaningZh: row.meaning_zh,
    meaningsZh: normalizeTextList(row.meaning_zh),
    example: row.example,
    examples: normalizeTextList(row.example),
    notes: row.notes,
    rarityScore: row.rarity_score,
    learningTrack: normalizeLearningTrack(row.learning_track),
    tags: normalizeVocabularyTags(row.tags),
    source: row.source,
    importBatchId: row.import_batch_id,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    systemCreatedAt: toIsoString(row.system_created_at),
    updatedAt: toIsoString(row.updated_at),
    timezone: row.timezone,
    archivedAt: toNullableIsoString(row.archived_at),
  };
}

export function mapImportBatchRow(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    personId: row.person_id,
    sourceType: row.source_type,
    fileName: row.file_name,
    createdAt: toIsoString(row.created_at),
    totalRows: row.total_rows,
    acceptedRows: row.accepted_rows,
    duplicateRows: row.duplicate_rows,
    invalidRows: row.invalid_rows,
  };
}

export function mapReviewStateRow(row: ReviewStateRow): ReviewState {
  return {
    id: row.id,
    personId: row.person_id,
    vocabularyItemId: row.vocabulary_item_id,
    status: row.status,
    dueAt: toIsoString(row.due_at),
    lastReviewedAt: toNullableIsoString(row.last_reviewed_at),
    reviewCount: row.review_count,
    lapseCount: row.lapse_count,
    intervalMinutes: row.interval_minutes,
    difficulty: row.difficulty,
    stability: row.stability,
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapReviewEventRow(row: ReviewEventRow): ReviewEvent {
  return {
    id: row.id,
    personId: row.person_id,
    vocabularyItemId: row.vocabulary_item_id,
    reviewedAt: toIsoString(row.reviewed_at),
    rating: row.rating,
    previousDueAt: toNullableIsoString(row.previous_due_at),
    nextDueAt: toIsoString(row.next_due_at),
    previousIntervalMinutes: row.previous_interval_minutes,
    nextIntervalMinutes: row.next_interval_minutes,
    elapsedMs: row.elapsed_ms,
  };
}

export function mapReviewSettingsRow(row: ReviewSettingsRow): PersonReviewSettings {
  return {
    personId: row.person_id,
    sessionLimit: row.session_limit,
    recognitionSessionLimit: row.session_limit,
    activeSessionLimit: row.active_session_limit ?? DEFAULT_ACTIVE_SESSION_LIMIT,
    timezone: row.timezone,
    updatedAt: toIsoString(row.updated_at),
  };
}
