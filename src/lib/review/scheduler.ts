import type { ReviewRating, ReviewState } from "./types";
import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";
import { getSelectedReviewSettings, normalizeSessionLimit } from "./settings";
import { getSelectedPersonId } from "@/lib/people/repository";
import { getRecognitionVocabularyItems } from "@/lib/vocabulary/repository";

export const REVIEW_INTERVAL_MINUTES: Record<ReviewRating, number> = {
  forgot: 10,
  hard: 60 * 24,
  vague: 60 * 24 * 3,
  remembered: 60 * 24 * 7,
};

export type ScheduledReview = {
  status: ReviewState["status"];
  dueAt: string;
  intervalMinutes: number;
  lapseCount: number;
  reviewCount: number;
};

export function addMinutes(isoDate: string, minutes: number) {
  const start = new Date(isoDate);

  return new Date(start.getTime() + minutes * 60_000).toISOString();
}

export function scheduleNextReview(
  previousState: ReviewState | undefined,
  rating: ReviewRating,
  reviewedAt = new Date().toISOString(),
): ScheduledReview {
  const intervalMinutes = REVIEW_INTERVAL_MINUTES[rating];

  return {
    status: rating === "forgot" ? "learning" : "review",
    dueAt: addMinutes(reviewedAt, intervalMinutes),
    intervalMinutes,
    lapseCount: (previousState?.lapseCount ?? 0) + (rating === "forgot" ? 1 : 0),
    reviewCount: (previousState?.reviewCount ?? 0) + 1,
  };
}

function getReviewStateByVocabularyId(data: VocabularyData) {
  const personId = getSelectedPersonId(data);

  return new Map(
    data.reviewStates
      .filter((state) => state.personId === personId)
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
  const stateByVocabularyId = getReviewStateByVocabularyId(data);
  const activeItems = getRecognitionVocabularyItems(data);
  const dueItems = activeItems
    .filter((item) => {
      const state = stateByVocabularyId.get(item.id);

      return state ? state.dueAt <= now : false;
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
