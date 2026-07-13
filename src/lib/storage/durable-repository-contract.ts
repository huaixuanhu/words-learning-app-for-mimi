import type {
  ImportBatch,
  ImportBatchInput,
  ImportCandidate,
  ImportCommitResult,
  NewVocabularyInput,
  Person,
  UpdateVocabularyInput,
  VocabularyItem,
} from "@/lib/vocabulary/types";
import type {
  PersonReviewSettings,
  ReviewEvent,
  ReviewRating,
  ReviewState,
} from "@/lib/review/types";

export type StorageAdapterKind = "localStorage" | "postgres";

export type PersonScopedContext = Readonly<{
  personId: string;
}>;

export type TimestampedPersonContext = PersonScopedContext &
  Readonly<{
    now: string;
    timezone: string;
  }>;

export type ReviewQueueQuery = PersonScopedContext &
  Readonly<{
    now: string;
    sessionLimit: number;
  }>;

export type RecordReviewCommand = PersonScopedContext &
  Readonly<{
    vocabularyItemId: string;
    rating: ReviewRating;
    elapsedMs?: number | null;
    reviewedAt: string;
  }>;

export type ReviewWriteResult = Readonly<{
  event: ReviewEvent;
  state: ReviewState;
}>;

export type VocabularyDeleteResult = Readonly<{
  item: VocabularyItem;
}>;

export type ImportBatchRollbackResult = Readonly<{
  batch: ImportBatch;
  deletedItemsCount: number;
  deletedReviewStatesCount: number;
  deletedReviewEventsCount: number;
}>;

export type ResetTodayReviewResult = Readonly<{
  resetEventsCount: number;
  resetItemsCount: number;
}>;

export type RollbackReviewEventResult = Readonly<{
  event: ReviewEvent;
  state: ReviewState | null;
}>;

export type BackupImportMapping = Readonly<{
  entityType:
    | "person"
    | "vocabulary_item"
    | "import_batch"
    | "review_state"
    | "review_event"
    | "review_settings"
    | "daily_study_default"
    | "daily_study_plan"
    | "vocabulary_creation_fact"
    | "vocabulary_creation_reversal"
    | "ai_run"
    | "ai_enrichment_draft"
    | "vocabulary_relation";
  sourceId: string;
  targetId: string;
}>;

export type BackupImportMode = "workspace" | "selected_person";

export type BackupImportPlan = Readonly<{
  mode: BackupImportMode;
  targetPersonId?: string;
  sourceSchemaVersion: 2 | 3 | 4 | 5 | 6;
  backupData: unknown;
}>;

export type BackupImportResult = Readonly<{
  backupImportIds: string[];
  mappings: BackupImportMapping[];
  counts: {
    people: number;
    items: number;
    importBatches: number;
    reviewStates: number;
    reviewEvents: number;
    reviewSettings: number;
    dailyStudyDefaults: number;
    dailyStudyPlans: number;
    vocabularyCreationFacts: number;
    vocabularyCreationReversals: number;
    aiRuns: number;
    aiEnrichmentDrafts: number;
    vocabularyRelations: number;
  };
}>;

export type PeopleRepositoryPort = Readonly<{
  listPeople(): Promise<Person[]>;
  selectPerson(personId: string): Promise<Person>;
}>;

export type VocabularyRepositoryPort = Readonly<{
  listItems(context: PersonScopedContext): Promise<VocabularyItem[]>;
  listActiveItems(context: PersonScopedContext): Promise<VocabularyItem[]>;
  listArchivedItems(context: PersonScopedContext): Promise<VocabularyItem[]>;
  addItem(context: TimestampedPersonContext, input: NewVocabularyInput): Promise<VocabularyItem>;
  updateItem(
    context: TimestampedPersonContext,
    vocabularyItemId: string,
    input: UpdateVocabularyInput,
  ): Promise<VocabularyItem>;
  archiveItem(context: TimestampedPersonContext, vocabularyItemId: string): Promise<VocabularyItem>;
  restoreItem(context: TimestampedPersonContext, vocabularyItemId: string): Promise<VocabularyItem>;
  deleteItem(
    context: TimestampedPersonContext,
    vocabularyItemId: string,
  ): Promise<VocabularyDeleteResult>;
  commitImportCandidates(
    context: TimestampedPersonContext,
    batchInput: ImportBatchInput,
    candidates: ImportCandidate[],
    acceptedTempIds: Iterable<string>,
  ): Promise<ImportCommitResult>;
  rollbackImportBatch(
    context: TimestampedPersonContext,
    importBatchId: string,
  ): Promise<ImportBatchRollbackResult>;
  listImportBatches(context: PersonScopedContext): Promise<ImportBatch[]>;
}>;

export type ReviewRepositoryPort = Readonly<{
  getReviewState(
    context: PersonScopedContext,
    vocabularyItemId: string,
  ): Promise<ReviewState | null>;
  getReviewQueue(context: ReviewQueueQuery): Promise<VocabularyItem[]>;
  recordReview(command: RecordReviewCommand): Promise<ReviewWriteResult>;
  resetToday(context: TimestampedPersonContext): Promise<ResetTodayReviewResult>;
  rollbackEvent(
    context: TimestampedPersonContext,
    reviewEventId: string,
  ): Promise<RollbackReviewEventResult>;
  listReviewEvents(context: PersonScopedContext): Promise<ReviewEvent[]>;
}>;

export type ReviewSettingsRepositoryPort = Readonly<{
  getSettings(context: PersonScopedContext): Promise<PersonReviewSettings>;
  updateSettings(
    context: TimestampedPersonContext,
    input: Pick<
      PersonReviewSettings,
      "sessionLimit" | "recognitionSessionLimit" | "activeSessionLimit" | "timezone"
    >,
  ): Promise<PersonReviewSettings>;
}>;

export type BackupRepositoryPort = Readonly<{
  importBackup(plan: BackupImportPlan): Promise<BackupImportResult>;
}>;

export type DurableRepositoryPort = Readonly<{
  kind: StorageAdapterKind;
  people: PeopleRepositoryPort;
  vocabulary: VocabularyRepositoryPort;
  review: ReviewRepositoryPort;
  reviewSettings: ReviewSettingsRepositoryPort;
  backup: BackupRepositoryPort;
}>;
