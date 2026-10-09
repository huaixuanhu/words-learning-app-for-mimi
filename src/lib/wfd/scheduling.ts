import { WfdDataError, type WfdAttempt, type WfdProgress } from "./types";

const DAY = 86_400_000;
const RETRY = 10 * 60_000;
/** Conservative starting heuristics, not measured personal forgetting probabilities. */
export const WFD_REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

function timestamp(value: string): number {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new WfdDataError("WFD progress has an invalid date.");
  return time;
}

export function isIndependentWfdAttempt(attempt: WfdAttempt): boolean {
  return attempt.mode === "dictation" && !attempt.assisted && attempt.playCount === 1;
}

export function isWfdDue(progress: WfdProgress | undefined, now = new Date().toISOString()): boolean {
  return !!progress?.dueAt && timestamp(progress.dueAt) <= timestamp(now);
}

export function markWfdLearned(
  previous: WfdProgress | undefined,
  now = new Date().toISOString(),
): WfdProgress {
  const time = timestamp(now);
  return {
    ...previous,
    learnedAt: previous?.learnedAt ?? now,
    dueAt: previous?.dueAt ?? new Date(time + RETRY).toISOString(),
    successfulReviews: previous?.successfulReviews ?? 0,
    lapses: previous?.lapses ?? 0,
  };
}

export function scheduleWfdAttempt(
  previous: WfdProgress | undefined,
  attempt: WfdAttempt,
): WfdProgress {
  const time = timestamp(attempt.submittedAt);
  if (previous?.lastAttemptAt && timestamp(previous.lastAttemptAt) > time) {
    throw new WfdDataError("This WFD attempt predates the saved progress. Reload before saving.");
  }
  const independent = isIndependentWfdAttempt(attempt);
  const next: WfdProgress = {
    ...previous,
    lastAttemptAt: attempt.submittedAt,
    successfulReviews: previous?.successfulReviews ?? 0,
    lapses: previous?.lapses ?? 0,
  };
  if (!attempt.correct) {
    return {
      ...next,
      dueAt: new Date(time + RETRY).toISOString(),
      intervalDays: RETRY / DAY,
      successfulReviews: 0,
      lapses: (previous?.lapses ?? 0) + (independent ? 1 : 0),
    };
  }
  if (!independent) {
    // Assisted recall is useful learning, but never a successful independent review.
    return markWfdLearned(next, attempt.submittedAt);
  }
  const hasPreviousSuccess = (previous?.successfulReviews ?? 0) > 0;
  const tooSoon = hasPreviousSuccess && (
    (previous?.dueAt && timestamp(previous.dueAt) > time) ||
    (previous?.lastIndependentSuccessAt && time - timestamp(previous.lastIndependentSuccessAt) < 20 * 60 * 60_000)
  );
  if (tooSoon) return next;

  const successfulReviews = (previous?.successfulReviews ?? 0) + 1;
  const intervalDays = WFD_REVIEW_INTERVALS_DAYS[
    Math.min(successfulReviews - 1, WFD_REVIEW_INTERVALS_DAYS.length - 1)
  ];
  return {
    ...next,
    learnedAt: previous?.learnedAt ?? attempt.submittedAt,
    successfulReviews,
    lastIndependentSuccessAt: attempt.submittedAt,
    intervalDays,
    dueAt: new Date(time + intervalDays * DAY).toISOString(),
  };
}
