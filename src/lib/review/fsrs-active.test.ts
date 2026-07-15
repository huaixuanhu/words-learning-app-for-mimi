import { describe, expect, it } from "vitest";
import {
  createActiveFsrsCard,
  createActiveFsrsCardFromReviewState,
  getActiveFsrsParameterSnapshot,
  previewActiveFsrsOutcomes,
} from "./fsrs-active";
import { getRecognitionFsrsParameterSnapshot } from "./fsrs-recognition";
import type { ReviewState } from "./types";

const REVIEWED_AT = "2026-07-15T08:00:00.000Z";

describe("Active FSRS adapter", () => {
  it("owns a parameter snapshot independent from Recognition", () => {
    expect(getActiveFsrsParameterSnapshot()).toEqual({
      requestRetention: 0.92,
      maximumInterval: 36500,
      enableFuzz: false,
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    });
    expect(getActiveFsrsParameterSnapshot()).not.toEqual(
      getRecognitionFsrsParameterSnapshot(),
    );
  });

  it("produces deterministic first-card intervals with the installed package", () => {
    const outcomes = previewActiveFsrsOutcomes(
      createActiveFsrsCard(REVIEWED_AT),
      REVIEWED_AT,
    );

    expect(outcomes.forgot.scheduledDays).toBe(1);
    expect(outcomes.hard.scheduledDays).toBe(2);
    expect(outcomes.vague.scheduledDays).toBe(3);
    expect(outcomes.remembered.scheduledDays).toBe(6);
  });

  it("rejects Recognition state instead of silently reusing it", () => {
    const recognitionState: ReviewState = {
      id: "state-recognition",
      personId: "person-mimi",
      vocabularyItemId: "word-one",
      reviewProfile: "recognition",
      parameterSetId: "recognition-fsrs-v1",
      firstRatedAt: REVIEWED_AT,
      historyOrigin: "recorded",
      status: "review",
      dueAt: "2026-07-18T08:00:00.000Z",
      lastReviewedAt: REVIEWED_AT,
      reviewCount: 1,
      lapseCount: 0,
      intervalMinutes: 4320,
      difficulty: 5,
      stability: 3,
      updatedAt: REVIEWED_AT,
    };

    expect(() =>
      createActiveFsrsCardFromReviewState(recognitionState, REVIEWED_AT),
    ).toThrow("Active FSRS cannot consume another Review Profile state");
  });
});
