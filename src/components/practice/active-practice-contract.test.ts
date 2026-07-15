import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sessionSource = readFileSync(
  join(process.cwd(), "src/components/practice/active-practice-session.tsx"),
  "utf8",
);
const pageSource = readFileSync(
  join(process.cwd(), "src/app/practice-lab/page.tsx"),
  "utf8",
);
const studyCardSource = readFileSync(
  join(process.cwd(), "src/components/study/daily-track-card.tsx"),
  "utf8",
);

describe("Stage 6 Active practice UI contract", () => {
  it("offers both Active zones and all three fixed activities", () => {
    expect(studyCardSource).toContain('href="/practice-lab?zone=review"');
    expect(studyCardSource).toContain('href="/practice-lab?zone=new"');
    expect(pageSource).toContain('mode: "say"');
    expect(pageSource).toContain('mode: "spell"');
    expect(pageSource).toContain('mode: "dictation"');
    expect(sessionSource).toContain('reviewProfile: "active"');
    expect(sessionSource).toContain("activityType: mode");
  });

  it("keeps typed-answer comparison local and submits only structured evidence", () => {
    expect(sessionSource).toContain("compareActiveTypedAnswer");
    expect(sessionSource).toContain("answerOutcome: outcome");
    expect(sessionSource).toContain("ACTIVE_ANSWER_NORMALIZATION_VERSION");
    expect(sessionSource).not.toContain("rawAnswer:");
    expect(sessionSource).not.toContain("typedAnswer:");
  });

  it("retains speech fallback and guarded keyboard controls", () => {
    expect(sessionSource).toContain("speakEnglishText");
    expect(sessionSource).toContain("Speech is not available in this browser");
    expect(sessionSource).toContain("isReviewRatingArrowKey");
    expect(sessionSource).toContain("event.isComposing");
    expect(sessionSource).toContain('mode === "say" && event.key === " "');
  });
});
