import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  AiFeature,
} from "@/lib/ai-enrichment/types";
import type { ReviewProfile } from "@/lib/daily-study/types";

export type DailyStudyDefaultRecord = {
  personId: string;
  reviewProfile: ReviewProfile;
  reviewGoal: number;
  newWordGoal: number;
  timezone: string;
  updatedAt: string;
};

export type DailyStudyPlanRecord = {
  id: string;
  personId: string;
  reviewProfile: ReviewProfile;
  localDate: string;
  timezone: string;
  dayStartsAt: string;
  dayEndsAt: string;
  suggestedReview: number;
  reviewGoal: number;
  newWordGoal: number;
  planVersion: number;
  recommendationVersion: string;
  calculatedAt: string;
  updatedAt: string;
};

export type VocabularyCreationRecord = {
  creationFactId: string;
  personId: string;
  originalVocabularyItemId: string;
  sourceActionId: string;
  trackAtCreation: ReviewProfile;
  sourceKind: "single" | "batch" | "ai_add_to_learning";
  historyOrigin: "recorded" | "legacy_backfill";
  systemCreatedAt: string;
};

export type VocabularyCreationReversalRecord = {
  reversalFactId: string;
  personId: string;
  sourceActionId: string;
  reason: "batch_rollback";
  reversedAt: string;
};

export type AiRunStatus = "submitted" | "succeeded" | "rejected" | "failed";
export type AiStructureValidationStatus = "pending" | "valid" | "invalid" | "unavailable";

export type AiRunRecord = {
  id: string;
  personId: string;
  sourceVocabularyItemId: string | null;
  feature: AiFeature;
  provider: "google-gemini-api";
  model: string;
  modelLabel: string;
  promptVersion: string;
  sourceHash: string;
  outputSchemaVersion: string;
  disclosureVersion: string;
  idempotencyKeyHash: string;
  cacheKeyHash: string;
  status: AiRunStatus;
  structureValidationStatus: AiStructureValidationStatus;
  providerResponseId: string | null;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  createdAt: string;
  completedAt: string | null;
};

export type AiEnrichmentDraftStatus = "draft" | "accepted" | "rejected";

export type AiEnrichmentDraftRecord = {
  id: string;
  personId: string;
  sourceVocabularyItemId: string;
  aiRunId: string;
  status: AiEnrichmentDraftStatus;
  draft: AiEnrichmentDraft;
  acceptedContent: AiEnrichmentDraft | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
};

export type AiContextExplanationCacheRecord = {
  cacheKeyHash: string;
  personId: string;
  sourceVocabularyItemId: string;
  aiRunId: string;
  sourceHash: string;
  exampleIndex: number;
  selectedStart: number;
  selectedEnd: number;
  result: AiContextExplanation;
  createdAt: string;
  expiresAt: string;
};

export type VocabularyRelationType = "similar" | "spelling" | "sound" | "usage";

export type VocabularyRelationRecord = {
  id: string;
  personId: string;
  sourceVocabularyItemId: string;
  targetVocabularyItemId: string;
  relationType: VocabularyRelationType;
  differenceZh: string;
  examplePair: string[];
  aiRunId: string;
  createdAt: string;
};

export type AiUsageBucketScope =
  | "global_day"
  | "global_month"
  | "person_day"
  | "global_concurrency";

export type AiUsageBucketRecord = {
  bucketKey: string;
  scope: AiUsageBucketScope;
  personId: string | null;
  periodStartsAt: string;
  periodEndsAt: string;
  attemptsReserved: number;
  inputTokensReserved: number;
  outputTokensReserved: number;
  estimatedCostUsdReserved: number;
  activeProviderCalls: number;
  updatedAt: string;
};

export type StudyCommandIdempotencyRecord = {
  personId: string;
  localDate: string;
  commandType: "record_rating" | "reset_today" | "rollback_event";
  idempotencyKey: string;
  canonicalRequestHash: string;
  status: "in_progress" | "succeeded" | "failed";
  result: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: string;
  expiresAt: string;
};
