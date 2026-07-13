import { describe, expect, it } from "vitest";
import {
  ACTIVE_ANSWER_NORMALIZATION_VERSION,
  MAX_ACTIVE_ANSWER_CODE_POINTS,
  MAX_ACTIVE_TARGET_CODE_POINTS,
  compareActiveTypedAnswer,
  createSayAnswerEvidence,
  isRatingAllowedForOutcome,
  normalizeActiveAnswer,
} from "./active-answer";

describe("V2 Active answer contract", () => {
  it("keeps exact answers distinct from deterministic normalized matches", () => {
    expect(
      compareActiveTypedAnswer({ answer: "take into account", target: "take into account" }),
    ).toMatchObject({
      outcome: "exact",
      normalizationVersion: ACTIVE_ANSWER_NORMALIZATION_VERSION,
    });

    expect(
      compareActiveTypedAnswer({
        answer: "  DON’T\u00a0 GIVE—UP  ",
        target: "don't give-up",
      }),
    ).toMatchObject({
      outcome: "normalized_match",
      normalizationVersion: ACTIVE_ANSWER_NORMALIZATION_VERSION,
    });
  });

  it("normalizes NFKC, whitespace, apostrophes, dashes, and English case only", () => {
    expect(normalizeActiveAnswer("  ＣＯ\u2011ＯＰＥＲＡＴＥ\tNow  ")).toBe("co-operate now");
    expect(normalizeActiveAnswer("Mother’s  choice")).toBe("mother's choice");
  });

  it("preserves punctuation and diacritics instead of guessing", () => {
    expect(compareActiveTypedAnswer({ answer: "cant", target: "can't" }).outcome).toBe(
      "different",
    );
    expect(compareActiveTypedAnswer({ answer: "cafe", target: "café" }).outcome).toBe(
      "different",
    );
    expect(compareActiveTypedAnswer({ answer: "affects", target: "affect" }).outcome).toBe(
      "different",
    );
  });

  it("requires an explicit reveal for an unanswered typed card", () => {
    expect(() => compareActiveTypedAnswer({ answer: "  ", target: "adapt" })).toThrow();
    expect(
      compareActiveTypedAnswer({
        answer: "",
        target: "adapt",
        revealedWithoutAnswer: true,
      }),
    ).toMatchObject({
      outcome: "revealed_without_answer",
      allowedRatings: ["forgot", "hard", "vague", "remembered"],
    });
    expect(() =>
      compareActiveTypedAnswer({
        answer: "ad",
        target: "adapt",
        revealedWithoutAnswer: true,
      }),
    ).toThrow();
  });

  it("keeps answer evidence separate from the user's four self-ratings", () => {
    expect(isRatingAllowedForOutcome("different", "hard")).toBe(true);
    expect(isRatingAllowedForOutcome("different", "remembered")).toBe(true);
    expect(isRatingAllowedForOutcome("normalized_match", "remembered")).toBe(true);
    expect(createSayAnswerEvidence()).toMatchObject({
      outcome: "self_rated",
      normalizationVersion: null,
      allowedRatings: ["forgot", "hard", "vague", "remembered"],
    });
  });

  it("rejects unbounded answers and targets before comparison", () => {
    expect(() =>
      compareActiveTypedAnswer({
        answer: "a".repeat(MAX_ACTIVE_ANSWER_CODE_POINTS + 1),
        target: "adapt",
      }),
    ).toThrow();
    expect(() =>
      compareActiveTypedAnswer({
        answer: "adapt",
        target: "a".repeat(MAX_ACTIVE_TARGET_CODE_POINTS + 1),
      }),
    ).toThrow();
  });
});
