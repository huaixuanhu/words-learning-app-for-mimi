import {
  ACTIVE_ANSWER_NORMALIZATION_VERSION,
  MEMORY_RATINGS,
  REVIEW_PROFILES,
  STUDY_ACTIVITY_TYPES,
} from "./types";
import type {
  DailyGoals,
  DailyPlanWindow,
  DailyStudyMetrics,
  QueueEntryFact,
  RatingEvidence,
  RecordStudyRatingCommand,
  ReviewEventFact,
  ReviewProfile,
  ResetTodayCommand,
  ReviewStateFact,
  StudyCommandIdempotencyFact,
  StudyQueueEntryFact,
  StudyQueuePage,
  TrustedPromptClaims,
  TrustedStudyQueueQuery,
  StudyZone,
  UpdateTodayGoalsCommand,
  ValidatedStudyRatingSubmission,
  VocabularyCreationFact,
  VocabularyCreationReversalFact,
} from "./types";

export const MAX_DAILY_GOAL = 2_147_483_647;
export const INTERNAL_STUDY_PAGE_SIZE = 100;
export const MAX_STUDY_ELAPSED_MS = 90_000_000;

export const RESET_TODAY_COPY = Object.freeze({
  firstGate: Object.freeze({
    message: "Reset today’s progress?",
    cancelLabel: "NO",
    continueLabel: "YES",
  }),
  secondGate: Object.freeze({
    message: "真的要确定清空本日记录吗？这里不可以撤销哦",
    cancelLabel: "返回",
    confirmLabel: "确认清空",
  }),
});

const TIMESTAMP_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](\d{2}):(\d{2}))$/u;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const TYPED_ANSWER_OUTCOMES = [
  "exact",
  "normalized_match",
  "different",
  "revealed_without_answer",
] as const;

export class DailyStudyContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyStudyContractError";
  }
}

function timestamp(value: string, label: string) {
  const parts = value.match(TIMESTAMP_WITH_OFFSET);

  if (!parts) {
    throw new DailyStudyContractError(`${label} must include an explicit UTC offset`);
  }

  const [, year, month, day, hour, minute, second, , offset, offsetHour, offsetMinute] =
    parts;

  if (
    !isValidCalendarDate(Number(year), Number(month), Number(day)) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offset !== "Z" && (Number(offsetHour) > 23 || Number(offsetMinute) > 59))
  ) {
    throw new DailyStudyContractError(`${label} must be a valid timestamp`);
  }

  const parsed = new Date(value).getTime();

  if (!Number.isFinite(parsed)) {
    throw new DailyStudyContractError(`${label} must be a valid timestamp`);
  }

  return parsed;
}

function windowTimes(window: DailyPlanWindow) {
  requireNonBlankString(window.personId, "personId");
  requireNonBlankString(window.timezone, "timezone");
  requireLocalDate(window.localDate, "localDate");
  validateDailyGoals({
    reviewGoal: window.reviewGoal,
    newWordGoal: window.newWordGoal,
  });

  if (!REVIEW_PROFILES.includes(window.reviewProfile)) {
    throw new DailyStudyContractError("Unsupported reviewProfile");
  }

  if (!window.planId.trim()) {
    throw new DailyStudyContractError("planId must not be blank");
  }

  if (!Number.isSafeInteger(window.planVersion) || window.planVersion < 1) {
    throw new DailyStudyContractError("planVersion must be a positive whole number");
  }

  const startsAt = timestamp(window.dayStartsAt, "dayStartsAt");
  const endsAt = timestamp(window.dayEndsAt, "dayEndsAt");

  if (endsAt <= startsAt) {
    throw new DailyStudyContractError("dayEndsAt must be after dayStartsAt");
  }

  return { startsAt, endsAt };
}

function isSameScope(
  fact: { personId: string; reviewProfile: string },
  window: DailyPlanWindow,
) {
  return fact.personId === window.personId && fact.reviewProfile === window.reviewProfile;
}

function isInside(time: number, startsAt: number, endsAt: number) {
  return time >= startsAt && time < endsAt;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DailyStudyContractError(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function assertExactKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  label: string,
) {
  const unexpected = Object.keys(record).filter((key) => !allowedKeys.includes(key));
  const missing = allowedKeys.filter((key) => !(key in record));

  if (unexpected.length > 0 || missing.length > 0) {
    throw new DailyStudyContractError(`${label} fields do not match the contract`);
  }
}

function requireNonBlankString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new DailyStudyContractError(`${label} must be non-blank text`);
  }

  return value;
}

function requireLocalDate(value: unknown, label: string) {
  const parts = typeof value === "string" ? value.match(LOCAL_DATE) : null;

  if (
    !parts ||
    !isValidCalendarDate(Number(parts[1]), Number(parts[2]), Number(parts[3]))
  ) {
    throw new DailyStudyContractError(`${label} must use YYYY-MM-DD`);
  }

  return value;
}

function isValidCalendarDate(year: number, month: number, day: number) {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return (
    Number.isInteger(year) &&
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysByMonth[month - 1]
  );
}

export function parseDailyGoal(input: unknown) {
  let value: number;

  if (typeof input === "number") {
    value = input;
  } else if (typeof input === "string") {
    const trimmed = input.trim();

    if (!/^\d+$/u.test(trimmed)) {
      throw new DailyStudyContractError("Daily goal must be a non-negative whole number");
    }

    value = Number(trimmed);
  } else {
    throw new DailyStudyContractError("Daily goal must be a non-negative whole number");
  }

  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_DAILY_GOAL) {
    throw new DailyStudyContractError(
      `Daily goal must be between 0 and ${MAX_DAILY_GOAL}`,
    );
  }

  return value;
}

export function validateDailyGoals(goals: DailyGoals): DailyGoals {
  return {
    reviewGoal: parseDailyGoal(goals.reviewGoal),
    newWordGoal: parseDailyGoal(goals.newWordGoal),
  };
}

export function getRemainingGoal(goal: unknown, completedDistinctEntries: unknown) {
  const safeGoal = parseDailyGoal(goal);
  const completed = parseDailyGoal(completedDistinctEntries);

  return Math.max(0, safeGoal - completed);
}

export function getBoundedStudyPageSize(
  remainingGoal: unknown,
  requestedPageSize: unknown = INTERNAL_STUDY_PAGE_SIZE,
) {
  const remaining = parseDailyGoal(remainingGoal);
  const requested = parseDailyGoal(requestedPageSize);

  if (remaining === 0) {
    return 0;
  }

  if (requested === 0) {
    throw new DailyStudyContractError("Requested page size must be at least 1");
  }

  return Math.min(remaining, requested, INTERNAL_STUDY_PAGE_SIZE);
}

export function countAddedToday(
  window: DailyPlanWindow,
  facts: readonly VocabularyCreationFact[],
  reversals: readonly VocabularyCreationReversalFact[] = [],
) {
  const { startsAt, endsAt } = windowTimes(window);
  const actionKinds = new Map<string, VocabularyCreationFact["sourceKind"]>();
  const reversedSourceActions = new Set<string>();
  const stableCreationKeys = new Set<string>();

  for (const fact of facts) {
    if (fact.personId !== window.personId) {
      continue;
    }

    const existingKind = actionKinds.get(fact.sourceActionId);

    if (existingKind && existingKind !== fact.sourceKind) {
      throw new DailyStudyContractError(
        "A creation source action cannot mix source kinds",
      );
    }

    actionKinds.set(fact.sourceActionId, fact.sourceKind);
  }

  for (const reversal of reversals) {
    if (reversal.personId !== window.personId) {
      continue;
    }

    timestamp(reversal.reversedAt, "reversedAt");

    if (actionKinds.get(reversal.sourceActionId) !== "batch") {
      throw new DailyStudyContractError(
        "A Batch imported reversal must reference a known batch action",
      );
    }

    reversedSourceActions.add(reversal.sourceActionId);
  }

  for (const fact of facts) {
    if (
      fact.personId !== window.personId ||
      fact.trackAtCreation !== window.reviewProfile ||
      reversedSourceActions.has(fact.sourceActionId)
    ) {
      continue;
    }

    if (isInside(timestamp(fact.systemCreatedAt, "systemCreatedAt"), startsAt, endsAt)) {
      stableCreationKeys.add(`${fact.sourceActionId}\u0000${fact.originalVocabularyItemId}`);
    }
  }

  return stableCreationKeys.size;
}

function priorHistoryItemIds(
  window: DailyPlanWindow,
  states: readonly ReviewStateFact[],
  events: readonly ReviewEventFact[],
) {
  const { startsAt } = windowTimes(window);
  const ids = new Set<string>();

  for (const event of events) {
    if (
      isSameScope(event, window) &&
      timestamp(event.reviewedAt, "reviewedAt") < startsAt
    ) {
      ids.add(event.vocabularyItemId);
    }
  }

  for (const state of states) {
    if (!isSameScope(state, window) || state.learningTrack !== window.reviewProfile) {
      continue;
    }

    if (
      state.firstRatedAt === null ||
      timestamp(state.firstRatedAt, "firstRatedAt") < startsAt
    ) {
      ids.add(state.vocabularyItemId);
    }
  }

  return ids;
}

export function summarizeDailyActuals(
  window: DailyPlanWindow,
  states: readonly ReviewStateFact[],
  events: readonly ReviewEventFact[],
) {
  const { startsAt, endsAt } = windowTimes(window);
  const priorIds = priorHistoryItemIds(window, states, events);
  const learnedIds = new Set<string>();
  const reviewedIds = new Set<string>();
  const seenEventIds = new Set<string>();
  let attemptsToday = 0;

  for (const event of events) {
    if (!isSameScope(event, window)) {
      continue;
    }

    const reviewedAt = timestamp(event.reviewedAt, "reviewedAt");

    if (!isInside(reviewedAt, startsAt, endsAt) || seenEventIds.has(event.eventId)) {
      continue;
    }

    seenEventIds.add(event.eventId);
    attemptsToday += 1;

    if (priorIds.has(event.vocabularyItemId)) {
      reviewedIds.add(event.vocabularyItemId);
    } else {
      learnedIds.add(event.vocabularyItemId);
    }
  }

  return {
    learnedToday: learnedIds.size,
    reviewedToday: reviewedIds.size,
    attemptsToday,
  };
}

function earliestTodayEvents(
  window: DailyPlanWindow,
  events: readonly ReviewEventFact[],
) {
  const { startsAt, endsAt } = windowTimes(window);
  const earliest = new Map<string, ReviewEventFact>();

  for (const event of events) {
    if (!isSameScope(event, window)) {
      continue;
    }

    const reviewedAt = timestamp(event.reviewedAt, "reviewedAt");

    if (!isInside(reviewedAt, startsAt, endsAt)) {
      continue;
    }

    const existing = earliest.get(event.vocabularyItemId);

    if (!existing) {
      earliest.set(event.vocabularyItemId, event);
      continue;
    }

    const existingTime = timestamp(existing.reviewedAt, "reviewedAt");

    if (
      reviewedAt < existingTime ||
      (reviewedAt === existingTime && event.eventId.localeCompare(existing.eventId) < 0)
    ) {
      earliest.set(event.vocabularyItemId, event);
    }
  }

  return earliest;
}

export function calculateSuggestedReview(
  window: DailyPlanWindow,
  states: readonly ReviewStateFact[],
  events: readonly ReviewEventFact[],
) {
  const { endsAt } = windowTimes(window);
  const priorIds = priorHistoryItemIds(window, states, events);
  const firstTodayEventByItem = earliestTodayEvents(window, events);
  const suggestedIds = new Set<string>();

  for (const state of states) {
    if (
      !state.isAvailable ||
      !isSameScope(state, window) ||
      state.learningTrack !== window.reviewProfile ||
      !priorIds.has(state.vocabularyItemId)
    ) {
      continue;
    }

    const firstTodayEvent = firstTodayEventByItem.get(state.vocabularyItemId);

    if (firstTodayEvent) {
      if (
        firstTodayEvent.previousDueAt !== null &&
        timestamp(firstTodayEvent.previousDueAt, "previousDueAt") < endsAt
      ) {
        suggestedIds.add(state.vocabularyItemId);
      }

      continue;
    }

    if (timestamp(state.dueAt, "dueAt") < endsAt) {
      suggestedIds.add(state.vocabularyItemId);
    }
  }

  return suggestedIds.size;
}

export function buildDailyStudyMetrics(input: {
  window: DailyPlanWindow;
  suggestedReview: number;
  creationFacts: readonly VocabularyCreationFact[];
  creationReversals?: readonly VocabularyCreationReversalFact[];
  states: readonly ReviewStateFact[];
  events: readonly ReviewEventFact[];
}): DailyStudyMetrics {
  const goals = validateDailyGoals({
    reviewGoal: input.window.reviewGoal,
    newWordGoal: input.window.newWordGoal,
  });
  const suggestedReview = parseDailyGoal(input.suggestedReview);
  const actuals = summarizeDailyActuals(input.window, input.states, input.events);

  return {
    ...goals,
    addedToday: countAddedToday(
      input.window,
      input.creationFacts,
      input.creationReversals,
    ),
    suggestedReview,
    ...actuals,
  };
}

export function compareNewQueueEntries(a: QueueEntryFact, b: QueueEntryFact) {
  const createdCompare =
    timestamp(a.systemCreatedAt, "systemCreatedAt") -
    timestamp(b.systemCreatedAt, "systemCreatedAt");

  if (createdCompare !== 0) {
    return createdCompare;
  }

  return a.vocabularyItemId.localeCompare(b.vocabularyItemId);
}

export function compareReviewQueueEntries(a: QueueEntryFact, b: QueueEntryFact) {
  if (a.dueAt === null || b.dueAt === null) {
    throw new DailyStudyContractError("Review queue entries require dueAt");
  }

  const dueCompare = timestamp(a.dueAt, "dueAt") - timestamp(b.dueAt, "dueAt");

  if (dueCompare !== 0) {
    return dueCompare;
  }

  return compareNewQueueEntries(a, b);
}

export function isEligibleForStudyZone(
  entry: StudyQueueEntryFact,
  window: DailyPlanWindow,
  zone: StudyZone,
) {
  const { startsAt, endsAt } = windowTimes(window);

  if (
    entry.personId !== window.personId ||
    entry.reviewProfile !== window.reviewProfile ||
    entry.learningTrack !== window.reviewProfile ||
    !entry.isAvailable ||
    entry.sameSessionRepeat
  ) {
    return false;
  }

  if (zone === "new") {
    return entry.historyKind === "none";
  }

  if (entry.historyKind === "none" || entry.completedInPlan) {
    return false;
  }

  if (
    entry.firstRatedAt !== null &&
    timestamp(entry.firstRatedAt, "firstRatedAt") >= startsAt
  ) {
    return false;
  }

  return timestamp(entry.dueAt, "dueAt") < endsAt;
}

function isAfterNewCursor(
  entry: StudyQueueEntryFact,
  cursor: NonNullable<
    Extract<TrustedStudyQueueQuery, { zone: "new" }>["cursor"]
  >,
) {
  const createdCompare =
    timestamp(entry.systemCreatedAt, "systemCreatedAt") -
    timestamp(cursor.systemCreatedAt, "cursor.systemCreatedAt");

  return (
    createdCompare > 0 ||
    (createdCompare === 0 && entry.vocabularyItemId.localeCompare(cursor.vocabularyItemId) > 0)
  );
}

function isAfterReviewCursor(
  entry: StudyQueueEntryFact,
  cursor: NonNullable<
    Extract<TrustedStudyQueueQuery, { zone: "review" }>["cursor"]
  >,
) {
  if (entry.dueAt === null) {
    return false;
  }

  const dueCompare =
    timestamp(entry.dueAt, "dueAt") - timestamp(cursor.dueAt, "cursor.dueAt");

  if (dueCompare !== 0) {
    return dueCompare > 0;
  }

  return isAfterNewCursor(entry, cursor);
}

export function selectStudyQueuePage(input: {
  window: DailyPlanWindow;
  query: TrustedStudyQueueQuery;
  completedDistinctEntries: number;
  entries: readonly StudyQueueEntryFact[];
}): StudyQueuePage {
  const { window, query } = input;
  windowTimes(window);

  if (
    query.personId !== window.personId ||
    query.planId !== window.planId ||
    query.localDate !== window.localDate ||
    query.reviewProfile !== window.reviewProfile ||
    query.expectedPlanVersion !== window.planVersion
  ) {
    throw new DailyStudyContractError("Queue query does not match the resolved plan");
  }

  const completedDistinctEntries = parseDailyGoal(input.completedDistinctEntries);
  const completedDistinctAtStart =
    query.cursor?.completedDistinctAtStart ?? completedDistinctEntries;
  const selectedCount = query.cursor?.selectedCount ?? 0;

  if (completedDistinctEntries !== completedDistinctAtStart) {
    throw new DailyStudyContractError(
      "Queue progress changed after the cursor was issued; restart the queue read",
    );
  }

  const planGoal = query.zone === "new" ? window.newWordGoal : window.reviewGoal;
  const remainingGoal = getRemainingGoal(
    getRemainingGoal(planGoal, completedDistinctAtStart),
    selectedCount,
  );
  const pageSize = getBoundedStudyPageSize(
    remainingGoal,
    query.requestedPageSize ?? INTERNAL_STUDY_PAGE_SIZE,
  );

  if (pageSize === 0) {
    return { zone: query.zone, entries: [], nextCursor: null } as StudyQueuePage;
  }

  if (query.zone === "new") {
    const candidates = input.entries
      .filter((entry) => isEligibleForStudyZone(entry, window, "new"))
      .sort(compareNewQueueEntries)
      .filter((entry) => query.cursor === null || isAfterNewCursor(entry, query.cursor));
    const entries = candidates.slice(0, pageSize);
    const last = entries.at(-1);
    const nextSelectedCount = selectedCount + entries.length;

    return {
      zone: "new",
      entries,
      nextCursor:
        last &&
        candidates.length > entries.length &&
        nextSelectedCount < getRemainingGoal(planGoal, completedDistinctAtStart)
          ? {
              systemCreatedAt: last.systemCreatedAt,
              vocabularyItemId: last.vocabularyItemId,
              selectedCount: nextSelectedCount,
              completedDistinctAtStart,
            }
          : null,
    };
  }

  const candidates = input.entries
    .filter((entry) => isEligibleForStudyZone(entry, window, "review"))
    .sort(compareReviewQueueEntries)
    .filter((entry) => query.cursor === null || isAfterReviewCursor(entry, query.cursor));
  const entries = candidates.slice(0, pageSize);
  const last = entries.at(-1);
  const nextSelectedCount = selectedCount + entries.length;

  return {
    zone: "review",
    entries,
    nextCursor:
      last &&
      last.dueAt !== null &&
      candidates.length > entries.length &&
      nextSelectedCount < getRemainingGoal(planGoal, completedDistinctAtStart)
        ? {
            dueAt: last.dueAt,
            systemCreatedAt: last.systemCreatedAt,
            vocabularyItemId: last.vocabularyItemId,
            selectedCount: nextSelectedCount,
            completedDistinctAtStart,
          }
        : null,
  };
}

export function validateRatingEvidence(value: unknown): RatingEvidence {
  const evidence = asRecord(value, "Rating evidence");
  assertExactKeys(
    evidence,
    [
      "reviewProfile",
      "activityType",
      "answerOutcome",
      "answerNormalizationVersion",
      "memoryRating",
      "elapsedMs",
    ],
    "Rating evidence",
  );

  if (!REVIEW_PROFILES.includes(evidence.reviewProfile as ReviewProfile)) {
    throw new DailyStudyContractError("Unsupported reviewProfile");
  }

  if (!STUDY_ACTIVITY_TYPES.includes(evidence.activityType as never)) {
    throw new DailyStudyContractError("Unsupported activityType");
  }

  if (!MEMORY_RATINGS.includes(evidence.memoryRating as never)) {
    throw new DailyStudyContractError("Unsupported memoryRating");
  }

  if (
    !Number.isSafeInteger(evidence.elapsedMs) ||
    (evidence.elapsedMs as number) < 0 ||
    (evidence.elapsedMs as number) > MAX_STUDY_ELAPSED_MS
  ) {
    throw new DailyStudyContractError(
      `elapsedMs must be between 0 and ${MAX_STUDY_ELAPSED_MS}`,
    );
  }

  const isRecognition =
    evidence.reviewProfile === "recognition" &&
    evidence.activityType === "recognition_card" &&
    evidence.answerOutcome === "self_rated" &&
    evidence.answerNormalizationVersion === null;
  const isActiveSay =
    evidence.reviewProfile === "active" &&
    evidence.activityType === "say" &&
    evidence.answerOutcome === "self_rated" &&
    evidence.answerNormalizationVersion === null;
  const isActiveTyped =
    evidence.reviewProfile === "active" &&
    (evidence.activityType === "spell" || evidence.activityType === "dictation") &&
    TYPED_ANSWER_OUTCOMES.includes(evidence.answerOutcome as never) &&
    evidence.answerNormalizationVersion === ACTIVE_ANSWER_NORMALIZATION_VERSION;

  if (!isRecognition && !isActiveSay && !isActiveTyped) {
    throw new DailyStudyContractError("Profile, activity, and answer evidence do not match");
  }

  return evidence as unknown as RatingEvidence;
}

export function validateRecordStudyRatingCommand(
  value: unknown,
  context: {
    window: DailyPlanWindow;
    trustedPrompt: TrustedPromptClaims;
    currentTargetRevision: string | null;
    consumedByIdempotencyKey: string | null;
    now: string;
  },
): ValidatedStudyRatingSubmission {
  windowTimes(context.window);
  const command = asRecord(value, "Rating command");
  assertExactKeys(
    command,
    [
      "personId",
      "planId",
      "localDate",
      "vocabularyItemId",
      "promptToken",
      "idempotencyKey",
      "evidence",
    ],
    "Rating command",
  );

  requireNonBlankString(command.personId, "personId");
  requireNonBlankString(command.planId, "planId");
  requireLocalDate(command.localDate, "localDate");
  requireNonBlankString(command.vocabularyItemId, "vocabularyItemId");
  requireNonBlankString(command.promptToken, "promptToken");
  requireNonBlankString(command.idempotencyKey, "idempotencyKey");
  const evidence = validateRatingEvidence(command.evidence);

  if (
    command.personId !== context.window.personId ||
    command.planId !== context.window.planId ||
    command.localDate !== context.window.localDate ||
    evidence.reviewProfile !== context.window.reviewProfile
  ) {
    throw new DailyStudyContractError(
      "Rating command does not match the resolved plan",
    );
  }

  const prompt = context.trustedPrompt;
  requireNonBlankString(prompt.promptId, "prompt.promptId");
  requireNonBlankString(prompt.promptToken, "prompt.promptToken");

  if (timestamp(prompt.expiresAt, "prompt.expiresAt") <= timestamp(context.now, "now")) {
    throw new DailyStudyContractError("Rating command prompt token has expired");
  }

  if (
    command.promptToken !== prompt.promptToken ||
    command.personId !== prompt.personId ||
    command.planId !== prompt.planId ||
    command.localDate !== prompt.localDate ||
    command.vocabularyItemId !== prompt.vocabularyItemId ||
    evidence.reviewProfile !== prompt.reviewProfile ||
    evidence.activityType !== prompt.activityType
  ) {
    throw new DailyStudyContractError("Rating command prompt token is stale or invalid");
  }

  if (
    prompt.reviewProfile === "active" &&
    (!prompt.targetRevision.trim() ||
      context.currentTargetRevision !== prompt.targetRevision)
  ) {
    throw new DailyStudyContractError("The Active target changed after the prompt was issued");
  }

  if (
    prompt.reviewProfile === "recognition" &&
    context.currentTargetRevision !== null
  ) {
    throw new DailyStudyContractError(
      "Recognition prompt claims cannot carry an Active target revision",
    );
  }

  if (
    context.consumedByIdempotencyKey !== null &&
    context.consumedByIdempotencyKey !== command.idempotencyKey
  ) {
    throw new DailyStudyContractError(
      "The prompt was already consumed by another rating command",
    );
  }

  const validatedCommand = { ...command, evidence } as RecordStudyRatingCommand;

  return {
    command: validatedCommand,
    promptId: prompt.promptId,
    targetRevision: prompt.targetRevision,
  };
}

export function validateUpdateTodayGoalsCommand(
  value: unknown,
): UpdateTodayGoalsCommand {
  const command = asRecord(value, "Today goals command");
  assertExactKeys(
    command,
    [
      "personId",
      "planId",
      "localDate",
      "reviewProfile",
      "reviewGoal",
      "newWordGoal",
      "expectedPlanVersion",
    ],
    "Today goals command",
  );

  requireNonBlankString(command.personId, "personId");
  requireNonBlankString(command.planId, "planId");
  requireLocalDate(command.localDate, "localDate");

  if (!REVIEW_PROFILES.includes(command.reviewProfile as ReviewProfile)) {
    throw new DailyStudyContractError("Unsupported reviewProfile");
  }

  const goals = validateDailyGoals({
    reviewGoal: command.reviewGoal as number,
    newWordGoal: command.newWordGoal as number,
  });

  if (
    !Number.isSafeInteger(command.expectedPlanVersion) ||
    (command.expectedPlanVersion as number) < 1
  ) {
    throw new DailyStudyContractError(
      "expectedPlanVersion must be a positive whole number",
    );
  }

  return { ...command, ...goals } as UpdateTodayGoalsCommand;
}

export function validateResetTodayCommand(value: unknown): ResetTodayCommand {
  const command = asRecord(value, "Reset command");
  assertExactKeys(
    command,
    [
      "personId",
      "planId",
      "localDate",
      "contractVersion",
      "finalConfirmation",
      "idempotencyKey",
    ],
    "Reset command",
  );

  requireNonBlankString(command.personId, "personId");
  requireNonBlankString(command.planId, "planId");
  requireLocalDate(command.localDate, "localDate");
  requireNonBlankString(command.idempotencyKey, "idempotencyKey");

  if (
    command.contractVersion !== "v2-stage1" ||
    command.finalConfirmation !== "confirmed_after_second_gate"
  ) {
    throw new DailyStudyContractError("Reset command confirmation contract is invalid");
  }

  return command as ResetTodayCommand;
}

export function resolveIdempotencyReplay(
  existing: StudyCommandIdempotencyFact | null,
  canonicalRequestHash: string,
  now: string,
) {
  requireNonBlankString(canonicalRequestHash, "canonicalRequestHash");
  const nowTime = timestamp(now, "now");

  if (existing === null) {
    return null;
  }

  if (timestamp(existing.expiresAt, "expiresAt") <= nowTime) {
    return null;
  }

  if (existing.canonicalRequestHash !== canonicalRequestHash) {
    throw new DailyStudyContractError(
      "The Idempotency Key was already used with a different request",
    );
  }

  return {
    status: existing.status,
    resultJson: existing.resultJson,
  };
}

export function assertIndependentParameterSets(input: {
  recognitionParameterSetId: string;
  activeParameterSetId: string;
}) {
  const recognition = requireNonBlankString(
    input.recognitionParameterSetId,
    "recognitionParameterSetId",
  );
  const active = requireNonBlankString(
    input.activeParameterSetId,
    "activeParameterSetId",
  );

  if (recognition === active) {
    throw new DailyStudyContractError(
      "Recognition and Active must use independent parameter sets",
    );
  }

  return input;
}
