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
    expect(reviewSource).toContain('data-review-card-toggle-surface="true"');
    expect(reviewSource).toContain("onPointerDown");
    expect(reviewSource).toContain("onPointerUp");
    expect(reviewSource).toContain("Math.hypot");
    expect(reviewSource).toContain("shouldIgnoreCardToggle");
    expect(reviewSource).toContain("getNextAnswerRevealState");
    expect(reviewSource).toContain('"Hide answer" : "Show answer"');
    expect(reviewSource).toContain('currentItem ? "cursor-pointer" : ""');
  });

  it("autoplays each newly active Recognition card while retaining replay", () => {
    expect(reviewSource).toContain("useWordPronunciation");
    expect(reviewSource).toContain("autoPlay: true");
    expect(reviewSource).toContain("completedReviews.length");
    expect(reviewSource).toContain("onClick={() => void listenToCurrentItem()}");
  });

  it("renders all four existing ratings through calm named color classes", () => {
    for (const rating of ["forgot", "hard", "vague", "remembered"]) {
      expect(globalCss).toContain(`.mimi-rating-${rating}`);
    }
    expect(reviewSource).toContain("mimi-rating-${rating.value}");
    expect(reviewSource).toContain("reviewRatings.map");
  });

  it("keeps Listen, local context preview, and manual add free of network calls", () => {
    expect(reviewSource).toContain("ExampleWordActions");
    expect(exampleActionsSource).toContain("segmentEnglishExample");
    expect(exampleActionsSource).toContain("speakEnglishText");
    expect(exampleActionsSource).toContain('source: "manual"');
    expect(exampleActionsSource).toContain('type: "vocabulary.add"');
    expect(exampleActionsSource).toContain("findSelectedPersonVocabularyDuplicate");
    expect(exampleActionsSource).toContain("runLocalFixtureContextExplanation");
    expect(exampleActionsSource).toContain("buildTrustedAiContextPayload");
    expect(exampleActionsSource).toContain("LOCAL_FIXTURE_LINEAGE.notice");
    expect(exampleActionsSource).toContain(
      'localPreviewEnabled ? "" : contextResult?.meaningInContextZh ?? ""',
    );
    expect(exampleActionsSource).toContain("createPortal");
    expect(exampleActionsSource).not.toContain("fetch(");
    expect(exampleActionsSource).not.toContain("/api/ai");
  });

  it("refreshes only the active study card without route or login navigation", () => {
    expect(reviewSource).toContain("submitWithExpiredPromptRecovery");
    expect(reviewSource).toContain("PROMPT_REFRESHED_COPY");
    expect(reviewSource).toContain("refreshPromptRef.current");
    expect(reviewSource).not.toContain("window.location");
  });

  it("adds guarded keyboard reveal and two-by-two rating control", () => {
    expect(reviewSource).toContain('event.key === " "');
    expect(reviewSource).toContain('event.key === "Enter"');
    expect(reviewSource).toContain("isReviewRatingArrowKey");
    expect(reviewSource).toContain("getNextReviewRatingIndex");
    expect(reviewSource).toContain("shouldIgnoreReviewShortcut");
    expect(reviewSource).toContain("REVIEW_TEXT_ENTRY_SELECTOR");
    expect(reviewSource).toContain("REVIEW_NATIVE_ACTION_SELECTOR");
    expect(reviewSource).toContain("data-review-rating-index");
    expect(reviewSource).toContain("ratingGroupRef.current");
    expect(reviewSource).toContain("event.isComposing");
    expect(reviewSource).toContain("event.altKey");
    expect(reviewSource).toContain("event.ctrlKey");
    expect(reviewSource).toContain("event.metaKey");
    expect(reviewSource).toContain("event.shiftKey");
    expect(reviewSource).toContain("event.repeat");
    expect(reviewSource).toContain("[role=\"dialog\"][aria-modal=\"true\"]");
    expect(reviewSource).toContain("Space flip · Arrow keys choose · Enter confirm");
    expect(reviewSource).toContain("onMouseEnter");
    expect(reviewSource).toContain("onClick={(event) => void submitRating");
    expect(reviewSource).toContain('data-selected={');
  });

  it("reuses the accepted rating hover appearance without new movement", () => {
    const ratingFeedback = globalCss.slice(
      globalCss.indexOf(".mimi-rating-button:not(:disabled):hover"),
      globalCss.indexOf(".mimi-rating-forgot"),
    );

    expect(ratingFeedback).toContain('[data-selected="true"]');
    expect(ratingFeedback).toContain("filter: brightness");
    expect(ratingFeedback).toContain("box-shadow:");
    expect(ratingFeedback).not.toContain("transform");
  });
});
