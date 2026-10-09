import { describe, expect, it } from "vitest";
import { isWfdDue, markWfdLearned, scheduleWfdAttempt } from "./scheduling";
import type { WfdAttempt } from "./types";

const start = "2026-10-09T08:00:00.000Z";
const attempt = (overrides: Partial<WfdAttempt> = {}): WfdAttempt => ({
  id: "attempt-1", sentenceId: "wfd-1", submittedAt: start,
  mode: "dictation", answer: "The lecture begins tomorrow.", assisted: false,
  playCount: 1, correct: true, accuracy: 1, ...overrides,
});

describe("independent WFD review schedule", () => {
  it("learning and assisted recall never count as independent mastery", () => {
    const learned = markWfdLearned(undefined, start);
    expect(learned.successfulReviews).toBe(0);
    expect(learned.dueAt).toBe("2026-10-09T08:10:00.000Z");
    for (const overrides of [
      { assisted: true }, { mode: "recall" as const }, { playCount: 2 }, { playCount: 0 },
    ]) {
      const result = scheduleWfdAttempt(learned, attempt(overrides));
      expect(result.successfulReviews).toBe(0);
      expect(result.lastIndependentSuccessAt).toBeUndefined();
      expect(result.dueAt).toBe(learned.dueAt);
    }
  });

  it("schedules a first independent success for one day and a due success for three days", () => {
    const first = scheduleWfdAttempt(undefined, attempt());
    expect(first.successfulReviews).toBe(1);
    expect(first.dueAt).toBe("2026-10-10T08:00:00.000Z");
    expect(isWfdDue(first, "2026-10-10T07:59:00.000Z")).toBe(false);
    expect(isWfdDue(first, first.dueAt)).toBe(true);
    const next = scheduleWfdAttempt(first, attempt({ submittedAt: first.dueAt }));
    expect(next.successfulReviews).toBe(2);
    expect(next.intervalDays).toBe(3);
    expect(next.dueAt).toBe("2026-10-13T08:00:00.000Z");
  });

  it("replaying a passed sentence early cannot inflate the interval", () => {
    const first = scheduleWfdAttempt(undefined, attempt());
    const repeat = scheduleWfdAttempt(first, attempt({ submittedAt: "2026-10-09T09:00:00.000Z" }));
    expect(repeat.successfulReviews).toBe(1);
    expect(repeat.dueAt).toBe(first.dueAt);
    expect(repeat.lastIndependentSuccessAt).toBe(start);
  });

  it("failure returns a mature sentence to a short retry; aided correction does not advance it", () => {
    const first = scheduleWfdAttempt(undefined, attempt());
    const failure = scheduleWfdAttempt(first, attempt({
      submittedAt: "2026-10-10T08:00:00.000Z", correct: false, accuracy: 0.75,
    }));
    expect(failure.successfulReviews).toBe(0);
    expect(failure.lapses).toBe(1);
    expect(failure.dueAt).toBe("2026-10-10T08:10:00.000Z");
    const corrected = scheduleWfdAttempt(failure, attempt({
      submittedAt: "2026-10-10T08:01:00.000Z", assisted: true,
    }));
    expect(corrected.successfulReviews).toBe(0);
    expect(corrected.dueAt).toBe(failure.dueAt);
  });

  it("caps heuristic intervals and refuses backdated mutations", () => {
    const first = scheduleWfdAttempt(undefined, attempt());
    const mature = scheduleWfdAttempt({ ...first, successfulReviews: 10 }, attempt({
      submittedAt: "2026-11-10T08:00:00.000Z",
    }));
    expect(mature.intervalDays).toBe(30);
    expect(() => scheduleWfdAttempt(mature, attempt())).toThrow("predates");
    expect(isWfdDue(undefined, start)).toBe(false);
  });
});
