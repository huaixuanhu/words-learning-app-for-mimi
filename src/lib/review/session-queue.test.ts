import { describe, expect, it } from "vitest";
import {
  getNextSessionIdsAfterRating,
  isPassingSessionRating,
  moveReviewAttemptBackToFront,
  shouldRepeatInSession,
} from "./session-queue";

describe("review session queue", () => {
  it("classifies pass and repeat ratings", () => {
    expect(shouldRepeatInSession("forgot")).toBe(true);
    expect(shouldRepeatInSession("hard")).toBe(true);
    expect(shouldRepeatInSession("vague")).toBe(false);
    expect(shouldRepeatInSession("remembered")).toBe(false);

    expect(isPassingSessionRating("forgot")).toBe(false);
    expect(isPassingSessionRating("hard")).toBe(false);
    expect(isPassingSessionRating("vague")).toBe(true);
    expect(isPassingSessionRating("remembered")).toBe(true);
  });

  it("removes a passed card from the current session", () => {
    expect(getNextSessionIdsAfterRating(["a", "b", "c"], "a", "vague")).toEqual({
      sessionIds: ["b", "c"],
      passedSession: true,
      repeatedSession: false,
    });
  });

  it("removes queued repeats after a repeated card finally passes", () => {
    expect(getNextSessionIdsAfterRating(["a", "b", "a", "c"], "a", "remembered")).toEqual({
      sessionIds: ["b", "c"],
      passedSession: true,
      repeatedSession: false,
    });
  });

  it("requeues failed cards after two other pending cards when available", () => {
    expect(getNextSessionIdsAfterRating(["a", "b", "c", "d"], "a", "forgot")).toEqual({
      sessionIds: ["b", "c", "a", "d"],
      passedSession: false,
      repeatedSession: true,
    });
  });

  it("requeues failed cards at the end when fewer than two other cards remain", () => {
    expect(getNextSessionIdsAfterRating(["a", "b"], "a", "hard")).toEqual({
      sessionIds: ["b", "a"],
      passedSession: false,
      repeatedSession: true,
    });
  });

  it("requeues a single failed card without marking the session complete", () => {
    expect(getNextSessionIdsAfterRating(["a"], "a", "forgot")).toEqual({
      sessionIds: ["a"],
      passedSession: false,
      repeatedSession: true,
    });
  });

  it("does not duplicate a failed card if it is already pending again", () => {
    expect(getNextSessionIdsAfterRating(["a", "b", "a", "c"], "a", "hard")).toEqual({
      sessionIds: ["b", "a", "c"],
      passedSession: false,
      repeatedSession: false,
    });
  });

  it("moves a rolled-back attempt to the front while removing an existing queued copy", () => {
    expect(moveReviewAttemptBackToFront(["b", "c", "a"], "a")).toEqual(["a", "b", "c"]);
    expect(moveReviewAttemptBackToFront(["b", "c"], "a")).toEqual(["a", "b", "c"]);
  });
});
