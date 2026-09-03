import {
  ACTIVE_PARAMETER_SET_ID,
  RECOGNITION_PARAMETER_SET_ID,
  isActiveParameterSetId,
  isRecognitionParameterSetId,
  type RecognitionParameterSetId,
  type ReviewRating,
  type ReviewState,
} from "./types";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";
import { State } from "ts-fsrs";
import { getSelectedReviewSettings, normalizeSessionLimit } from "./settings";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getRecognitionVocabularyItems } from "@/lib/vocabulary/repository";
import {
  applyRecognitionFsrsRating,
  createRecognitionFsrsCardFromReviewState,
} from "./fsrs-recognition";
import {
  applyActiveFsrsRating,
  createActiveFsrsCardFromReviewState,
} from "./fsrs-active";
import type { ReviewProfile } from "./types";

export type ScheduledReview = {
  status: ReviewState["status"];
  dueAt: string;
  intervalMinutes: number;
  lapseCount: number;
  reviewCount: number;
  difficulty: number;
  stability: number;
  scheduledDays: number;
};

function getIntervalMinutes(reviewedAt: string, dueAt: string) {
  const reviewedAtTime = new Date(reviewedAt).getTime();
  const dueAtTime = new Date(dueAt).getTime();
  const rawMinutes = Math.round((dueAtTime - reviewedAtTime) / 60_000);

  return Math.max(1, rawMinutes);
}

function toReviewStateStatus(state: State): ReviewState["status"] {
  return state === State.Review ? "review" : "learning";
}

export function scheduleNextReview(
  previousState: ReviewState | undefined,
  rating: ReviewRating,
  reviewedAt = new Date().toISOString(),
  parameterSetId: RecognitionParameterSetId = RECOGNITION_PARAMETER_SET_ID,
): ScheduledReview {
  const card = createRecognitionFsrsCardFromReviewState(previousState, reviewedAt);
  const outcome = applyRecognitionFsrsRating(
    card,
    rating,
    reviewedAt,
    parameterSetId,
  );

  return {
    status: toReviewStateStatus(outcome.state),
    dueAt: outcome.dueAt,
    intervalMinutes: getIntervalMinutes(reviewedAt, outcome.dueAt),
    lapseCount: outcome.lapses,
    reviewCount: outcome.reps,
    difficulty: outcome.difficulty,
    stability: outcome.stability,
    scheduledDays: outcome.scheduledDays,
  };
}

export function scheduleNextReviewForProfile(
  reviewProfile: ReviewProfile,
  previousState: ReviewState | undefined,
  rating: ReviewRating,
  reviewedAt = new Date().toISOString(),
  parameterSetId: string =
    reviewProfile === "recognition"
      ? RECOGNITION_PARAMETER_SET_ID
      : ACTIVE_PARAMETER_SET_ID,
): ScheduledReview {
  if (previousState && previousState.reviewProfile !== reviewProfile) {
    throw new Error("Review Profile state does not match the requested scheduler");
  }

  if (reviewProfile === "recognition") {
    if (!isRecognitionParameterSetId(parameterSetId)) {
      throw new Error("Recognition scheduler received an unsupported Parameter Set");
    }

    return scheduleNextReview(
      previousState,
      rating,
      reviewedAt,
      parameterSetId,
    );
  }

  if (!isActiveParameterSetId(parameterSetId)) {
    throw new Error("Active scheduler received an unsupported Parameter Set");
  }

  const card = createActiveFsrsCardFromReviewState(previousState, reviewedAt);
  const outcome = applyActiveFsrsRating(
    card,
    rating,
    reviewedAt,
    parameterSetId,
  );

  return {
    status: toReviewStateStatus(outcome.state),
    dueAt: outcome.dueAt,
    intervalMinutes: getIntervalMinutes(reviewedAt, outcome.dueAt),
    lapseCount: outcome.lapses,
    reviewCount: outcome.reps,
    difficulty: outcome.difficulty,
    stability: outcome.stability,
    scheduledDays: outcome.scheduledDays,
  };
}

export function getLocalDateKey(isoDate: string, timeZone: string) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to UTC when an unexpected timezone value reaches local storage.
  }

  return date.toISOString().slice(0, 10);
}

export function isDueByLocalDateBucket(dueAt: string, now: string, timeZone: string) {
  const dueDateKey = getLocalDateKey(dueAt, timeZone);
  const nowDateKey = getLocalDateKey(now, timeZone);

  return Boolean(dueDateKey && nowDateKey && dueDateKey <= nowDateKey);
}

function getReviewStateByVocabularyId(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return new Map(
    data.reviewStates
      .filter(
        (state) => state.personId === personId && state.reviewProfile === "recognition",
      )
      .map((state) => [state.vocabularyItemId, state]),
  );
}

function compareByDateThenText(a: VocabularyItem, b: VocabularyItem) {
  const dateCompare = a.createdAt.localeCompare(b.createdAt);

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return a.normalizedText.localeCompare(b.normalizedText);
}

export function selectReviewQueue(
  data: VocabularyData,
  now = new Date().toISOString(),
  sessionLimit = getSelectedReviewSettings(data).recognitionSessionLimit,
) {
  const timezone = getSelectedReviewSettings(data).timezone;
  const stateByVocabularyId = getReviewStateByVocabularyId(data);
  const activeItems = getRecognitionVocabularyItems(data);
  const dueItems = activeItems
    .filter((item) => {
      const state = stateByVocabularyId.get(item.id);

      return state ? isDueByLocalDateBucket(state.dueAt, now, timezone) : false;
    })
    .sort((a, b) => {
      const stateA = stateByVocabularyId.get(a.id);
      const stateB = stateByVocabularyId.get(b.id);
      const dueCompare = (stateA?.dueAt ?? "").localeCompare(stateB?.dueAt ?? "");

      if (dueCompare !== 0) {
        return dueCompare;
      }

      return compareByDateThenText(a, b);
    });
  const newItems = activeItems
    .filter((item) => !stateByVocabularyId.has(item.id))
    .sort(compareByDateThenText);

  return [...dueItems, ...newItems].slice(0, normalizeSessionLimit(sessionLimit));
}
