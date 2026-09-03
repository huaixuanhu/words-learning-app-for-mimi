import { describe, expect, it } from "vitest";
import {
  createActiveFsrsCard,
  createActiveFsrsCardFromReviewState,
  getActiveFsrsRetrievability,
  getActiveFsrsParameterSnapshot,
  previewActiveFsrsOutcomes,
} from "./fsrs-active";
import { getRecognitionFsrsParameterSnapshot } from "./fsrs-recognition";
import {
  ACTIVE_PARAMETER_SET_ID,
  LEGACY_ACTIVE_PARAMETER_SET_ID,
  type ReviewState,
} from "./types";

const REVIEWED_AT = "2026-07-15T08:00:00.000Z";

describe("Active FSRS adapter", () => {
  it("owns a parameter snapshot independent from Recognition", () => {
    expect(getActiveFsrsParameterSnapshot()).toEqual({
      requestRetention: 0.93,
      maximumInterval: 36500,
      enableFuzz: false,
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    });
    expect(getActiveFsrsParameterSnapshot()).not.toEqual(
      getRecognitionFsrsParameterSnapshot(),
    );
    expect(
      getActiveFsrsParameterSnapshot(LEGACY_ACTIVE_PARAMETER_SET_ID)
        .requestRetention,
    ).toBe(0.92);
  });

  it("produces deterministic first-card intervals with the installed package", () => {
    const outcomes = previewActiveFsrsOutcomes(
      createActiveFsrsCard(REVIEWED_AT),
      REVIEWED_AT,
    );

    expect(outcomes.forgot.scheduledDays).toBe(1);
    expect(outcomes.hard.scheduledDays).toBe(2);
    expect(outcomes.vague.scheduledDays).toBe(3);
    expect(outcomes.remembered.scheduledDays).toBe(5);
    expect(
      previewActiveFsrsOutcomes(
        createActiveFsrsCard(REVIEWED_AT),
        REVIEWED_AT,
        LEGACY_ACTIVE_PARAMETER_SET_ID,
      ).remembered.scheduledDays,
    ).toBe(6);
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

  it("calculates Retrievability with the independent Active parameter set", () => {
    const state: ReviewState = {
      id: "state-active",
      personId: "person-mimi",
      vocabularyItemId: "active-one",
      reviewProfile: "active",
      parameterSetId: ACTIVE_PARAMETER_SET_ID,
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

    expect(getActiveFsrsRetrievability(state, "2026-07-16T08:00:00.000Z"))
      .toBeGreaterThan(0);
    expect(getActiveFsrsRetrievability(state, "2026-07-16T08:00:00.000Z"))
      .toBeLessThanOrEqual(1);
    expect(() =>
      getActiveFsrsRetrievability(
        { ...state, parameterSetId: "active-fsrs-unknown" },
        "2026-07-16T08:00:00.000Z",
      ),
    ).toThrow("unsupported Parameter Set");
  });
});
