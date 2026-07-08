import { describe, expect, it } from "vitest";
import { FSRSVersion, Rating, State } from "ts-fsrs";
import {
  applyRecognitionFsrsRating,
  createRecognitionFsrsCard,
  getRecognitionFsrsParameterSnapshot,
  mapReviewRatingToFsrsRating,
  previewRecognitionFsrsOutcomes,
} from "./fsrs-recognition";

const REVIEWED_AT = "2026-07-08T00:00:00.000Z";

describe("recognition FSRS calibration", () => {
  it("pins the installed package to FSRS-6 and deterministic V1 calibration parameters", () => {
    expect(FSRSVersion).toContain("FSRS-6.0");
    expect(getRecognitionFsrsParameterSnapshot()).toEqual({
      requestRetention: 0.9,
      maximumInterval: 36500,
      enableFuzz: false,
      enableShortTerm: false,
      learningSteps: [],
      relearningSteps: [],
    });
  });

  it("maps Mimi review ratings onto FSRS ratings", () => {
    expect(mapReviewRatingToFsrsRating("forgot")).toBe(Rating.Again);
    expect(mapReviewRatingToFsrsRating("hard")).toBe(Rating.Hard);
    expect(mapReviewRatingToFsrsRating("vague")).toBe(Rating.Good);
    expect(mapReviewRatingToFsrsRating("remembered")).toBe(Rating.Easy);
  });

  it("previews deterministic first-review outcomes for Recognition ratings", () => {
    const card = createRecognitionFsrsCard(REVIEWED_AT);
    const outcomes = previewRecognitionFsrsOutcomes(card, REVIEWED_AT);

    expect(outcomes.forgot).toMatchObject({
      rating: "forgot",
      fsrsRating: Rating.Again,
      dueAt: "2026-07-09T00:00:00.000Z",
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: State.Review,
    });
    expect(outcomes.hard).toMatchObject({
      rating: "hard",
      fsrsRating: Rating.Hard,
      dueAt: "2026-07-10T00:00:00.000Z",
      scheduledDays: 2,
      reps: 1,
      lapses: 0,
      state: State.Review,
    });
    expect(outcomes.vague).toMatchObject({
      rating: "vague",
      fsrsRating: Rating.Good,
      dueAt: "2026-07-11T00:00:00.000Z",
      scheduledDays: 3,
      reps: 1,
      lapses: 0,
      state: State.Review,
    });
    expect(outcomes.remembered).toMatchObject({
      rating: "remembered",
      fsrsRating: Rating.Easy,
      dueAt: "2026-07-16T00:00:00.000Z",
      scheduledDays: 8,
      reps: 1,
      lapses: 0,
      state: State.Review,
    });
    expect(outcomes.forgot.stability).toBeCloseTo(0.212, 6);
    expect(outcomes.hard.stability).toBeCloseTo(1.2931, 6);
    expect(outcomes.vague.stability).toBeCloseTo(2.3065, 6);
    expect(outcomes.remembered.stability).toBeCloseTo(8.2956, 6);
  });

  it("keeps fuzz disabled so identical inputs produce identical outcomes", () => {
    const card = createRecognitionFsrsCard(REVIEWED_AT);

    expect(applyRecognitionFsrsRating(card, "remembered", REVIEWED_AT)).toEqual(
      applyRecognitionFsrsRating(card, "remembered", REVIEWED_AT),
    );
  });
});
