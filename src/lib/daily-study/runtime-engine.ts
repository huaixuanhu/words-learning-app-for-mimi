import {
  buildDailyStudyMetrics,
  calculateSuggestedReview,
  DailyStudyContractError,
  selectStudyQueuePage,
  validateDailyGoals,
  validateResetTodayCommand,
  validateUpdateTodayGoalsCommand,
} from "./contract";
import {
  resolvePersonDay,
  resolveStudyDay,
  resolveStudyDayOffset,
  type ResolvedPersonDay,
} from "./day-window";
import type {
  DailyPlanWindow,
  DailyStudyTodayResponse,
  LearningStage,
  ReviewEventFact,
  ReviewProfile,
  ReviewStateFact,
  StudyQueueEntryFact,
  StudyQueuePage,
  TrustedStudyQueueQuery,
  UpdateDefaultGoalsCommand,
  UpdateTodayGoalsCommand,
  VocabularyCreationFact,
  VocabularyCreationReversalFact,
  ResetTodayCommand,
} from "./types";
import { REVIEW_PROFILES } from "./types";
import { getSelectedPersonId } from "@/lib/people/repository";
import {
  rebuildReviewProfileStateFromEvents,
} from "@/lib/review/repository";
import { getReviewSettingsForPerson } from "@/lib/review/settings";
import type { ReviewEvent, ReviewState } from "@/lib/review/types";
import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import {
  findDailyEpisodePlan,
  getDailyEpisodeAttemptSummary,
  getDailyEpisodeEvents,
  getLatestDailyEpisodeAttemptSummary,
} from "@/lib/review/daily-episode";
import { makeId } from "@/lib/vocabulary/repository";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";

export const DAILY_RECOMMENDATION_VERSION = "daily-suggested-review-v1";

export type PromptSeed = Readonly<{
  personId: string;
  planId: string;
  planVersion: number;
  localDate: string;
  vocabularyItemId: string;
}> &
  (
    | Readonly<{
        reviewProfile: "recognition";
        activityType: "recognition_card";
        targetRevision?: null;
      }>
    | Readonly<{
        reviewProfile: "active";
        activityType: "say" | "spell" | "dictation";
        targetRevision: string;
      }>
  );

export class DailyStudyRuntimeError extends Error {
  constructor(
    readonly code:
      | "plan_not_found"
      | "plan_mismatch"
      | "stale_plan"
      | "person_mismatch",
    message: string,
  ) {
    super(message);
    this.name = "DailyStudyRuntimeError";
  }
}

function ensureNow(now: string) {
  const parsed = new Date(now);

  if (!Number.isFinite(parsed.getTime())) {
    throw new DailyStudyContractError("now must be a valid timestamp");
  }

  return parsed.toISOString();
}

export function planRecordToWindow(plan: DailyStudyPlanRecord): DailyPlanWindow {
  return {
    planId: plan.id,
    planVersion: plan.planVersion,
    personId: plan.personId,
    reviewProfile: plan.reviewProfile,
    localDate: plan.localDate,
    timezone: plan.timezone,
    dayStartsAt: plan.dayStartsAt,
    dayEndsAt: plan.dayEndsAt,
    reviewGoal: plan.reviewGoal,
    newWordGoal: plan.newWordGoal,
  };
}

function isAvailableItem(item: VocabularyItem | undefined, profile: ReviewProfile) {
  return Boolean(
    item &&
      item.learningTrack === profile &&
      item.status !== "archived" &&
      item.archivedAt === null,
  );
}

function hasChineseMeaning(item: VocabularyItem) {
  return (
    item.meaningsZh.some((meaning) => meaning.trim()) ||
    Boolean(item.meaningZh.trim())
  );
}

export function createActiveTargetRevision(item: VocabularyItem) {
  return `active-target-v1:${item.id}:${item.updatedAt}`;
}

function creationFacts(data: VocabularyData): VocabularyCreationFact[] {
  return data.vocabularyCreationFacts.map((fact) => ({
    creationFactId: fact.creationFactId,
    personId: fact.personId,
    originalVocabularyItemId: fact.originalVocabularyItemId,
    sourceActionId: fact.sourceActionId,
    trackAtCreation: fact.trackAtCreation,
    sourceKind: fact.sourceKind,
    systemCreatedAt: fact.systemCreatedAt,
  }));
}

function creationReversals(data: VocabularyData): VocabularyCreationReversalFact[] {
  return data.vocabularyCreationReversals.map((fact) => ({
    reversalFactId: fact.reversalFactId,
    personId: fact.personId,
    sourceActionId: fact.sourceActionId,
    reason: fact.reason,
    reversedAt: fact.reversedAt,
  }));
}

function reviewStateFacts(data: VocabularyData): ReviewStateFact[] {
  const itemById = new Map(data.items.map((item) => [item.id, item]));
  const facts: ReviewStateFact[] = [];

  for (const state of data.reviewStates) {
    const item = itemById.get(state.vocabularyItemId);

    if (!item) {
      continue;
    }

    const base = {
      personId: state.personId,
      vocabularyItemId: state.vocabularyItemId,
      reviewProfile: state.reviewProfile,
      learningTrack: item.learningTrack,
      parameterSetId: state.parameterSetId,
      dueAt: state.dueAt,
      systemCreatedAt: item.systemCreatedAt,
      isAvailable: isAvailableItem(item, state.reviewProfile),
    };

    if (state.historyOrigin === "legacy_unknown") {
      facts.push({ ...base, firstRatedAt: null, historyOrigin: "legacy_unknown" });
    } else if (state.firstRatedAt) {
      facts.push({ ...base, firstRatedAt: state.firstRatedAt, historyOrigin: "recorded" });
    }
  }

  return facts;
}

function reviewEventFact(
  event: ReviewEvent,
  dailyPlanId: string | null,
): ReviewEventFact {
  const base = {
    eventId: event.id,
    promptId: event.promptId,
    dailyPlanId,
    personId: event.personId,
    vocabularyItemId: event.vocabularyItemId,
    reviewedAt: event.reviewedAt,
    previousDueAt: event.previousDueAt,
    parameterSetId: event.parameterSetId,
    elapsedMs: event.elapsedMs,
    memoryRating: event.rating,
  };

  if (
    event.reviewProfile === "recognition" &&
    event.activityType === "recognition_card" &&
    event.answerOutcome === "self_rated" &&
    event.answerNormalizationVersion === null &&
    event.targetRevision === null
  ) {
    return {
      ...base,
      reviewProfile: "recognition",
      activityType: "recognition_card",
      answerOutcome: "self_rated",
      answerNormalizationVersion: null,
      targetRevision: null,
    };
  }

  if (
    event.reviewProfile === "active" &&
    event.activityType === "say" &&
    event.answerOutcome === "self_rated" &&
    event.answerNormalizationVersion === null &&
    event.targetRevision
  ) {
    return {
      ...base,
      reviewProfile: "active",
      activityType: "say",
      answerOutcome: "self_rated",
      answerNormalizationVersion: null,
      targetRevision: event.targetRevision,
    };
  }

  if (
    event.reviewProfile === "active" &&
    (event.activityType === "spell" || event.activityType === "dictation") &&
    (event.answerOutcome === "exact" ||
      event.answerOutcome === "normalized_match" ||
      event.answerOutcome === "different" ||
      event.answerOutcome === "revealed_without_answer") &&
    event.answerNormalizationVersion === "active-answer-v1" &&
    event.targetRevision
  ) {
    return {
      ...base,
      reviewProfile: "active",
      activityType: event.activityType,
      answerOutcome: event.answerOutcome,
      answerNormalizationVersion: "active-answer-v1",
      targetRevision: event.targetRevision,
    };
  }

  throw new DailyStudyContractError(`Review event ${event.id} has inconsistent profile evidence`);
}

function reviewEventFacts(data: VocabularyData) {
  return data.reviewEvents.map((event) =>
    reviewEventFact(
      event,
      findDailyEpisodePlan(event, data.dailyStudyPlans)?.id ?? null,
    ),
  );
}

function sameWindow(a: DailyStudyPlanRecord, b: DailyStudyPlanRecord) {
  return (
    a.localDate === b.localDate &&
    a.timezone === b.timezone &&
    a.dayStartsAt === b.dayStartsAt &&
    a.dayEndsAt === b.dayEndsAt
  );
}

function findPlan(
  data: VocabularyData,
  personId: string,
  reviewProfile: ReviewProfile,
  localDate: string,
) {
  return data.dailyStudyPlans.find(
    (plan) =>
      plan.personId === personId &&
      plan.reviewProfile === reviewProfile &&
      plan.localDate === localDate,
  );
}

export function resolveRetainedStudyWindow(
  data: VocabularyData,
  personId: string,
  timezone: string,
  now: string,
): ResolvedPersonDay {
  const plans = data.dailyStudyPlans.filter((plan) => plan.personId === personId);
  const activePlans = plans.filter((plan) => isInWindow(now, plan));
  const active = activePlans[0];

  if (active) {
    const pairedPlans = plans.filter((plan) => plan.localDate === active.localDate);

    if ([...activePlans, ...pairedPlans].some((plan) => !sameWindow(active, plan))) {
      throw new DailyStudyRuntimeError(
        "plan_mismatch",
        "The retained Track plans have conflicting daily windows",
      );
    }

    // A stored window stays immutable, including the final pre-V2.3 midnight day.
    return active;
  }

  const studyDay = resolveStudyDay(now, timezone);
  const occupied = plans.filter((plan) => plan.localDate === studyDay.localDate);
  const previous = occupied[0];
  const latestClosed = plans
    .filter((plan) => new Date(plan.dayEndsAt).getTime() <= new Date(now).getTime())
    .sort((a, b) => new Date(b.dayEndsAt).getTime() - new Date(a.dayEndsAt).getTime())[0];
  let proposed = studyDay;

  if (previous) {
    const transitionSource = latestClosed && latestClosed.timezone !== studyDay.timezone
      ? latestClosed
      : previous;
    const sourcePlans = plans.filter((plan) => plan.localDate === transitionSource.localDate);
    const previousEnd = new Date(transitionSource.dayEndsAt).getTime();
    const isClosedOverlappingDate =
      previousEnd <= new Date(now).getTime() &&
      previousEnd > new Date(studyDay.dayStartsAt).getTime() &&
      previousEnd <= new Date(studyDay.dayEndsAt).getTime() &&
      occupied.every((plan) => sameWindow(previous, plan)) &&
      sourcePlans.every((plan) => sameWindow(transitionSource, plan));

    if (!isClosedOverlappingDate) {
      throw new DailyStudyRuntimeError(
        "plan_mismatch",
        "The retained study date cannot be reused safely",
      );
    }

    // A legacy midnight day or a timezone change can occupy the current date key.
    // Bridge its stored end to 06:00 using the next unused learning-date key.
    // This creates no gap, no overlap, and changes none of the retained history.
    let offset = 1;
    let successor = resolveStudyDayOffset(now, timezone, offset);
    let successorPlans = plans.filter((plan) => plan.localDate === successor.localDate);

    // A timezone move across the date line may have already used more than one
    // local-date key. Only skip closed dates; a future saved plan remains a conflict.
    while (
      transitionSource.timezone !== studyDay.timezone &&
      successorPlans.length > 0 &&
      successorPlans.every((plan) => new Date(plan.dayEndsAt).getTime() <= previousEnd)
    ) {
      offset += 1;
      successor = resolveStudyDayOffset(now, timezone, offset);
      successorPlans = plans.filter((plan) => plan.localDate === successor.localDate);
    }

    proposed = { ...successor, dayStartsAt: transitionSource.dayEndsAt };
  } else {
    // Moving east can place the new timezone's 06:00 inside a retained old day.
    // Start the successor at the latest closed boundary, never inside old history.
    if (latestClosed && new Date(latestClosed.dayEndsAt) > new Date(proposed.dayStartsAt)) {
      proposed = { ...proposed, dayStartsAt: latestClosed.dayEndsAt };
    }
  }

  const startsAt = new Date(proposed.dayStartsAt).getTime();
  const endsAt = new Date(proposed.dayEndsAt).getTime();
  const conflicts = plans.some((plan) =>
    plan.localDate === proposed.localDate ||
    (new Date(plan.dayStartsAt).getTime() < endsAt &&
      new Date(plan.dayEndsAt).getTime() > startsAt),
  );

  if (conflicts) {
    throw new DailyStudyRuntimeError(
      "plan_mismatch",
      "The new study day overlaps a retained plan; no history was changed",
    );
  }

  return proposed;
}

export function resolveDailyStudyToday(
  data: VocabularyData,
  now = new Date().toISOString(),
  options: Readonly<{ makePlanId?: () => string }> = {},
): Readonly<{ data: VocabularyData; today: DailyStudyTodayResponse }> {
  const calculatedAt = ensureNow(now);
  const personId = getSelectedPersonId(data);
  const settings = getReviewSettingsForPerson(data, personId);
  const personDay = resolveRetainedStudyWindow(data, personId, settings.timezone, calculatedAt);
  const defaultsByProfile = new Map(
    data.dailyStudyDefaults
      .filter((defaults) => defaults.personId === personId)
      .map((defaults) => [defaults.reviewProfile, defaults]),
  );
  const stateFacts = reviewStateFacts(data);
  const eventFacts = reviewEventFacts(data);
  const makePlanId = options.makePlanId ?? (() => makeId("daily_plan"));
  const newDefaults = REVIEW_PROFILES.flatMap((reviewProfile) => {
    if (defaultsByProfile.has(reviewProfile)) {
      return [];
    }

    return [{
      personId,
      reviewProfile,
      reviewGoal:
        reviewProfile === "recognition"
          ? settings.recognitionSessionLimit
          : settings.activeSessionLimit,
      newWordGoal: 0,
      timezone: personDay.timezone,
      updatedAt: calculatedAt,
    }];
  });

  for (const defaults of newDefaults) {
    defaultsByProfile.set(defaults.reviewProfile, defaults);
  }

  const createdPlans = REVIEW_PROFILES.flatMap((reviewProfile) => {
    const existing = findPlan(data, personId, reviewProfile, personDay.localDate);

    if (existing) {
      return [];
    }

    const defaults = defaultsByProfile.get(reviewProfile);

    if (!defaults) {
      throw new DailyStudyRuntimeError("plan_not_found", "Daily defaults could not be resolved");
    }

    const provisionalWindow: DailyPlanWindow = {
      planId: makePlanId(),
      planVersion: 1,
      personId,
      reviewProfile,
      localDate: personDay.localDate,
      timezone: personDay.timezone,
      dayStartsAt: personDay.dayStartsAt,
      dayEndsAt: personDay.dayEndsAt,
      reviewGoal: defaults.reviewGoal,
      newWordGoal: defaults.newWordGoal,
    };
    const suggestedReview = calculateSuggestedReview(provisionalWindow, stateFacts, eventFacts);

    return [{
      id: provisionalWindow.planId,
      personId,
      reviewProfile,
      localDate: personDay.localDate,
      timezone: personDay.timezone,
      dayStartsAt: personDay.dayStartsAt,
      dayEndsAt: personDay.dayEndsAt,
      suggestedReview,
      reviewGoal: provisionalWindow.reviewGoal,
      newWordGoal: provisionalWindow.newWordGoal,
      planVersion: 1,
      recommendationVersion: DAILY_RECOMMENDATION_VERSION,
      calculatedAt,
      updatedAt: calculatedAt,
    }];
  });
  const nextData: VocabularyData =
    createdPlans.length || newDefaults.length
      ? {
          ...data,
          dailyStudyDefaults: [...newDefaults, ...data.dailyStudyDefaults],
          dailyStudyPlans: [...createdPlans, ...data.dailyStudyPlans],
          updatedAt: calculatedAt,
        }
      : data;
  const resolvedPlans = new Map(
    REVIEW_PROFILES.map((reviewProfile) => {
      const plan = findPlan(nextData, personId, reviewProfile, personDay.localDate);

      if (!plan) {
        throw new DailyStudyRuntimeError("plan_not_found", `Missing ${reviewProfile} daily plan`);
      }

      return [reviewProfile, plan];
    }),
  );
  const facts = creationFacts(nextData);
  const reversals = creationReversals(nextData);
  const tracks = Object.fromEntries(
    REVIEW_PROFILES.map((reviewProfile) => {
      const plan = resolvedPlans.get(reviewProfile);

      if (!plan) {
        throw new DailyStudyRuntimeError("plan_not_found", `Missing ${reviewProfile} daily plan`);
      }

      const metrics = buildDailyStudyMetrics({
        window: planRecordToWindow(plan),
        suggestedReview: plan.suggestedReview,
        creationFacts: facts,
        creationReversals: reversals,
        states: stateFacts,
        events: eventFacts,
      });

      return [reviewProfile, {
        reviewProfile,
        status: "available" as const,
        planId: plan.id,
        planVersion: plan.planVersion,
        metrics,
        recommendationVersion: plan.recommendationVersion,
        calculatedAt: plan.calculatedAt,
        unavailableReason: null,
      }];
    }),
  ) as DailyStudyTodayResponse["tracks"];

  return {
    data: nextData,
    today: {
      personId,
      localDate: personDay.localDate,
      timezone: personDay.timezone,
      dayStartsAt: personDay.dayStartsAt,
      dayEndsAt: personDay.dayEndsAt,
      tracks,
    },
  };
}

function assertCurrentPlan(
  data: VocabularyData,
  command: Pick<
    UpdateTodayGoalsCommand,
    "personId" | "planId" | "localDate" | "reviewProfile"
  >,
) {
  const plan = data.dailyStudyPlans.find(
    (candidate) =>
      candidate.id === command.planId &&
      candidate.personId === command.personId &&
      candidate.localDate === command.localDate &&
      candidate.reviewProfile === command.reviewProfile,
  );

  if (!plan) {
    throw new DailyStudyRuntimeError("plan_not_found", "Daily plan not found");
  }

  return plan;
}

export function updateDailyStudyTodayGoals(
  data: VocabularyData,
  input: unknown,
  now = new Date().toISOString(),
) {
  const updatedAt = ensureNow(now);
  const command = validateUpdateTodayGoalsCommand(input);

  if (getSelectedPersonId(data) !== command.personId) {
    throw new DailyStudyRuntimeError("person_mismatch", "Today goals belong to another learner");
  }

  const plan = assertCurrentPlan(data, command);

  if (plan.planVersion !== command.expectedPlanVersion) {
    throw new DailyStudyRuntimeError("stale_plan", "Today’s goals changed elsewhere. Reload and try again.");
  }

  if (!isInWindow(updatedAt, plan)) {
    throw new DailyStudyRuntimeError("stale_plan", "This study day has ended. Reload today’s plan.");
  }

  if (plan.reviewGoal === command.reviewGoal && plan.newWordGoal === command.newWordGoal) {
    return { data, plan };
  }

  const nextPlan = {
    ...plan,
    reviewGoal: command.reviewGoal,
    newWordGoal: command.newWordGoal,
    planVersion: plan.planVersion + 1,
    updatedAt,
  };

  return {
    data: {
      ...data,
      dailyStudyPlans: data.dailyStudyPlans.map((candidate) =>
        candidate.id === plan.id && candidate.personId === plan.personId ? nextPlan : candidate,
      ),
      updatedAt,
    },
    plan: nextPlan,
  };
}

export function updateDailyStudyDefaults(
  data: VocabularyData,
  input: Readonly<{
    personId: string;
    timezone: string;
    goals: readonly UpdateDefaultGoalsCommand[];
  }>,
  now = new Date().toISOString(),
) {
  const updatedAt = ensureNow(now);

  if (getSelectedPersonId(data) !== input.personId) {
    throw new DailyStudyRuntimeError("person_mismatch", "Daily defaults belong to another learner");
  }

  resolvePersonDay(updatedAt, input.timezone);
  const byProfile = new Map(
    input.goals.map((entry) => {
      if (entry.personId !== input.personId || !REVIEW_PROFILES.includes(entry.reviewProfile)) {
        throw new DailyStudyRuntimeError("person_mismatch", "Daily default scope is invalid");
      }

      return [entry.reviewProfile, validateDailyGoals(entry)];
    }),
  );

  if (byProfile.size !== REVIEW_PROFILES.length) {
    throw new DailyStudyContractError("Daily defaults require both Review Profiles");
  }

  const defaults = REVIEW_PROFILES.map((reviewProfile) => {
    const goals = byProfile.get(reviewProfile);

    if (!goals) {
      throw new DailyStudyContractError(`Missing ${reviewProfile} daily defaults`);
    }

    return {
      personId: input.personId,
      reviewProfile,
      ...goals,
      timezone: input.timezone.trim(),
      updatedAt,
    };
  });
  const settingsByPerson = data.settingsByPerson.map((settings) =>
    settings.personId === input.personId
      ? { ...settings, timezone: input.timezone.trim(), updatedAt }
      : settings,
  );

  return {
    ...data,
    dailyStudyDefaults: [
      ...defaults,
      ...data.dailyStudyDefaults.filter((entry) => entry.personId !== input.personId),
    ],
    settingsByPerson,
    updatedAt,
  };
}

export function getLearningStage(
  data: VocabularyData,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile,
): LearningStage {
  const personId = getSelectedPersonId(data);
  const hasState = data.reviewStates.some(
    (state) =>
      state.personId === personId &&
      state.vocabularyItemId === vocabularyItemId &&
      state.reviewProfile === reviewProfile,
  );
  const hasEvent = data.reviewEvents.some(
    (event) =>
      event.personId === personId &&
      event.vocabularyItemId === vocabularyItemId &&
      event.reviewProfile === reviewProfile,
  );

  return hasState || hasEvent ? "in_review" : "new";
}

function eventsForProfile(
  data: VocabularyData,
  personId: string,
  vocabularyItemId: string,
  reviewProfile: ReviewProfile,
) {
  return data.reviewEvents
    .filter(
      (event) =>
        event.personId === personId &&
        event.vocabularyItemId === vocabularyItemId &&
        event.reviewProfile === reviewProfile,
    )
    .sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id));
}

function queueFacts(
  data: VocabularyData,
  window: DailyPlanWindow,
): StudyQueueEntryFact[] {
  const startsAt = new Date(window.dayStartsAt).getTime();
  const facts: StudyQueueEntryFact[] = [];
  const currentPlan = data.dailyStudyPlans.find(
    (plan) =>
      plan.id === window.planId &&
      plan.personId === window.personId &&
      plan.reviewProfile === window.reviewProfile,
  );

  if (!currentPlan) {
    throw new DailyStudyContractError("Study queue Daily Plan could not be resolved");
  }

  for (const item of data.items) {
    if (
      item.personId !== window.personId ||
      item.learningTrack !== window.reviewProfile ||
      !isAvailableItem(item, window.reviewProfile)
    ) {
      continue;
    }

    if (window.reviewProfile === "active" && !hasChineseMeaning(item)) {
      continue;
    }

    const state = data.reviewStates.find(
      (candidate) =>
        candidate.personId === window.personId &&
        candidate.vocabularyItemId === item.id &&
        candidate.reviewProfile === window.reviewProfile,
    );
    const events = eventsForProfile(
      data,
      window.personId,
      item.id,
      window.reviewProfile,
    );
    const latestEvent = events.at(-1);
    const eventsInPlan = getDailyEpisodeEvents(
      events,
      currentPlan,
      item.id,
      data.dailyStudyPlans,
    );
    const episode = getDailyEpisodeAttemptSummary(eventsInPlan);
    const completedInPlan = episode.completed;
    const unfinishedInPlan = episode.attemptCount > 0 && !episode.completed;
    const priorEvents = events.filter(
      (event) => new Date(event.reviewedAt).getTime() < startsAt,
    );
    const hasPriorState = Boolean(
      state &&
        (state.historyOrigin === "legacy_unknown" ||
          (state.firstRatedAt !== null &&
            new Date(state.firstRatedAt).getTime() < startsAt)),
    );
    const hadHistoryBeforePlan = priorEvents.length > 0 || hasPriorState;
    const latestEpisode = getLatestDailyEpisodeAttemptSummary(
      events,
      data.dailyStudyPlans,
    );
    if (!state && !latestEvent) {
      facts.push({
        vocabularyItemId: item.id,
        systemCreatedAt: item.systemCreatedAt,
        dueAt: null,
        personId: window.personId,
        learningTrack: item.learningTrack,
        reviewProfile: window.reviewProfile,
        isAvailable: true,
        completedInPlan: false,
        unfinishedInPlan: false,
        sameSessionRepeat: false,
        promptToken: "",
        forgotCount: 0,
        hardCount: 0,
        historyKind: "none" as const,
        firstRatedAt: null,
      });
      continue;
    }

    if (!hadHistoryBeforePlan && unfinishedInPlan) {
      facts.push({
        vocabularyItemId: item.id,
        systemCreatedAt: item.systemCreatedAt,
        dueAt: null,
        personId: window.personId,
        learningTrack: item.learningTrack,
        reviewProfile: window.reviewProfile,
        isAvailable: true,
        completedInPlan: false,
        unfinishedInPlan: true,
        sameSessionRepeat: false,
        promptToken: "",
        forgotCount: latestEpisode.forgotCount,
        hardCount: latestEpisode.hardCount,
        historyKind: "none" as const,
        firstRatedAt: null,
      });
      continue;
    }

    const dueAt = state?.dueAt ?? latestEvent?.nextDueAt;

    if (!dueAt) {
      throw new DailyStudyContractError(`Study history for ${item.id} has no next review time`);
    }

    if (state?.historyOrigin === "legacy_unknown") {
      facts.push({
        vocabularyItemId: item.id,
        systemCreatedAt: item.systemCreatedAt,
        dueAt,
        personId: window.personId,
        learningTrack: item.learningTrack,
        reviewProfile: window.reviewProfile,
        isAvailable: true,
        completedInPlan,
        unfinishedInPlan,
        sameSessionRepeat: false,
        promptToken: "",
        forgotCount: latestEpisode.forgotCount,
        hardCount: latestEpisode.hardCount,
        historyKind: "legacy_unknown" as const,
        firstRatedAt: null,
      });
      continue;
    }

    facts.push({
      vocabularyItemId: item.id,
      systemCreatedAt: item.systemCreatedAt,
      dueAt,
      personId: window.personId,
      learningTrack: item.learningTrack,
      reviewProfile: window.reviewProfile,
      isAvailable: true,
      completedInPlan,
      unfinishedInPlan,
      sameSessionRepeat: false,
      promptToken: "",
      forgotCount: latestEpisode.forgotCount,
      hardCount: latestEpisode.hardCount,
      historyKind: "recorded" as const,
      firstRatedAt: state?.firstRatedAt ?? events[0]?.reviewedAt ?? item.systemCreatedAt,
    });
  }

  return facts;
}

export function readDailyStudyQueue(
  data: VocabularyData,
  query: TrustedStudyQueueQuery,
  issuePromptToken: (seed: PromptSeed) => string = (seed) =>
    `local-prompt:${seed.planId}:${seed.vocabularyItemId}`,
): StudyQueuePage {
  const activityType =
    query.activityType ??
    (query.reviewProfile === "recognition" ? "recognition_card" : null);
  const recognitionActivity =
    query.reviewProfile === "recognition" &&
    activityType === "recognition_card";
  const activeActivity =
    query.reviewProfile === "active" &&
    (activityType === "say" ||
      activityType === "spell" ||
      activityType === "dictation");

  if (!recognitionActivity && !activeActivity) {
    throw new DailyStudyRuntimeError(
      "plan_mismatch",
      "Study activity does not match the selected Review Profile.",
    );
  }

  if (getSelectedPersonId(data) !== query.personId) {
    throw new DailyStudyRuntimeError("person_mismatch", "Study queue belongs to another learner");
  }

  const plan = assertCurrentPlan(data, query);
  const window = planRecordToWindow(plan);
  const metrics = buildDailyStudyMetrics({
    window,
    suggestedReview: plan.suggestedReview,
    creationFacts: creationFacts(data),
    creationReversals: creationReversals(data),
    states: reviewStateFacts(data),
    events: reviewEventFacts(data),
  });

  const page = selectStudyQueuePage({
    window,
    query,
    completedDistinctEntries:
      query.zone === "new" ? metrics.learnedToday : metrics.reviewedToday,
    entries: queueFacts(data, window),
  });

  return {
    ...page,
    entries: page.entries.map((entry) => ({
      ...entry,
      promptToken: issuePromptToken(
        window.reviewProfile === "recognition"
          ? {
              personId: window.personId,
              planId: window.planId,
              planVersion: window.planVersion,
              localDate: window.localDate,
              vocabularyItemId: entry.vocabularyItemId,
              reviewProfile: "recognition",
              activityType: "recognition_card",
              targetRevision: null,
            }
          : {
              personId: window.personId,
              planId: window.planId,
              planVersion: window.planVersion,
              localDate: window.localDate,
              vocabularyItemId: entry.vocabularyItemId,
              reviewProfile: "active",
              activityType: activityType as "say" | "spell" | "dictation",
              targetRevision: createActiveTargetRevision(
                data.items.find((item) => item.id === entry.vocabularyItemId)!,
              ),
            },
      ),
    })),
  };
}

function isInWindow(value: string, plan: DailyStudyPlanRecord) {
  const time = new Date(value).getTime();
  return time >= new Date(plan.dayStartsAt).getTime() && time < new Date(plan.dayEndsAt).getTime();
}

function restoreLegacyBaseline(
  previousState: ReviewState,
  removedEvents: ReviewEvent[],
  now: string,
) {
  const firstRemoved = [...removedEvents].sort(
    (a, b) => a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id),
  )[0];

  if (!firstRemoved?.previousDueAt || firstRemoved.previousIntervalMinutes === null) {
    throw new DailyStudyRuntimeError(
      "plan_mismatch",
      "Legacy review history cannot be restored safely; no progress was changed.",
    );
  }

  return {
    ...previousState,
    firstRatedAt: null,
    historyOrigin: "legacy_unknown" as const,
    dueAt: firstRemoved.previousDueAt,
    lastReviewedAt: null,
    reviewCount: Math.max(0, previousState.reviewCount - removedEvents.length),
    lapseCount: Math.max(
      0,
      previousState.lapseCount - removedEvents.filter((event) => event.rating === "forgot").length,
    ),
    intervalMinutes: firstRemoved.previousIntervalMinutes,
    difficulty: null,
    stability: null,
    updatedAt: now,
  };
}

export function rebuildRecognitionStateAfterDayReset(
  personId: string,
  vocabularyItemId: string,
  previousState: ReviewState | undefined,
  earlierEvents: ReviewEvent[],
  removedEvents: ReviewEvent[],
  now: string,
  options: Readonly<{
    dailyStudyPlans?: readonly DailyStudyPlanRecord[];
    makeStateId?: () => string;
  }> = {},
) {
  return rebuildReviewProfileStateAfterDayReset(
    "recognition",
    personId,
    vocabularyItemId,
    previousState,
    earlierEvents,
    removedEvents,
    now,
    options,
  );
}

export function rebuildReviewProfileStateAfterDayReset(
  reviewProfile: ReviewProfile,
  personId: string,
  vocabularyItemId: string,
  previousState: ReviewState | undefined,
  earlierEvents: ReviewEvent[],
  removedEvents: ReviewEvent[],
  now: string,
  options: Readonly<{
    dailyStudyPlans?: readonly DailyStudyPlanRecord[];
    makeStateId?: () => string;
  }> = {},
) {
  const rebuilt = rebuildReviewProfileStateFromEvents(
    personId,
    vocabularyItemId,
    reviewProfile,
    earlierEvents,
    previousState,
    options,
  );

  if (rebuilt) {
    return rebuilt;
  }

  if (previousState?.historyOrigin === "legacy_unknown") {
    return restoreLegacyBaseline(previousState, removedEvents, now);
  }

  return undefined;
}

export function resetDailyStudyToday(
  data: VocabularyData,
  input: unknown,
  now = new Date().toISOString(),
) {
  const updatedAt = ensureNow(now);
  const command = validateResetTodayCommand(input);

  if (getSelectedPersonId(data) !== command.personId) {
    throw new DailyStudyRuntimeError("person_mismatch", "Reset belongs to another learner");
  }

  const plan = data.dailyStudyPlans.find(
    (candidate) =>
      candidate.id === command.planId &&
      candidate.personId === command.personId &&
      candidate.localDate === command.localDate,
  );

  if (!plan) {
    throw new DailyStudyRuntimeError("plan_not_found", "Today’s plan could not be found");
  }

  if (!isInWindow(updatedAt, plan)) {
    throw new DailyStudyRuntimeError("stale_plan", "This study day has ended. Reload today’s plan.");
  }

  const pairedPlans = data.dailyStudyPlans.filter(
    (candidate) =>
      candidate.personId === command.personId && candidate.localDate === command.localDate,
  );

  if (
    pairedPlans.length !== REVIEW_PROFILES.length ||
    pairedPlans.some((candidate) => !sameWindow(plan, candidate))
  ) {
    throw new DailyStudyRuntimeError("plan_mismatch", "Today’s Track plans are incomplete");
  }

  const eventsToday = data.reviewEvents.filter(
    (event) => event.personId === command.personId && isInWindow(event.reviewedAt, plan),
  );

  if (eventsToday.length === 0) {
    return {
      data,
      resetEventsCount: 0,
      resetItemsCount: 0,
      command: command as ResetTodayCommand,
    };
  }

  const removedEventIds = new Set(eventsToday.map((event) => event.id));
  const remainingEvents = data.reviewEvents.filter((event) => !removedEventIds.has(event.id));
  const affectedScopes = new Map<
    string,
    { reviewProfile: ReviewProfile; vocabularyItemId: string }
  >();

  for (const event of eventsToday) {
    affectedScopes.set(`${event.reviewProfile}\u0000${event.vocabularyItemId}`, {
      reviewProfile: event.reviewProfile,
      vocabularyItemId: event.vocabularyItemId,
    });
  }

  const rebuiltStates = Array.from(affectedScopes.values()).flatMap(
    ({ reviewProfile, vocabularyItemId }) => {
    const previousState = data.reviewStates.find(
      (state) =>
        state.personId === command.personId &&
        state.vocabularyItemId === vocabularyItemId &&
        state.reviewProfile === reviewProfile,
    );
    const earlierEvents = remainingEvents
      .filter(
        (event) =>
          event.personId === command.personId &&
          event.vocabularyItemId === vocabularyItemId &&
          event.reviewProfile === reviewProfile,
      )
      .sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id));
    return rebuildReviewProfileStateAfterDayReset(
      reviewProfile,
      command.personId,
      vocabularyItemId,
      previousState,
      earlierEvents,
      eventsToday.filter(
        (event) =>
          event.reviewProfile === reviewProfile &&
          event.vocabularyItemId === vocabularyItemId,
      ),
      updatedAt,
      { dailyStudyPlans: data.dailyStudyPlans },
    );
  }).filter((state): state is ReviewState => Boolean(state));
  const affectedItemIds = new Set(
    Array.from(affectedScopes.values()).map((scope) => scope.vocabularyItemId),
  );

  return {
    data: {
      ...data,
      reviewEvents: remainingEvents,
      reviewStates: [
        ...rebuiltStates,
        ...data.reviewStates.filter(
          (state) =>
            !(
              state.personId === command.personId &&
              affectedScopes.has(
                `${state.reviewProfile}\u0000${state.vocabularyItemId}`,
              )
            ),
        ),
      ],
      updatedAt,
    },
    resetEventsCount: eventsToday.length,
    resetItemsCount: affectedItemIds.size,
    command: command as ResetTodayCommand,
  };
}
