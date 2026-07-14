import { describe, expect, it } from "vitest";
import {
  INTERNAL_STUDY_PAGE_SIZE,
  MAX_DAILY_GOAL,
  MAX_STUDY_ELAPSED_MS,
  RESET_TODAY_COPY,
  assertIndependentParameterSets,
  buildDailyStudyMetrics,
  calculateSuggestedReview,
  compareNewQueueEntries,
  compareReviewQueueEntries,
  countAddedToday,
  getBoundedStudyPageSize,
  getRemainingGoal,
  parseDailyGoal,
  resolveIdempotencyReplay,
  selectStudyQueuePage,
  summarizeDailyActuals,
  validateRatingEvidence,
  validateRecordStudyRatingCommand,
  validateResetTodayCommand,
  validateUpdateTodayGoalsCommand,
} from "./contract";
import type {
  DailyPlanWindow,
  QueueEntryFact,
  RecognitionReviewEventFact,
  ReviewStateFact,
  StudyCommandIdempotencyFact,
  StudyQueueEntryFact,
  TrustedPromptClaims,
  VocabularyCreationFact,
  VocabularyCreationReversalFact,
} from "./types";

const DAY: DailyPlanWindow = {
  planId: "plan-recognition-2026-07-13",
  planVersion: 1,
  personId: "person-mimi",
  reviewProfile: "recognition",
  localDate: "2026-07-13",
  timezone: "Australia/Melbourne",
  dayStartsAt: "2026-07-12T14:00:00.000Z",
  dayEndsAt: "2026-07-13T14:00:00.000Z",
  reviewGoal: 10,
  newWordGoal: 10,
};

const ACTIVE_DAY: DailyPlanWindow = {
  ...DAY,
  planId: "plan-active-2026-07-13",
  reviewProfile: "active",
};

const ACTIVE_PROMPT: Extract<TrustedPromptClaims, { reviewProfile: "active" }> = {
  promptId: "active-prompt-id",
  promptToken: "active-prompt-token",
  personId: ACTIVE_DAY.personId,
  planId: ACTIVE_DAY.planId,
  planVersion: ACTIVE_DAY.planVersion,
  localDate: ACTIVE_DAY.localDate,
  vocabularyItemId: "active-item",
  reviewProfile: "active",
  activityType: "spell",
  targetRevision: "target-revision-7",
  expiresAt: "2026-07-13T10:00:00.000Z",
};

function creation(
  creationFactId: string,
  overrides: Partial<VocabularyCreationFact> = {},
): VocabularyCreationFact {
  return {
    creationFactId,
    personId: DAY.personId,
    originalVocabularyItemId: `item-${creationFactId}`,
    sourceActionId: `action-${creationFactId}`,
    trackAtCreation: DAY.reviewProfile,
    sourceKind: "single",
    systemCreatedAt: "2026-07-13T01:00:00.000Z",
    ...overrides,
  };
}

function reversal(
  reversalFactId: string,
  sourceActionId: string,
  overrides: Partial<VocabularyCreationReversalFact> = {},
): VocabularyCreationReversalFact {
  return {
    reversalFactId,
    personId: DAY.personId,
    sourceActionId,
    reason: "batch_rollback",
    reversedAt: "2026-07-14T01:00:00.000Z",
    ...overrides,
  };
}

function state(
  vocabularyItemId: string,
  overrides: Partial<ReviewStateFact> = {},
): ReviewStateFact {
  return {
    personId: DAY.personId,
    vocabularyItemId,
    reviewProfile: DAY.reviewProfile,
    learningTrack: DAY.reviewProfile,
    parameterSetId: "recognition-fsrs-v1",
    dueAt: "2026-07-13T03:00:00.000Z",
    firstRatedAt: "2026-07-12T01:00:00.000Z",
    historyOrigin: "recorded",
    systemCreatedAt: "2026-07-01T00:00:00.000Z",
    isAvailable: true,
    ...overrides,
  } as ReviewStateFact;
}

function reviewEvent(
  eventId: string,
  vocabularyItemId: string,
  reviewedAt: string,
  overrides: Partial<RecognitionReviewEventFact> = {},
): RecognitionReviewEventFact {
  return {
    eventId,
    promptId: `prompt-${eventId}`,
    personId: DAY.personId,
    vocabularyItemId,
    reviewProfile: "recognition",
    activityType: "recognition_card",
    answerOutcome: "self_rated",
    answerNormalizationVersion: null,
    targetRevision: null,
    reviewedAt,
    previousDueAt: "2026-07-13T02:00:00.000Z",
    parameterSetId: "recognition-fsrs-v1",
    elapsedMs: 2_000,
    memoryRating: "remembered",
    ...overrides,
  };
}

type NewQueueEntry = Extract<StudyQueueEntryFact, { historyKind: "none" }>;
type RecordedQueueEntry = Extract<StudyQueueEntryFact, { historyKind: "recorded" }>;

function newQueueEntry(
  vocabularyItemId: string,
  overrides: Partial<NewQueueEntry> = {},
): NewQueueEntry {
  return {
    vocabularyItemId,
    personId: DAY.personId,
    learningTrack: DAY.reviewProfile,
    reviewProfile: DAY.reviewProfile,
    systemCreatedAt: "2026-07-01T00:00:00.000Z",
    dueAt: null,
    historyKind: "none",
    firstRatedAt: null,
    isAvailable: true,
    completedInPlan: false,
    sameSessionRepeat: false,
    promptToken: `prompt-${vocabularyItemId}`,
    ...overrides,
  };
}

function recordedQueueEntry(
  vocabularyItemId: string,
  overrides: Partial<RecordedQueueEntry> = {},
): RecordedQueueEntry {
  return {
    vocabularyItemId,
    personId: DAY.personId,
    learningTrack: DAY.reviewProfile,
    reviewProfile: DAY.reviewProfile,
    systemCreatedAt: "2026-07-01T00:00:00.000Z",
    dueAt: "2026-07-13T01:00:00.000Z",
    historyKind: "recorded",
    firstRatedAt: "2026-07-01T00:00:00.000Z",
    isAvailable: true,
    completedInPlan: false,
    sameSessionRepeat: false,
    promptToken: `prompt-${vocabularyItemId}`,
    ...overrides,
  };
}

describe("V2 daily study contract", () => {
  it("accepts zero and database-safe goals without rounding or an 80-entry cap", () => {
    expect(parseDailyGoal(0)).toBe(0);
    expect(parseDailyGoal("00081")).toBe(81);
    expect(parseDailyGoal(MAX_DAILY_GOAL)).toBe(MAX_DAILY_GOAL);
    expect(parseDailyGoal(1e3)).toBe(1_000);

    for (const invalid of ["", "-1", "1.5", "1e3", -1, 1.5, Number.NaN, Infinity]) {
      expect(() => parseDailyGoal(invalid)).toThrow();
    }

    expect(() => parseDailyGoal(MAX_DAILY_GOAL + 1)).toThrow();
  });

  it("keeps goals separate from bounded internal page sizes", () => {
    expect(getRemainingGoal(10, 4)).toBe(6);
    expect(getRemainingGoal(2, 7)).toBe(0);
    expect(getBoundedStudyPageSize(MAX_DAILY_GOAL)).toBe(INTERNAL_STUDY_PAGE_SIZE);
    expect(getBoundedStudyPageSize(7, 50)).toBe(7);
    expect(getBoundedStudyPageSize(0)).toBe(0);
    expect(() => getBoundedStudyPageSize(5, 0)).toThrow();
  });

  it("counts a word, phrase, and fixed collocation as three entries, not token totals", () => {
    const facts = [
      creation("word", { originalVocabularyItemId: "uuid-word" }),
      creation("phrase", { originalVocabularyItemId: "uuid-phrase" }),
      creation("collocation", { originalVocabularyItemId: "uuid-collocation" }),
    ];

    expect(countAddedToday(DAY, facts)).toBe(3);
  });

  it("retains hard-delete facts and reverses a full Batch imported action immutably", () => {
    const hardDeleted = creation("hard-delete", {
      originalVocabularyItemId: "deleted-item-uuid",
      sourceActionId: "single-action",
    });
    const facts = [
      hardDeleted,
      { ...hardDeleted, creationFactId: "duplicate-fact-id" },
      creation("batch-one", {
        sourceKind: "batch",
        sourceActionId: "batch-action",
      }),
      creation("batch-two", {
        sourceKind: "batch",
        sourceActionId: "batch-action",
      }),
      creation("ai", { sourceKind: "ai_add_to_learning" }),
      creation("other-track", { trackAtCreation: "active" }),
      creation("other-person", { personId: "person-friend" }),
      creation("end-boundary", { systemCreatedAt: DAY.dayEndsAt }),
    ];

    expect(
      countAddedToday(DAY, facts, [reversal("rollback", "batch-action")]),
    ).toBe(2);
  });

  it("rejects unknown, non-batch, and mixed-kind creation reversals", () => {
    const single = creation("single", { sourceActionId: "single-action" });
    const ai = creation("ai", {
      sourceActionId: "ai-action",
      sourceKind: "ai_add_to_learning",
    });

    expect(() =>
      countAddedToday(DAY, [single], [reversal("single-reversal", "single-action")]),
    ).toThrow();
    expect(() =>
      countAddedToday(DAY, [ai], [reversal("ai-reversal", "ai-action")]),
    ).toThrow();
    expect(() =>
      countAddedToday(DAY, [single], [reversal("unknown-reversal", "unknown")]),
    ).toThrow();
    expect(() =>
      countAddedToday(DAY, [
        creation("mixed-one", {
          sourceActionId: "mixed-action",
          sourceKind: "batch",
        }),
        creation("mixed-two", {
          sourceActionId: "mixed-action",
          sourceKind: "single",
        }),
      ]),
    ).toThrow();
  });

  it("classifies distinct learned and reviewed entries while retaining attempt count", () => {
    const states = [
      state("reviewed"),
      state("new-today", { firstRatedAt: DAY.dayStartsAt }),
      state("legacy-state", {
        firstRatedAt: null,
        historyOrigin: "legacy_unknown",
      }),
    ];
    const events = [
      reviewEvent("reviewed-prior", "reviewed", "2026-07-12T01:00:00.000Z"),
      reviewEvent("reviewed-1", "reviewed", "2026-07-13T03:00:00.000Z"),
      reviewEvent("reviewed-1", "reviewed", "2026-07-13T03:00:00.000Z"),
      reviewEvent("reviewed-2", "reviewed", "2026-07-13T03:05:00.000Z"),
      reviewEvent("learned-1", "new-today", DAY.dayStartsAt, { previousDueAt: null }),
      reviewEvent("learned-2", "new-today", "2026-07-13T04:00:00.000Z"),
      reviewEvent("legacy-1", "legacy-state", "2026-07-13T05:00:00.000Z"),
      reviewEvent("end-boundary", "not-today", DAY.dayEndsAt),
    ];

    expect(summarizeDailyActuals(DAY, states, events)).toEqual({
      learnedToday: 1,
      reviewedToday: 2,
      attemptsToday: 5,
    });
  });

  it("freezes suggested review from prior, available entries and the earliest today event", () => {
    const states = [
      state("ready-old"),
      state("legacy-state", {
        firstRatedAt: null,
        historyOrigin: "legacy_unknown",
      }),
      state("exact-end", { dueAt: DAY.dayEndsAt }),
      state("new-today", { firstRatedAt: "2026-07-13T04:00:00.000Z" }),
      state("already-completed", {
        dueAt: "2026-07-20T00:00:00.000Z",
        firstRatedAt: "2026-07-01T02:00:00.000Z",
      }),
      state("archived", { isAvailable: false }),
      state("track-mismatch", { learningTrack: "active" }),
    ];
    const events = [
      reviewEvent("completed-prior", "already-completed", "2026-07-12T01:00:00.000Z"),
      reviewEvent("completed-today", "already-completed", "2026-07-13T02:00:00.000Z", {
        previousDueAt: "2026-07-13T01:00:00.000Z",
      }),
      reviewEvent("completed-repeat", "already-completed", "2026-07-13T02:05:00.000Z", {
        previousDueAt: "2026-07-20T01:00:00.000Z",
      }),
      reviewEvent("new-today", "new-today", "2026-07-13T04:00:00.000Z", {
        previousDueAt: null,
      }),
    ];

    expect(calculateSuggestedReview(DAY, states, events)).toBe(3);
  });

  it("does not miscount an early review whose pre-rating due time was after today", () => {
    const states = [
      state("early-review", {
        dueAt: "2026-07-13T08:00:00.000Z",
        firstRatedAt: "2026-07-01T00:00:00.000Z",
      }),
    ];
    const events = [
      reviewEvent("prior", "early-review", "2026-07-01T01:00:00.000Z"),
      reviewEvent("early", "early-review", "2026-07-13T01:00:00.000Z", {
        previousDueAt: "2026-07-14T01:00:00.000Z",
      }),
      reviewEvent("repeat", "early-review", "2026-07-13T02:00:00.000Z", {
        previousDueAt: "2026-07-13T01:30:00.000Z",
      }),
    ];

    expect(calculateSuggestedReview(DAY, states, events)).toBe(0);
  });

  it("builds the seven-field daily metric result from the same facts", () => {
    const facts = [creation("one")];
    const states = [state("old")];
    const events = [
      reviewEvent("old-prior", "old", "2026-07-12T01:00:00.000Z"),
      reviewEvent("old-today", "old", "2026-07-13T03:00:00.000Z"),
    ];

    expect(
      buildDailyStudyMetrics({
        window: DAY,
        suggestedReview: 9,
        creationFacts: facts,
        states,
        events,
      }),
    ).toEqual({
      reviewGoal: 10,
      newWordGoal: 10,
      addedToday: 1,
      suggestedReview: 9,
      reviewedToday: 1,
      learnedToday: 0,
      attemptsToday: 1,
    });
  });

  it("keeps the same vocabulary id independent across Recognition and Active", () => {
    const recognitionState = state("shared", {
      dueAt: "2026-07-20T00:00:00.000Z",
    });
    const activeState = state("shared", {
      reviewProfile: "active",
      learningTrack: "active",
      parameterSetId: "active-fsrs-v1",
      dueAt: "2026-07-13T01:00:00.000Z",
    });

    expect(calculateSuggestedReview(DAY, [recognitionState, activeState], [])).toBe(0);
    expect(calculateSuggestedReview(ACTIVE_DAY, [recognitionState, activeState], [])).toBe(1);
  });

  it("uses explicit boundaries for 23-hour and 25-hour local days", () => {
    const shortDay: DailyPlanWindow = {
      ...DAY,
      planId: "dst-short",
      localDate: "2026-10-04",
      dayStartsAt: "2026-10-03T14:00:00.000Z",
      dayEndsAt: "2026-10-04T13:00:00.000Z",
    };
    const longDay: DailyPlanWindow = {
      ...DAY,
      planId: "dst-long",
      localDate: "2026-04-05",
      dayStartsAt: "2026-04-04T13:00:00.000Z",
      dayEndsAt: "2026-04-05T14:00:00.000Z",
    };

    expect(
      countAddedToday(shortDay, [
        creation("short", { systemCreatedAt: "2026-10-04T12:59:59.000Z" }),
      ]),
    ).toBe(1);
    expect(
      countAddedToday(longDay, [
        creation("long", { systemCreatedAt: "2026-04-05T13:59:59.000Z" }),
      ]),
    ).toBe(1);
    expect(() =>
      countAddedToday(
        { ...DAY, dayStartsAt: "2026-07-12T14:00:00" },
        [],
      ),
    ).toThrow();
    expect(() =>
      countAddedToday(
        { ...DAY, dayStartsAt: DAY.dayEndsAt, dayEndsAt: DAY.dayStartsAt },
        [],
      ),
    ).toThrow();
    expect(() =>
      countAddedToday({ ...DAY, localDate: "2026-02-30" }, []),
    ).toThrow();
  });

  it("sorts New and Review queues by immutable stable keys", () => {
    const entries: QueueEntryFact[] = [
      {
        vocabularyItemId: "item-b",
        systemCreatedAt: "2026-07-02T00:00:00.000Z",
        dueAt: "2026-07-04T00:00:00.000Z",
      },
      {
        vocabularyItemId: "item-c",
        systemCreatedAt: "2026-07-01T00:00:00.000Z",
        dueAt: "2026-07-03T00:00:00.000Z",
      },
      {
        vocabularyItemId: "item-a",
        systemCreatedAt: "2026-07-02T00:00:00.000Z",
        dueAt: "2026-07-04T00:00:00.000Z",
      },
    ];

    expect([...entries].sort(compareNewQueueEntries).map((entry) => entry.vocabularyItemId)).toEqual([
      "item-c",
      "item-a",
      "item-b",
    ]);
    expect(
      [...entries].sort(compareReviewQueueEntries).map((entry) => entry.vocabularyItemId),
    ).toEqual(["item-c", "item-a", "item-b"]);
    expect(() =>
      compareReviewQueueEntries(entries[0], { ...entries[1], dueAt: null }),
    ).toThrow();
  });

  it("keeps Review and New Words as separate executable queues", () => {
    const entries = [
      newQueueEntry("new"),
      newQueueEntry("new-two", {
        systemCreatedAt: "2026-07-02T00:00:00.000Z",
      }),
      recordedQueueEntry("review"),
      recordedQueueEntry("review-two", {
        dueAt: "2026-07-13T02:00:00.000Z",
      }),
      recordedQueueEntry("learned-today", {
        firstRatedAt: "2026-07-13T01:00:00.000Z",
        dueAt: "2026-07-13T02:00:00.000Z",
      }),
      recordedQueueEntry("completed-review", {
        completedInPlan: true,
      }),
      newQueueEntry("repeat", { sameSessionRepeat: true }),
    ];
    const differentGoalDay = { ...DAY, reviewGoal: 1, newWordGoal: 2 };

    const newPage = selectStudyQueuePage({
      window: differentGoalDay,
      query: {
        personId: DAY.personId,
        planId: DAY.planId,
        localDate: DAY.localDate,
        reviewProfile: DAY.reviewProfile,
        expectedPlanVersion: DAY.planVersion,
        zone: "new",
        cursor: null,
      },
      completedDistinctEntries: 0,
      entries,
    });
    const reviewPage = selectStudyQueuePage({
      window: differentGoalDay,
      query: {
        personId: DAY.personId,
        planId: DAY.planId,
        localDate: DAY.localDate,
        reviewProfile: DAY.reviewProfile,
        expectedPlanVersion: DAY.planVersion,
        zone: "review",
        cursor: null,
      },
      completedDistinctEntries: 0,
      entries,
    });

    expect(newPage.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "new",
      "new-two",
    ]);
    expect(reviewPage.entries.map((entry) => entry.vocabularyItemId)).toEqual([
      "review",
    ]);
  });

  it("honors a zero goal and bounds huge queue goals with keyset cursors", () => {
    const entries = Array.from({ length: 150 }, (_, index) =>
      newQueueEntry(`item-${String(index).padStart(3, "0")}`, {
        systemCreatedAt: `2026-07-01T00:${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}.000Z`,
      }),
    );
    const baseQuery = {
      personId: DAY.personId,
      planId: DAY.planId,
      localDate: DAY.localDate,
      reviewProfile: DAY.reviewProfile,
      expectedPlanVersion: DAY.planVersion,
      zone: "new" as const,
    };
    const zeroGoalDay = { ...DAY, newWordGoal: 0 };
    const hugeGoalDay = { ...DAY, newWordGoal: MAX_DAILY_GOAL };
    const oneEntryDay = { ...DAY, newWordGoal: 1 };

    expect(
      selectStudyQueuePage({
        window: zeroGoalDay,
        query: { ...baseQuery, cursor: null },
        completedDistinctEntries: 0,
        entries,
      }),
    ).toEqual({ zone: "new", entries: [], nextCursor: null });

    const firstPage = selectStudyQueuePage({
      window: hugeGoalDay,
      query: { ...baseQuery, cursor: null },
      completedDistinctEntries: 0,
      entries,
    });
    expect(firstPage.entries).toHaveLength(INTERNAL_STUDY_PAGE_SIZE);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = selectStudyQueuePage({
      window: hugeGoalDay,
      query: {
        ...baseQuery,
        cursor: firstPage.nextCursor,
      },
      completedDistinctEntries: 0,
      entries,
    });
    expect(secondPage.entries).toHaveLength(50);
    expect(secondPage.nextCursor).toBeNull();

    const oneEntryPlan = selectStudyQueuePage({
      window: oneEntryDay,
      query: { ...baseQuery, cursor: null },
      completedDistinctEntries: 0,
      entries,
    });
    expect(oneEntryPlan.entries).toHaveLength(1);
    expect(oneEntryPlan.nextCursor).toBeNull();

    expect(() =>
      selectStudyQueuePage({
        window: hugeGoalDay,
        query: {
          ...baseQuery,
          expectedPlanVersion: DAY.planVersion - 1,
          cursor: null,
        },
        completedDistinctEntries: 0,
        entries,
      }),
    ).toThrow();
    expect(() =>
      selectStudyQueuePage({
        window: hugeGoalDay,
        query: { ...baseQuery, cursor: firstPage.nextCursor },
        completedDistinctEntries: 1,
        entries,
      }),
    ).toThrow();
  });

  it("freezes strict rating evidence and independent parameter sets", () => {
    expect(
      validateRecordStudyRatingCommand(
        {
          personId: DAY.personId,
          planId: ACTIVE_DAY.planId,
          localDate: DAY.localDate,
          vocabularyItemId: "active-item",
          promptToken: "active-prompt-token",
          idempotencyKey: "rating-command-1",
          evidence: {
            reviewProfile: "active",
            activityType: "spell",
            answerOutcome: "different",
            answerNormalizationVersion: "active-answer-v1",
            memoryRating: "remembered",
            elapsedMs: 1_200,
          },
        },
        {
          window: ACTIVE_DAY,
          trustedPrompt: ACTIVE_PROMPT,
          currentTargetRevision: ACTIVE_PROMPT.targetRevision,
          consumedByIdempotencyKey: null,
          now: "2026-07-13T01:00:00.000Z",
        },
      ),
    ).toMatchObject({
      command: { vocabularyItemId: "active-item" },
      promptId: ACTIVE_PROMPT.promptId,
      targetRevision: ACTIVE_PROMPT.targetRevision,
    });

    const activeCommand = {
      personId: DAY.personId,
      planId: ACTIVE_DAY.planId,
      localDate: DAY.localDate,
      vocabularyItemId: "active-item",
      promptToken: ACTIVE_PROMPT.promptToken,
      idempotencyKey: "rating-command-bound",
      evidence: {
        reviewProfile: "active",
        activityType: "spell",
        answerOutcome: "different",
        answerNormalizationVersion: "active-answer-v1",
        memoryRating: "hard",
        elapsedMs: 1,
      },
    } as const;
    const activeContext = {
      window: ACTIVE_DAY,
      trustedPrompt: ACTIVE_PROMPT,
      currentTargetRevision: ACTIVE_PROMPT.targetRevision,
      consumedByIdempotencyKey: null,
      now: "2026-07-13T01:00:00.000Z",
    } as const;

    expect(() =>
      validateRecordStudyRatingCommand(
        { ...activeCommand, vocabularyItemId: "other-item" },
        activeContext,
      ),
    ).toThrow();
    expect(() =>
      validateRecordStudyRatingCommand(
        {
          ...activeCommand,
          evidence: {
            ...activeCommand.evidence,
            activityType: "say",
            answerOutcome: "self_rated",
            answerNormalizationVersion: null,
          },
        },
        activeContext,
      ),
    ).toThrow();
    expect(() =>
      validateRecordStudyRatingCommand(activeCommand, {
        ...activeContext,
        currentTargetRevision: "target-revision-8",
      }),
    ).toThrow();
    expect(() =>
      validateRecordStudyRatingCommand(activeCommand, {
        ...activeContext,
        consumedByIdempotencyKey: "another-rating-command",
      }),
    ).toThrow();
    expect(
      validateRecordStudyRatingCommand(activeCommand, {
        ...activeContext,
        consumedByIdempotencyKey: activeCommand.idempotencyKey,
      }),
    ).toMatchObject({ promptId: ACTIVE_PROMPT.promptId });
    expect(() =>
      validateRecordStudyRatingCommand(activeCommand, {
        ...activeContext,
        now: ACTIVE_PROMPT.expiresAt,
      }),
    ).toThrow();

    for (const invalidEvidence of [
      {
        reviewProfile: "recognition",
        activityType: "say",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        memoryRating: "hard",
        elapsedMs: 1,
      },
      {
        reviewProfile: "active",
        activityType: "recognition_card",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        memoryRating: "hard",
        elapsedMs: 1,
      },
      {
        reviewProfile: "active",
        activityType: "dictation",
        answerOutcome: "different",
        answerNormalizationVersion: null,
        memoryRating: "hard",
        elapsedMs: 1,
      },
    ]) {
      expect(() => validateRatingEvidence(invalidEvidence)).toThrow();
    }

    expect(() =>
      validateRatingEvidence({
        reviewProfile: "active",
        activityType: "say",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        memoryRating: "hard",
        elapsedMs: MAX_STUDY_ELAPSED_MS + 1,
      }),
    ).toThrow();

    expect(() =>
      validateRecordStudyRatingCommand(
        {
          personId: DAY.personId,
          planId: ACTIVE_DAY.planId,
          localDate: DAY.localDate,
          vocabularyItemId: "active-item",
          promptToken: "stale-prompt-token",
          idempotencyKey: "rating-command-2",
          evidence: {
            reviewProfile: "active",
            activityType: "say",
            answerOutcome: "self_rated",
            answerNormalizationVersion: null,
            memoryRating: "hard",
            elapsedMs: 1,
          },
        },
        {
          window: ACTIVE_DAY,
          trustedPrompt: ACTIVE_PROMPT,
          currentTargetRevision: ACTIVE_PROMPT.targetRevision,
          consumedByIdempotencyKey: null,
          now: "2026-07-13T01:00:00.000Z",
        },
      ),
    ).toThrow();
    expect(() =>
      validateRecordStudyRatingCommand(
        {
          personId: DAY.personId,
          planId: ACTIVE_DAY.planId,
          localDate: DAY.localDate,
          vocabularyItemId: "active-item",
          promptToken: "active-prompt-token",
          idempotencyKey: "rating-command-3",
          evidence: {
            reviewProfile: "recognition",
            activityType: "recognition_card",
            answerOutcome: "self_rated",
            answerNormalizationVersion: null,
            memoryRating: "hard",
            elapsedMs: 1,
          },
        },
        {
          window: ACTIVE_DAY,
          trustedPrompt: ACTIVE_PROMPT,
          currentTargetRevision: ACTIVE_PROMPT.targetRevision,
          consumedByIdempotencyKey: null,
          now: "2026-07-13T01:00:00.000Z",
        },
      ),
    ).toThrow();
    expect(() =>
      validateRatingEvidence({
        reviewProfile: "active",
        activityType: "say",
        answerOutcome: "self_rated",
        answerNormalizationVersion: null,
        memoryRating: "hard",
        elapsedMs: 1,
        reviewedAt: "client-owned-time-is-forbidden",
      }),
    ).toThrow();

    expect(
      assertIndependentParameterSets({
        recognitionParameterSetId: "recognition-fsrs-v1",
        activeParameterSetId: "active-fsrs-v1",
      }),
    ).toBeTruthy();
    expect(() =>
      assertIndependentParameterSets({
        recognitionParameterSetId: "shared",
        activeParameterSetId: "shared",
      }),
    ).toThrow();
  });

  it("freezes the exact two-gate reset copy and idempotency conflict behavior", () => {
    expect(RESET_TODAY_COPY).toEqual({
      firstGate: {
        message: "Reset today’s progress?",
        cancelLabel: "NO",
        continueLabel: "YES",
      },
      secondGate: {
        message: "真的要确定清空本日记录吗？这里不可以撤销哦",
        cancelLabel: "返回",
        confirmLabel: "确认清空",
      },
    });
    expect(
      validateUpdateTodayGoalsCommand({
        personId: DAY.personId,
        planId: DAY.planId,
        localDate: DAY.localDate,
        reviewProfile: DAY.reviewProfile,
        reviewGoal: 0,
        newWordGoal: MAX_DAILY_GOAL,
        expectedPlanVersion: DAY.planVersion,
      }),
    ).toMatchObject({ reviewGoal: 0, newWordGoal: MAX_DAILY_GOAL });
    expect(() =>
      validateUpdateTodayGoalsCommand({
        personId: DAY.personId,
        planId: DAY.planId,
        localDate: DAY.localDate,
        reviewProfile: DAY.reviewProfile,
        reviewGoal: 1,
        newWordGoal: 1,
        expectedPlanVersion: 0,
      }),
    ).toThrow();

    expect(
      validateResetTodayCommand({
        personId: DAY.personId,
        planId: DAY.planId,
        localDate: DAY.localDate,
        contractVersion: "v2-stage1",
        finalConfirmation: "confirmed_after_second_gate",
        idempotencyKey: "reset-command-1",
      }),
    ).toBeTruthy();

    const existing: StudyCommandIdempotencyFact = {
      personId: DAY.personId,
      localDate: DAY.localDate,
      commandType: "reset_today",
      idempotencyKey: "reset-command-1",
      canonicalRequestHash: "request-hash-a",
      status: "succeeded",
      resultJson: { removedEvents: 2 },
      createdAt: "2026-07-13T03:00:00.000Z",
      expiresAt: "2026-07-20T03:00:00.000Z",
    };

    expect(
      resolveIdempotencyReplay(
        existing,
        "request-hash-a",
        "2026-07-14T03:00:00.000Z",
      ),
    ).toEqual({
      status: "succeeded",
      resultJson: { removedEvents: 2 },
    });
    expect(() =>
      resolveIdempotencyReplay(
        existing,
        "request-hash-b",
        "2026-07-14T03:00:00.000Z",
      ),
    ).toThrow();
    expect(
      resolveIdempotencyReplay(
        existing,
        "request-hash-b",
        existing.expiresAt,
      ),
    ).toBeNull();
  });
});
