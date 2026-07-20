import { describe, expect, it } from "vitest";
import {
  parseJsonImport,
  parseTextImport,
  recomputeImportCandidates,
  summarizeImportCandidates,
} from "./import-parser";

describe("text import parser", () => {
  it("parses dash, tab, comma, empty, and sentence-like lines", () => {
    const candidates = parseTextImport(
      [
        "allocate - 分配 - The tutor used a risk - return example.",
        "coherent\t连贯的\tA coherent answer scores better.\t连贯的答案得分更高。",
        "ambiguous, concise",
        "",
        "this is a complete sentence with too many words.",
      ].join("\n"),
    );

    expect(candidates).toHaveLength(6);
    expect(candidates[0]).toMatchObject({
      surfaceText: "allocate",
      meaningZh: "分配",
      meaningsZh: ["分配"],
      example: "The tutor used a risk - return example.",
      examples: ["The tutor used a risk - return example."],
      exampleTranslationsZh: [""],
      status: "new",
    });
    expect(candidates[1]).toMatchObject({
      surfaceText: "coherent",
      meaningZh: "连贯的",
      meaningsZh: ["连贯的"],
      example: "A coherent answer scores better.",
      examples: ["A coherent answer scores better."],
      exampleTranslationsZh: ["连贯的答案得分更高。"],
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

  it("parses batch JSON arrays and keeps rarityScore nullable", () => {
    const candidates = parseJsonImport(
      JSON.stringify({
        items: [
          {
            word: "allocate",
            track: "recognition",
            meaningsZh: ["分配", "拨出时间或资源"],
            examples: [
              "The tutor allocated extra practice time.",
              "The budget allocates more money to language support.",
            ],
            exampleTranslationsZh: [
              "老师安排了额外的练习时间。",
              "这份预算为语言支持分配了更多资金。",
            ],
            tags: ["PTE"],
            rarityScore: 3,
          },
          {
            word: "coherent",
            track: "active",
            meaningZh: "连贯的",
            example: "Write a coherent paragraph using this word.",
            exampleTranslationZh: "请用这个词写一个连贯的段落。",
            tags: null,
            rarityScore: null,
          },
        ],
      }),
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      status: "new",
      meaningZh: "分配",
      meaningsZh: ["分配", "拨出时间或资源"],
      example: "The tutor allocated extra practice time.",
      examples: [
        "The tutor allocated extra practice time.",
        "The budget allocates more money to language support.",
      ],
      exampleTranslationsZh: [
        "老师安排了额外的练习时间。",
        "这份预算为语言支持分配了更多资金。",
      ],
      rarityScore: 3,
      tags: ["PTE"],
    });
    expect(candidates[1]).toMatchObject({
      status: "new",
      learningTrack: "active",
      meaningsZh: ["连贯的"],
      examples: ["Write a coherent paragraph using this word."],
      exampleTranslationsZh: ["请用这个词写一个连贯的段落。"],
      rarityScore: null,
      tags: null,
    });
  });

  it("requires a meaning, an example, and a Chinese translation for batch JSON items", () => {
    const candidates = parseJsonImport(
      JSON.stringify({
        items: [
          {
            word: "allocate",
            track: "recognition",
            meaningsZh: [],
            examples: ["The tutor allocated extra practice time."],
            exampleTranslationsZh: ["老师安排了额外的练习时间。"],
          },
          {
            word: "coherent",
            track: "active",
            meaningsZh: ["连贯的"],
            examples: [],
            exampleTranslationsZh: [],
          },
          {
            word: "concise",
            track: "active",
            meaningsZh: ["简洁的"],
            examples: ["Keep the summary concise."],
          },
        ],
      }),
    );

    expect(candidates.map((candidate) => candidate.status)).toEqual(["invalid", "invalid", "invalid"]);
    expect(candidates[0].errors).toContain("missing_meaning");
    expect(candidates[1].errors).toContain("missing_example");
    expect(candidates[2].errors).toContain("missing_example_translation");
  });
});
