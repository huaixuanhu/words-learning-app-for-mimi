import { describe, expect, it } from "vitest";
import {
  alignExampleTranslationsZh,
  assertCompleteVocabularyExamplePairs,
  buildVocabularyExamplePairs,
  splitVocabularyExamplePairs,
} from "./example-pairs";

describe("bilingual vocabulary examples", () => {
  it("keeps English order and exact text while aligning translations", () => {
    expect(
      buildVocabularyExamplePairs({
        examples: ["People adapt gradually.", "We adapt to change."],
        exampleTranslationsZh: ["人们逐渐适应。"],
      }),
    ).toEqual([
      { en: "People adapt gradually.", zh: "人们逐渐适应。" },
      { en: "We adapt to change.", zh: "" },
    ]);
  });

  it("drops translation overflow and pads legacy examples", () => {
    expect(
      alignExampleTranslationsZh(["One.", "Two."], ["一。", "二。", "三。"]),
    ).toEqual(['一。', '二。']);
  });

  it("splits edited pairs without joining Chinese into the English sentence", () => {
    expect(
      splitVocabularyExamplePairs([
        { en: " People adapt. ", zh: " 人们会适应。 " },
      ]),
    ).toEqual({
      example: "People adapt.",
      examples: ["People adapt."],
      exampleTranslationsZh: ["人们会适应。"],
    });
  });

  it("rejects an English example without its Chinese translation", () => {
    expect(() =>
      assertCompleteVocabularyExamplePairs([{ en: "People adapt.", zh: "" }]),
    ).toThrow("Add a Chinese translation for every English example.");
  });
});
