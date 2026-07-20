import type { PersonReviewSettings, ReviewEvent, ReviewState } from "@/lib/review/types";
import { DEFAULT_ACTIVE_SESSION_LIMIT } from "@/lib/review/settings";
import {
  normalizeLearningTrack,
  normalizeTextList,
  normalizeVocabularyTags,
} from "@/lib/vocabulary/normalize";
import type { ImportBatch, Person, VocabularyItem } from "@/lib/vocabulary/types";
import { alignExampleTranslationsZh } from "@/lib/vocabulary/example-pairs";
import type {
  AiEnrichmentDraftRecord,
  AiRunRecord,
  DailyStudyDefaultRecord,
  DailyStudyPlanRecord,
  VocabularyCreationRecord,
  VocabularyCreationReversalRecord,
  VocabularyRelationRecord,
} from "@/lib/storage/v2-data-model";

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
  meanings_zh?: unknown;
  example: string;
  examples?: unknown;
  example_translations_zh?: unknown;
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
  review_profile: ReviewState["reviewProfile"];
  parameter_set_id: string;
  first_rated_at: DatabaseTimestamp | null;
  history_origin: ReviewState["historyOrigin"];
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
  prompt_id: string | null;
  person_id: string;
  vocabulary_item_id: string;
  review_profile: ReviewEvent["reviewProfile"];
  activity_type: ReviewEvent["activityType"];
  answer_outcome: ReviewEvent["answerOutcome"];
  answer_normalization_version: ReviewEvent["answerNormalizationVersion"];
  target_revision: string | null;
  parameter_set_id: string;
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
  recognition_session_limit?: number | null;
  active_session_limit?: number | null;
  timezone: string;
  updated_at: DatabaseTimestamp;
};

export type DailyStudyDefaultRow = {
  person_id: string;
  review_profile: DailyStudyDefaultRecord["reviewProfile"];
  review_goal: number;
  new_word_goal: number;
  timezone: string;
  updated_at: DatabaseTimestamp;
};

export type DailyStudyPlanRow = {
  id: string;
  person_id: string;
  review_profile: DailyStudyPlanRecord["reviewProfile"];
  local_date: string | Date;
  timezone: string;
  day_starts_at: DatabaseTimestamp;
  day_ends_at: DatabaseTimestamp;
  suggested_review: number;
  review_goal: number;
  new_word_goal: number;
  plan_version: number;
  recommendation_version: string;
  calculated_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
};

export type VocabularyCreationFactRow = {
  id: string;
  person_id: string;
  original_vocabulary_item_id: string;
  source_action_id: string;
  track_at_creation: VocabularyCreationRecord["trackAtCreation"];
  source_kind: VocabularyCreationRecord["sourceKind"];
  history_origin: VocabularyCreationRecord["historyOrigin"];
  system_created_at: DatabaseTimestamp;
};

export type VocabularyCreationReversalRow = {
  id: string;
  person_id: string;
  source_action_id: string;
  reason: VocabularyCreationReversalRecord["reason"];
  reversed_at: DatabaseTimestamp;
};

export type AiRunRow = {
  id: string;
  person_id: string;
  source_vocabulary_item_id: string | null;
  feature: AiRunRecord["feature"];
  provider: AiRunRecord["provider"];
  model: string;
  model_label: string;
  prompt_version: string;
  source_hash: string;
  output_schema_version: string;
  disclosure_version: string;
  idempotency_key_hash: string;
  cache_key_hash: string;
  status: AiRunRecord["status"];
  structure_validation_status: AiRunRecord["structureValidationStatus"];
  terminal_category?: string | null;
  provider_response_id: string | null;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  total_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number | string;
  created_at: DatabaseTimestamp;
  completed_at: DatabaseTimestamp | null;
};

export type AiEnrichmentDraftRow = {
  id: string;
  person_id: string;
  source_vocabulary_item_id: string;
  ai_run_id: string;
  status: AiEnrichmentDraftRecord["status"];
  draft_json: AiEnrichmentDraftRecord["draft"];
  accepted_content_json: AiEnrichmentDraftRecord["acceptedContent"];
  created_at: DatabaseTimestamp;
  updated_at: DatabaseTimestamp;
  decided_at: DatabaseTimestamp | null;
};

export type VocabularyRelationRow = {
  id: string;
  person_id: string;
  source_vocabulary_item_id: string;
  target_vocabulary_item_id: string;
  relation_type: VocabularyRelationRecord["relationType"];
  difference_zh: string;
  example_pair: unknown;
  ai_run_id: string;
  created_at: DatabaseTimestamp;
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

function toLocalDateString(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
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
  const meaningsZh = normalizeTextList(row.meanings_zh);
  const examples = normalizeTextList(row.examples);
  const legacyMeaningsZh = normalizeTextList(row.meaning_zh);
  const legacyExamples = normalizeTextList(row.example);

  return {
    id: row.id,
    personId: row.person_id,
    surfaceText: row.surface_text,
    normalizedText: row.normalized_text,
    meaningZh: row.meaning_zh,
    meaningsZh: meaningsZh.length ? meaningsZh : legacyMeaningsZh,
    example: row.example,
    examples: examples.length ? examples : legacyExamples,
    exampleTranslationsZh: alignExampleTranslationsZh(
      examples.length ? examples : legacyExamples,
      row.example_translations_zh,
    ),
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
    reviewProfile: row.review_profile,
    parameterSetId: row.parameter_set_id,
    firstRatedAt: toNullableIsoString(row.first_rated_at),
    historyOrigin: row.history_origin,
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
    promptId: row.prompt_id,
    personId: row.person_id,
    vocabularyItemId: row.vocabulary_item_id,
    reviewProfile: row.review_profile,
    activityType: row.activity_type,
    answerOutcome: row.answer_outcome,
    answerNormalizationVersion: row.answer_normalization_version,
    targetRevision: row.target_revision,
    parameterSetId: row.parameter_set_id,
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
  const recognitionSessionLimit = row.recognition_session_limit ?? row.session_limit;

  return {
    personId: row.person_id,
    sessionLimit: recognitionSessionLimit,
    recognitionSessionLimit,
    activeSessionLimit: row.active_session_limit ?? DEFAULT_ACTIVE_SESSION_LIMIT,
    timezone: row.timezone,
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapDailyStudyDefaultRow(row: DailyStudyDefaultRow): DailyStudyDefaultRecord {
  return {
    personId: row.person_id,
    reviewProfile: row.review_profile,
    reviewGoal: row.review_goal,
    newWordGoal: row.new_word_goal,
    timezone: row.timezone,
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapDailyStudyPlanRow(row: DailyStudyPlanRow): DailyStudyPlanRecord {
  return {
    id: row.id,
    personId: row.person_id,
    reviewProfile: row.review_profile,
    localDate: toLocalDateString(row.local_date),
    timezone: row.timezone,
    dayStartsAt: toIsoString(row.day_starts_at),
    dayEndsAt: toIsoString(row.day_ends_at),
    suggestedReview: row.suggested_review,
    reviewGoal: row.review_goal,
    newWordGoal: row.new_word_goal,
    planVersion: row.plan_version,
    recommendationVersion: row.recommendation_version,
    calculatedAt: toIsoString(row.calculated_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapVocabularyCreationFactRow(
  row: VocabularyCreationFactRow,
): VocabularyCreationRecord {
  return {
    creationFactId: row.id,
    personId: row.person_id,
    originalVocabularyItemId: row.original_vocabulary_item_id,
    sourceActionId: row.source_action_id,
    trackAtCreation: row.track_at_creation,
    sourceKind: row.source_kind,
    historyOrigin: row.history_origin,
    systemCreatedAt: toIsoString(row.system_created_at),
  };
}

export function mapVocabularyCreationReversalRow(
  row: VocabularyCreationReversalRow,
): VocabularyCreationReversalRecord {
  return {
    reversalFactId: row.id,
    personId: row.person_id,
    sourceActionId: row.source_action_id,
    reason: row.reason,
    reversedAt: toIsoString(row.reversed_at),
  };
}

export function mapAiRunRow(row: AiRunRow): AiRunRecord {
  return {
    id: row.id,
    personId: row.person_id,
    sourceVocabularyItemId: row.source_vocabulary_item_id,
    feature: row.feature,
    provider: row.provider,
    model: row.model,
    modelLabel: row.model_label,
    promptVersion: row.prompt_version,
    sourceHash: row.source_hash,
    outputSchemaVersion: row.output_schema_version,
    disclosureVersion: row.disclosure_version,
    idempotencyKeyHash: row.idempotency_key_hash,
    cacheKeyHash: row.cache_key_hash,
    status: row.status,
    structureValidationStatus: row.structure_validation_status,
    providerResponseId: row.provider_response_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    thinkingTokens: row.thinking_tokens,
    totalTokens: row.total_tokens,
    latencyMs: row.latency_ms,
    estimatedCostUsd: Number(row.estimated_cost_usd),
    createdAt: toIsoString(row.created_at),
    completedAt: toNullableIsoString(row.completed_at),
  };
}

export function mapAiEnrichmentDraftRow(
  row: AiEnrichmentDraftRow,
): AiEnrichmentDraftRecord {
  return {
    id: row.id,
    personId: row.person_id,
    sourceVocabularyItemId: row.source_vocabulary_item_id,
    aiRunId: row.ai_run_id,
    status: row.status,
    draft: row.draft_json,
    acceptedContent: row.accepted_content_json,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    decidedAt: toNullableIsoString(row.decided_at),
  };
}

export function mapVocabularyRelationRow(
  row: VocabularyRelationRow,
): VocabularyRelationRecord {
  return {
    id: row.id,
    personId: row.person_id,
    sourceVocabularyItemId: row.source_vocabulary_item_id,
    targetVocabularyItemId: row.target_vocabulary_item_id,
    relationType: row.relation_type,
    differenceZh: row.difference_zh,
    examplePair: normalizeTextList(row.example_pair),
    aiRunId: row.ai_run_id,
    createdAt: toIsoString(row.created_at),
  };
}
