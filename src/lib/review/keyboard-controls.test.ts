import { describe, expect, it } from "vitest";
import {
  getNextReviewRatingIndex,
  isReviewRatingArrowKey,
  REVIEW_RATING_ARROW_KEYS,
} from "./keyboard-controls";

describe("Review keyboard rating navigation", () => {
  it("selects the first rating on the first handled Arrow key", () => {
    for (const key of REVIEW_RATING_ARROW_KEYS) {
      expect(getNextReviewRatingIndex(null, key)).toBe(0);
    }
  });

  it("moves through the visible two-by-two rating grid", () => {
    expect(getNextReviewRatingIndex(0, "ArrowRight")).toBe(1);
    expect(getNextReviewRatingIndex(0, "ArrowDown")).toBe(2);
    expect(getNextReviewRatingIndex(1, "ArrowLeft")).toBe(0);
    expect(getNextReviewRatingIndex(1, "ArrowDown")).toBe(3);
    expect(getNextReviewRatingIndex(2, "ArrowUp")).toBe(0);
    expect(getNextReviewRatingIndex(2, "ArrowRight")).toBe(3);
    expect(getNextReviewRatingIndex(3, "ArrowUp")).toBe(1);
    expect(getNextReviewRatingIndex(3, "ArrowLeft")).toBe(2);
  });

  it("stays at each outer edge without wrapping", () => {
    expect(getNextReviewRatingIndex(0, "ArrowLeft")).toBe(0);
    expect(getNextReviewRatingIndex(0, "ArrowUp")).toBe(0);
    expect(getNextReviewRatingIndex(1, "ArrowRight")).toBe(1);
    expect(getNextReviewRatingIndex(1, "ArrowUp")).toBe(1);
    expect(getNextReviewRatingIndex(2, "ArrowLeft")).toBe(2);
    expect(getNextReviewRatingIndex(2, "ArrowDown")).toBe(2);
    expect(getNextReviewRatingIndex(3, "ArrowRight")).toBe(3);
    expect(getNextReviewRatingIndex(3, "ArrowDown")).toBe(3);
  });

  it("recognizes only the four Arrow keys", () => {
    expect(isReviewRatingArrowKey("ArrowLeft")).toBe(true);
    expect(isReviewRatingArrowKey("Enter")).toBe(false);
    expect(isReviewRatingArrowKey(" ")).toBe(false);
  });
});
