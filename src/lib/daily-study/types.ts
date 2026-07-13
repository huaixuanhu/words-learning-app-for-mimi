export const REVIEW_PROFILES = ["recognition", "active"] as const;
export const STUDY_ZONES = ["review", "new"] as const;
export const STUDY_ACTIVITY_TYPES = [
  "recognition_card",
  "say",
  "spell",
  "dictation",
] as const;
export const MEMORY_RATINGS = ["forgot", "hard", "vague", "remembered"] as const;
export const ACTIVE_ANSWER_NORMALIZATION_VERSION = "active-answer-v1" as const;

export type ReviewProfile = (typeof REVIEW_PROFILES)[number];
export type StudyZone = (typeof STUDY_ZONES)[number];
export type LearningStage = "new" | "in_review";
export type StudyActivityType = (typeof STUDY_ACTIVITY_TYPES)[number];
export type MemoryRating = (typeof MEMORY_RATINGS)[number];
export type AnswerOutcome =
  | "self_rated"
  | "exact"
  | "normalized_match"
  | "different"
  | "revealed_without_answer";
export type TypedAnswerOutcome = Exclude<AnswerOutcome, "self_rated">;

export type DailyPlanWindow = Readonly<{
  planId: string;
  planVersion: number;
  personId: string;
  reviewProfile: ReviewProfile;
  localDate: string;
  timezone: string;
  dayStartsAt: string;
  dayEndsAt: string;
  reviewGoal: number;
  newWordGoal: number;
}>;

export type DailyGoals = Readonly<{
  reviewGoal: number;
  newWordGoal: number;
}>;

export type DailyStudyMetrics = DailyGoals &
  Readonly<{
    addedToday: number;
    suggestedReview: number;
    reviewedToday: number;
    learnedToday: number;
    attemptsToday: number;
  }>;

export type AvailableDailyStudyTrackSummary = Readonly<{
  reviewProfile: ReviewProfile;
  status: "available";
  planId: string;
  planVersion: number;
  metrics: DailyStudyMetrics;
  recommendationVersion: string;
  calculatedAt: string;
  unavailableReason: null;
}>;

export type UnavailableDailyStudyTrackSummary = Readonly<{
  reviewProfile: ReviewProfile;
  status: "unavailable";
  planId: null;
  planVersion: null;
  metrics: null;
  recommendationVersion: null;
  calculatedAt: null;
  unavailableReason: "profile_not_enabled" | "temporarily_unavailable";
}>;

export type DailyStudyTrackSummary =
  | AvailableDailyStudyTrackSummary
  | UnavailableDailyStudyTrackSummary;

export type DailyStudyTodayResponse = Readonly<{
  personId: string;
  localDate: string;
  timezone: string;
  dayStartsAt: string;
  dayEndsAt: string;
  tracks: Readonly<Record<ReviewProfile, DailyStudyTrackSummary>>;
}>;

export type VocabularyCreationFact = Readonly<{
  creationFactId: string;
  personId: string;
  originalVocabularyItemId: string;
  sourceActionId: string;
  trackAtCreation: ReviewProfile;
  sourceKind: "single" | "batch" | "ai_add_to_learning";
  systemCreatedAt: string;
}>;

export type VocabularyCreationReversalFact = Readonly<{
  reversalFactId: string;
  personId: string;
  sourceActionId: string;
  reason: "batch_rollback";
  reversedAt: string;
}>;

type ReviewStateFactBase = Readonly<{
  personId: string;
  vocabularyItemId: string;
  reviewProfile: ReviewProfile;
  learningTrack: ReviewProfile;
  parameterSetId: string;
  dueAt: string;
  systemCreatedAt: string;
  isAvailable: boolean;
}>;

export type ReviewStateFact = ReviewStateFactBase &
  (
    | Readonly<{
        firstRatedAt: string;
        historyOrigin: "recorded";
      }>
    | Readonly<{
        firstRatedAt: null;
        historyOrigin: "legacy_unknown";
      }>
  );

type ReviewEventFactBase = Readonly<{
  eventId: string;
  promptId: string | null;
  personId: string;
  vocabularyItemId: string;
  reviewedAt: string;
  previousDueAt: string | null;
  parameterSetId: string;
  elapsedMs: number;
  memoryRating: MemoryRating;
}>;

export type RecognitionReviewEventFact = ReviewEventFactBase &
  Readonly<{
    reviewProfile: "recognition";
    activityType: "recognition_card";
    answerOutcome: "self_rated";
    answerNormalizationVersion: null;
    targetRevision: null;
  }>;

export type ActiveSayReviewEventFact = ReviewEventFactBase &
  Readonly<{
    reviewProfile: "active";
    activityType: "say";
    answerOutcome: "self_rated";
    answerNormalizationVersion: null;
    targetRevision: string;
  }>;

export type ActiveTypedReviewEventFact = ReviewEventFactBase &
  Readonly<{
    reviewProfile: "active";
    activityType: "spell" | "dictation";
    answerOutcome: TypedAnswerOutcome;
    answerNormalizationVersion: typeof ACTIVE_ANSWER_NORMALIZATION_VERSION;
    targetRevision: string;
  }>;

export type ReviewEventFact =
  | RecognitionReviewEventFact
  | ActiveSayReviewEventFact
  | ActiveTypedReviewEventFact;

export type QueueEntryFact = Readonly<{
  vocabularyItemId: string;
  systemCreatedAt: string;
  dueAt: string | null;
}>;

export type StudyQueueEntryFact = QueueEntryFact &
  Readonly<{
    personId: string;
    learningTrack: ReviewProfile;
    reviewProfile: ReviewProfile;
    isAvailable: boolean;
    completedInPlan: boolean;
    sameSessionRepeat: boolean;
    promptToken: string;
  }> &
  (
    | Readonly<{
        historyKind: "none";
        firstRatedAt: null;
        dueAt: null;
        completedInPlan: false;
      }>
    | Readonly<{
        historyKind: "legacy_unknown";
        firstRatedAt: null;
        dueAt: string;
      }>
    | Readonly<{
        historyKind: "recorded";
        firstRatedAt: string;
        dueAt: string;
      }>
  );

export type NewQueueCursor = Readonly<{
  systemCreatedAt: string;
  vocabularyItemId: string;
  selectedCount: number;
  completedDistinctAtStart: number;
}>;

export type ReviewQueueCursor = Readonly<{
  dueAt: string;
  systemCreatedAt: string;
  vocabularyItemId: string;
  selectedCount: number;
  completedDistinctAtStart: number;
}>;

type StudyQueueQueryBase = Readonly<{
  personId: string;
  planId: string;
  localDate: string;
  reviewProfile: ReviewProfile;
  expectedPlanVersion: number;
  requestedPageSize?: number;
}>;

export type StudyQueueRequest =
  | (StudyQueueQueryBase &
      Readonly<{
        zone: "new";
        cursorToken: string | null;
      }>)
  | (StudyQueueQueryBase &
      Readonly<{
        zone: "review";
        cursorToken: string | null;
      }>);

export type TrustedStudyQueueQuery =
  | (StudyQueueQueryBase &
      Readonly<{
        zone: "new";
        cursor: NewQueueCursor | null;
      }>)
  | (StudyQueueQueryBase &
      Readonly<{
        zone: "review";
        cursor: ReviewQueueCursor | null;
      }>);

export type StudyQueuePage =
  | Readonly<{
      zone: "new";
      entries: readonly StudyQueueEntryFact[];
      nextCursor: NewQueueCursor | null;
    }>
  | Readonly<{
      zone: "review";
      entries: readonly StudyQueueEntryFact[];
      nextCursor: ReviewQueueCursor | null;
    }>;

export type RecognitionRatingEvidence = Readonly<{
  reviewProfile: "recognition";
  activityType: "recognition_card";
  answerOutcome: "self_rated";
  answerNormalizationVersion: null;
  memoryRating: MemoryRating;
  elapsedMs: number;
}>;

export type ActiveSayRatingEvidence = Readonly<{
  reviewProfile: "active";
  activityType: "say";
  answerOutcome: "self_rated";
  answerNormalizationVersion: null;
  memoryRating: MemoryRating;
  elapsedMs: number;
}>;

export type ActiveTypedRatingEvidence = Readonly<{
  reviewProfile: "active";
  activityType: "spell" | "dictation";
  answerOutcome: TypedAnswerOutcome;
  answerNormalizationVersion: typeof ACTIVE_ANSWER_NORMALIZATION_VERSION;
  memoryRating: MemoryRating;
  elapsedMs: number;
}>;

export type RatingEvidence =
  | RecognitionRatingEvidence
  | ActiveSayRatingEvidence
  | ActiveTypedRatingEvidence;

export type RecordStudyRatingCommand = Readonly<{
  personId: string;
  planId: string;
  localDate: string;
  vocabularyItemId: string;
  promptToken: string;
  idempotencyKey: string;
  evidence: RatingEvidence;
}>;

type TrustedPromptClaimsBase = Readonly<{
  promptId: string;
  promptToken: string;
  personId: string;
  planId: string;
  localDate: string;
  vocabularyItemId: string;
  expiresAt: string;
}>;

export type TrustedPromptClaims =
  | (TrustedPromptClaimsBase &
      Readonly<{
        reviewProfile: "recognition";
        activityType: "recognition_card";
        targetRevision: null;
      }>)
  | (TrustedPromptClaimsBase &
      Readonly<{
        reviewProfile: "active";
        activityType: "say" | "spell" | "dictation";
        targetRevision: string;
      }>);

export type ValidatedStudyRatingSubmission = Readonly<{
  command: RecordStudyRatingCommand;
  promptId: string;
  targetRevision: string | null;
}>;

export type UpdateTodayGoalsCommand = Readonly<{
  personId: string;
  planId: string;
  localDate: string;
  reviewProfile: ReviewProfile;
  reviewGoal: number;
  newWordGoal: number;
  expectedPlanVersion: number;
}>;

export type UpdateDefaultGoalsCommand = Readonly<{
  personId: string;
  reviewProfile: ReviewProfile;
  reviewGoal: number;
  newWordGoal: number;
}>;

export type ResetTodayCommand = Readonly<{
  personId: string;
  planId: string;
  localDate: string;
  contractVersion: "v2-stage1";
  finalConfirmation: "confirmed_after_second_gate";
  idempotencyKey: string;
}>;

type StudyCommandIdempotencyFactBase = Readonly<{
  personId: string;
  localDate: string;
  commandType: "reset_today" | "record_rating";
  idempotencyKey: string;
  canonicalRequestHash: string;
  createdAt: string;
  expiresAt: string;
}>;

export type StudyCommandIdempotencyFact = StudyCommandIdempotencyFactBase &
  (
    | Readonly<{
        status: "in_progress";
        resultJson: null;
      }>
    | Readonly<{
        status: "succeeded";
        resultJson: Readonly<Record<string, unknown>>;
      }>
    | Readonly<{
        status: "failed";
        resultJson: Readonly<{ errorCode: string }>;
      }>
  );
