import type { ReviewRating } from "./types";

const REPEAT_INSERT_AFTER_COUNT = 2;

export function isPassingSessionRating(rating: ReviewRating) {
  return rating === "vague" || rating === "remembered";
}

export function shouldRepeatInSession(rating: ReviewRating) {
  return rating === "forgot" || rating === "hard";
}

export function getNextSessionIdsAfterRating(
  sessionIds: string[],
  currentId: string,
  rating: ReviewRating,
) {
  const remainingIds = sessionIds[0] === currentId ? sessionIds.slice(1) : sessionIds.filter((id) => id !== currentId);
  const passedSession = isPassingSessionRating(rating);

  if (passedSession) {
    return {
      sessionIds: remainingIds.filter((id) => id !== currentId),
      passedSession,
      repeatedSession: false,
    };
  }

  if (remainingIds.includes(currentId)) {
    return {
      sessionIds: remainingIds,
      passedSession,
      repeatedSession: false,
    };
  }

  const insertAt = Math.min(REPEAT_INSERT_AFTER_COUNT, remainingIds.length);
  const nextSessionIds = [
    ...remainingIds.slice(0, insertAt),
    currentId,
    ...remainingIds.slice(insertAt),
  ];

  return {
    sessionIds: nextSessionIds,
    passedSession,
    repeatedSession: shouldRepeatInSession(rating),
  };
}

export function moveReviewAttemptBackToFront(sessionIds: string[], vocabularyItemId: string) {
  const nextSessionIds = [...sessionIds];
  const queuedIndex = nextSessionIds.indexOf(vocabularyItemId);

  if (queuedIndex >= 0) {
    nextSessionIds.splice(queuedIndex, 1);
  }

  return [vocabularyItemId, ...nextSessionIds];
}
