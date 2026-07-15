import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dialogSource = readFileSync(
  join(process.cwd(), "src", "components", "ai", "ai-enrichment-dialog.tsx"),
  "utf8",
);
const librarySource = readFileSync(
  join(process.cwd(), "src", "components", "vocabulary", "vocabulary-library.tsx"),
  "utf8",
);
const sourceLabelSource = readFileSync(
  join(process.cwd(), "src", "lib", "ai-enrichment", "source-label.ts"),
  "utf8",
);

describe("V2 Stage 7A AI enrichment UI contract", () => {
  it("exposes a responsive local preview from each active Library entry", () => {
    expect(librarySource).toContain("AiEnrichmentDialog");
    expect(librarySource).toContain("AI suggestions");
    expect(librarySource).toContain("getVocabularySourceLabel");
    expect(sourceLabelSource).toContain("AI added");
    expect(sourceLabelSource).toContain("Local preview added");
    expect(sourceLabelSource).toContain("Suggestion added");
    expect(dialogSource).toContain("ResponsiveDialog");
    expect(dialogSource).toContain("Create local preview");
    expect(dialogSource).toContain("LOCAL_FIXTURE_LINEAGE.notice");
    expect(dialogSource).toContain("Real Gemini generation stays off in Stage 7A.");
    expect(dialogSource).toContain("Future Gemini data");
    expect(dialogSource).toContain("before the first real request");
    expect(dialogSource).not.toContain("fetch(");
    expect(dialogSource).not.toContain("/api/ai");
  });

  it("keeps editing, acceptance, rejection, and candidate addition explicit", () => {
    expect(dialogSource).toContain("Accept preview");
    expect(dialogSource).toContain("Reject");
    expect(dialogSource).toContain("addAcceptedAiCandidateToLearning");
    expect(dialogSource).toContain("Save to learning");
    expect(dialogSource).toContain("Recognition");
    expect(dialogSource).toContain("Active");
  });
});
