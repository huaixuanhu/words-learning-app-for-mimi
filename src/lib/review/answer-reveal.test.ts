import { describe, expect, it } from "vitest";
import { getNextAnswerRevealState } from "./answer-reveal";

describe("review answer reveal state", () => {
  it("reveals, hides, and reveals again without resetting the first reveal time", () => {
    const firstReveal = getNextAnswerRevealState(
      { showBack: false, cardStartedAt: 0 },
      125,
    );
    const hidden = getNextAnswerRevealState(firstReveal, 200);
    const secondReveal = getNextAnswerRevealState(hidden, 350);

    expect(firstReveal).toEqual({ showBack: true, cardStartedAt: 125 });
    expect(hidden).toEqual({ showBack: false, cardStartedAt: 125 });
    expect(secondReveal).toEqual({ showBack: true, cardStartedAt: 125 });
  });

  it("does not introduce a negative start time", () => {
    expect(
      getNextAnswerRevealState({ showBack: false, cardStartedAt: 0 }, -10),
    ).toEqual({ showBack: true, cardStartedAt: 0 });
  });
});
