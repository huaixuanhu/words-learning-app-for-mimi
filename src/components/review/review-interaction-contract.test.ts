import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const reviewSource = readFileSync(
  join(process.cwd(), "src", "components", "review", "review-session.tsx"),
  "utf8",
);
const exampleActionsSource = readFileSync(
  join(process.cwd(), "src", "components", "review", "example-word-actions.tsx"),
  "utf8",
);
const globalCss = readFileSync(
  join(process.cwd(), "src", "app", "globals.css"),
  "utf8",
);

describe("V2 Stage 3.1 review interaction UI contract", () => {
  it("keeps card tapping guarded while retaining the explicit answer button", () => {
    expect(reviewSource).toContain("onPointerDown");
    expect(reviewSource).toContain("onPointerUp");
    expect(reviewSource).toContain("Math.hypot");
    expect(reviewSource).toContain("shouldIgnoreCardToggle");
    expect(reviewSource).toContain("getNextAnswerRevealState");
    expect(reviewSource).toContain('"Hide answer" : "Show answer"');
  });

  it("renders all four existing ratings through calm named color classes", () => {
    for (const rating of ["forgot", "hard", "vague", "remembered"]) {
      expect(globalCss).toContain(`.mimi-rating-${rating}`);
    }
    expect(reviewSource).toContain("mimi-rating-${rating.value}");
    expect(reviewSource).toContain("reviewRatings.map");
  });

  it("keeps example Listen and manual add local while AI explanation rests", () => {
    expect(reviewSource).toContain("ExampleWordActions");
    expect(exampleActionsSource).toContain("segmentEnglishExample");
    expect(exampleActionsSource).toContain("speakEnglishText");
    expect(exampleActionsSource).toContain('source: "manual"');
    expect(exampleActionsSource).toContain('type: "vocabulary.add"');
    expect(exampleActionsSource).toContain("findSelectedPersonVocabularyDuplicate");
    expect(exampleActionsSource).toContain("AI explanation is resting for now.");
    expect(exampleActionsSource).toContain("createPortal");
    expect(exampleActionsSource).not.toContain("fetch(");
    expect(exampleActionsSource).not.toContain("/api/ai");
  });
});
