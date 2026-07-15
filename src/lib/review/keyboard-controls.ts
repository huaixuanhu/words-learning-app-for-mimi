export const REVIEW_RATING_ARROW_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
] as const;

export type ReviewRatingArrowKey = (typeof REVIEW_RATING_ARROW_KEYS)[number];

const RATING_COUNT = 4;
const COLUMN_COUNT = 2;

export function isReviewRatingArrowKey(
  key: string,
): key is ReviewRatingArrowKey {
  return REVIEW_RATING_ARROW_KEYS.includes(key as ReviewRatingArrowKey);
}

export function getNextReviewRatingIndex(
  currentIndex: number | null,
  key: ReviewRatingArrowKey,
) {
  if (
    currentIndex === null ||
    !Number.isInteger(currentIndex) ||
    currentIndex < 0 ||
    currentIndex >= RATING_COUNT
  ) {
    return 0;
  }

  const row = Math.floor(currentIndex / COLUMN_COUNT);
  const column = currentIndex % COLUMN_COUNT;

  switch (key) {
    case "ArrowLeft":
      return column === 0 ? currentIndex : currentIndex - 1;
    case "ArrowRight":
      return column === COLUMN_COUNT - 1 ? currentIndex : currentIndex + 1;
    case "ArrowUp":
      return row === 0 ? currentIndex : currentIndex - COLUMN_COUNT;
    case "ArrowDown":
      return row === 1 ? currentIndex : currentIndex + COLUMN_COUNT;
  }
}
