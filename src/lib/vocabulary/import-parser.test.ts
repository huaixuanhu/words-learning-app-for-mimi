import { describe, expect, it } from "vitest";
import {
  parseTextImport,
  recomputeImportCandidates,
  summarizeImportCandidates,
} from "./import-parser";

describe("text import parser", () => {
  it("parses dash, tab, comma, empty, and sentence-like lines", () => {
    const candidates = parseTextImport(
      [
        "allocate - 分配 - The tutor allocated extra practice time.",
        "coherent\t连贯的\tA coherent answer scores better.",
        "ambiguous, concise",
        "",
        "this is a complete sentence with too many words.",
      ].join("\n"),
    );

    expect(candidates).toHaveLength(6);
    expect(candidates[0]).toMatchObject({
      surfaceText: "allocate",
      meaningZh: "分配",
      example: "The tutor allocated extra practice time.",
      status: "new",
    });
    expect(candidates[1]).toMatchObject({
      surfaceText: "coherent",
      meaningZh: "连贯的",
      example: "A coherent answer scores better.",
      status: "new",
    });
    expect(candidates[2]).toMatchObject({ surfaceText: "ambiguous", status: "new" });
    expect(candidates[3]).toMatchObject({ surfaceText: "concise", status: "new" });
    expect(candidates[4].errors).toContain("empty");
    expect(candidates[5].errors).toContain("sentence_like");
  });

  it("marks existing and same-batch duplicates without hiding other candidates", () => {
    const candidates = parseTextImport("allocate\ncoherent\nCoherent", {
      existingNormalizedTexts: ["allocate"],
    });

    expect(candidates.map((candidate) => candidate.status)).toEqual([
      "duplicate",
      "new",
      "duplicate",
    ]);
    expect(summarizeImportCandidates(candidates)).toEqual({
      totalRows: 3,
      newRows: 1,
      duplicateRows: 2,
      invalidRows: 0,
    });
  });

  it("recomputes duplicate status after an edited preview row changes", () => {
    const candidates = parseTextImport("allocate\nAllocate", {
      existingNormalizedTexts: [],
    });
    const edited = recomputeImportCandidates(
      candidates.map((candidate) =>
        candidate.tempId === "candidate-2-1"
          ? { ...candidate, surfaceText: "coherent" }
          : candidate,
      ),
    );

    expect(edited.map((candidate) => candidate.status)).toEqual(["new", "new"]);
  });
});
