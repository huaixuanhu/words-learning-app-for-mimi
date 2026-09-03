import type { DailyStudyPlanRecord } from "@/lib/storage/v2-data-model";
import { scheduleNextReviewForProfile, type ScheduledReview } from "./scheduler";
import { isPassingSessionRating } from "./session-queue";
import type { ReviewEvent, ReviewRating, ReviewState } from "./types";

function timestamp(value: string, label: string) {
  const time = new Date(value).getTime();

  if (!Number.isFinite(time)) {
    throw new Error(`${label} must be a valid timestamp`);
  }

  return time;
}

function assertReviewPlan(plan: DailyStudyPlanRecord) {
  if (plan.reviewProfile !== "recognition" && plan.reviewProfile !== "active") {
    throw new Error("Daily scheduling requires a supported Review Profile plan");
  }

  const startsAt = timestamp(plan.dayStartsAt, "plan.dayStartsAt");
  const endsAt = timestamp(plan.dayEndsAt, "plan.dayEndsAt");

  if (endsAt <= startsAt) {
    throw new Error("Daily plan must end after it starts");
  }
}

function sortReviewEvents(a: ReviewEvent, b: ReviewEvent) {
  return a.reviewedAt.localeCompare(b.reviewedAt) || a.id.localeCompare(b.id);
}

export function isReviewEventInDailyPlan(
  event: ReviewEvent,
  plan: DailyStudyPlanRecord,
) {
  if (
    event.personId !== plan.personId ||
    event.reviewProfile !== plan.reviewProfile
  ) {
    return false;
  }

  const reviewedAt = timestamp(event.reviewedAt, "event.reviewedAt");

  return (
    reviewedAt >= timestamp(plan.dayStartsAt, "plan.dayStartsAt") &&
    reviewedAt < timestamp(plan.dayEndsAt, "plan.dayEndsAt")
  );
}

export function findDailyEpisodePlan(
  event: ReviewEvent,
  plans: readonly DailyStudyPlanRecord[],
) {
  const eventTime = timestamp(event.reviewedAt, "event.reviewedAt");
  const matches = plans
    .filter(
      (plan) =>
        isReviewEventInDailyPlan(event, plan) &&
        timestamp(plan.calculatedAt, "plan.calculatedAt") <= eventTime,
    )
    .sort(
      (a, b) =>
        timestamp(b.calculatedAt, "plan.calculatedAt") -
          timestamp(a.calculatedAt, "plan.calculatedAt") ||
        b.id.localeCompare(a.id),
    );

  if (
    matches[0] &&
    matches[1] &&
    timestamp(matches[0].calculatedAt, "plan.calculatedAt") ===
      timestamp(matches[1].calculatedAt, "plan.calculatedAt")
  ) {
    throw new Error(`Review event ${event.id} belongs to overlapping Daily Plans`);
  }

  return matches[0] ?? null;
}

export function getDailyEpisodeEvents(
  events: readonly ReviewEvent[],
  plan: DailyStudyPlanRecord,
  vocabularyItemId: string,
  allPlans: readonly DailyStudyPlanRecord[] = [plan],
) {
  assertReviewPlan(plan);

  return events
    .filter(
      (event) =>
        event.vocabularyItemId === vocabularyItemId &&
        event.reviewProfile === plan.reviewProfile &&
        findDailyEpisodePlan(event, allPlans)?.id === plan.id,
    )
    .sort(sortReviewEvents);
}

export function getDailyEpisodeAttemptSummary(
  events: readonly ReviewEvent[],
) {
  const ordered = [...events].sort(sortReviewEvents);

  return {
    anchor: ordered[0] ?? null,
    completed: ordered.some((event) => isPassingSessionRating(event.rating)),
    forgotCount: ordered.filter((event) => event.rating === "forgot").length,
    hardCount: ordered.filter((event) => event.rating === "hard").length,
    attemptCount: ordered.length,
  } as const;
}

export function getLatestDailyEpisodeAttemptSummary(
  events: readonly ReviewEvent[],
  plans: readonly DailyStudyPlanRecord[],
) {
  const eventsByPlanId = new Map<string, ReviewEvent[]>();
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  for (const event of events) {
    const plan = findDailyEpisodePlan(event, plans);

    if (!plan) {
      continue;
    }

    const grouped = eventsByPlanId.get(plan.id) ?? [];
    grouped.push(event);
    eventsByPlanId.set(plan.id, grouped);
  }

  const latest = Array.from(eventsByPlanId.entries())
    .map(([planId, episodeEvents]) => ({
      plan: planById.get(planId),
      events: episodeEvents,
    }))
    .filter(
      (entry): entry is { plan: DailyStudyPlanRecord; events: ReviewEvent[] } =>
        Boolean(entry.plan),
    )
    .sort(
      (a, b) =>
        timestamp(b.plan.dayStartsAt, "plan.dayStartsAt") -
          timestamp(a.plan.dayStartsAt, "plan.dayStartsAt") ||
        b.plan.id.localeCompare(a.plan.id),
    )[0];

  return latest
    ? { planId: latest.plan.id, ...getDailyEpisodeAttemptSummary(latest.events) }
    : {
        planId: null,
        anchor: null,
        completed: false,
        forgotCount: 0,
        hardCount: 0,
        attemptCount: 0,
      };
}

function scheduleFromState(state: ReviewState): ScheduledReview {
  if (
    state.difficulty === null ||
    !Number.isFinite(state.difficulty) ||
    state.stability === null ||
    !Number.isFinite(state.stability)
  ) {
    throw new Error("An unfinished daily episode has incomplete FSRS state");
  }

  return {
    status: state.status,
    dueAt: state.dueAt,
    intervalMinutes: state.intervalMinutes,
    lapseCount: state.lapseCount,
    reviewCount: state.reviewCount,
    difficulty: state.difficulty,
    stability: state.stability,
    scheduledDays: Math.max(0, Math.round(state.intervalMinutes / 1440)),
  };
}

function capAtNextLocalDay(
  schedule: ScheduledReview,
  reviewedAt: string,
  plan: DailyStudyPlanRecord,
): ScheduledReview {
  const reviewedAtTime = timestamp(reviewedAt, "reviewedAt");
  const endsAt = timestamp(plan.dayEndsAt, "plan.dayEndsAt");

  if (reviewedAtTime >= endsAt) {
    throw new Error("Daily episode attempt must occur before the plan ends");
  }

  const intervalMinutes = Math.max(
    1,
    Math.round((endsAt - reviewedAtTime) / 60_000),
  );

  return {
    ...schedule,
    dueAt: plan.dayEndsAt,
    intervalMinutes,
    scheduledDays: 1,
  };
}

export function scheduleDailyEpisodeAttempt(input: {
  previousState: ReviewState | undefined;
  priorEpisodeEvents: readonly ReviewEvent[];
  rating: ReviewRating;
  reviewedAt: string;
  plan: DailyStudyPlanRecord;
  parameterSetId?: string;
}) {
  assertReviewPlan(input.plan);
  const reviewedAt = timestamp(input.reviewedAt, "reviewedAt");
  const startsAt = timestamp(input.plan.dayStartsAt, "plan.dayStartsAt");
  const endsAt = timestamp(input.plan.dayEndsAt, "plan.dayEndsAt");

  if (reviewedAt < startsAt || reviewedAt >= endsAt) {
    throw new Error("Daily episode attempt does not belong to the supplied plan");
  }

  for (const event of input.priorEpisodeEvents) {
    if (
      event.reviewProfile !== input.plan.reviewProfile ||
      !isReviewEventInDailyPlan(event, input.plan)
    ) {
      throw new Error(`Review event ${event.id} does not belong to the supplied plan`);
    }
  }

  if (input.priorEpisodeEvents.length > 0) {
    if (!input.previousState) {
      throw new Error("An unfinished daily episode is missing its anchor state");
    }

    return {
      isSchedulingAnchor: false,
      effectiveRating: null,
      schedule: scheduleFromState(input.previousState),
    } as const;
  }

  const wasNewAtPlanStart = !input.previousState;
  const failedAnchor = input.rating === "forgot" || input.rating === "hard";
  const effectiveRating: ReviewRating = failedAnchor ? "forgot" : input.rating;
  const scheduled = scheduleNextReviewForProfile(
    input.plan.reviewProfile,
    input.previousState,
    effectiveRating,
    input.reviewedAt,
    input.parameterSetId,
  );
  const requiresNextDayCheckpoint =
    failedAnchor || (wasNewAtPlanStart && input.rating === "vague");

  return {
    isSchedulingAnchor: true,
    effectiveRating,
    schedule: requiresNextDayCheckpoint
      ? capAtNextLocalDay(scheduled, input.reviewedAt, input.plan)
      : scheduled,
  } as const;
}
