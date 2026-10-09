import { describe, expect, it } from "vitest";
import { gradeWfd, normalizeWfdWords } from "./grading";

describe("WFD practice word alignment", () => {
  it("ignores case, whitespace and punctuation but not word forms", () => {
    expect(gradeWfd("The students’ results were published.", " THE students' results were published! ").correct).toBe(true);
    const result = gradeWfd("The student developed a theory.", "the student develop a theory");
    expect(result.correct).toBe(false);
    expect(result.tokens).toContainEqual({ expected: "developed", actual: "develop", kind: "changed" });
    expect(result.accuracy).toBe(0.8);
  });

  it("identifies omitted function words without shifting the whole sentence", () => {
    const result = gradeWfd("The lecture is in the hall.", "The lecture in hall.");
    expect(result.tokens.filter((token) => token.kind !== "correct")).toEqual([
      { expected: "is", kind: "missing" },
      { expected: "the", kind: "missing" },
    ]);
    expect(result.expectedCount).toBe(6);
    expect(result.correctCount).toBe(4);
  });

  it("preserves repeated words and penalizes inserted words", () => {
    const omitted = gradeWfd("We had had enough time.", "We had enough time.");
    expect(omitted.tokens.filter((token) => token.kind === "missing")).toEqual([
      { expected: "had", kind: "missing" },
    ]);
    const extra = gradeWfd("We need time.", "We we need time.");
    expect(extra.tokens.filter((token) => token.kind === "extra")).toEqual([
      { actual: "we", kind: "extra" },
    ]);
    expect(extra.correct).toBe(false);
    expect(extra.accuracy).toBe(0.75);
  });

  it("does not accept reordered words or synonyms", () => {
    expect(gradeWfd("Students should attend lectures.", "Lectures should attend students.").correct).toBe(false);
    expect(gradeWfd("Students should attend lectures.", "Students must attend lectures.").correct).toBe(false);
  });

  it("represents an empty answer as all missing and bounds very large answers", () => {
    const result = gradeWfd("A seminar begins tomorrow.", "");
    expect(result.accuracy).toBe(0);
    expect(result.tokens.every((token) => token.kind === "missing")).toBe(true);
    expect(() => gradeWfd("", "answer")).toThrow("target sentence");
    expect(() => gradeWfd("A seminar.", "word ".repeat(513))).toThrow("too long");
  });

  it("never loses or invents tokens during alignment, including ambiguous repeats", () => {
    const samples = ["a", "a a", "a b", "b a a", "a b a", "b a b b", ""];
    for (const expected of samples.filter(Boolean)) {
      for (const answer of samples) {
        const result = gradeWfd(expected, answer);
        expect(result.tokens.flatMap((token) => token.expected ? [token.expected] : [])).toEqual(normalizeWfdWords(expected));
        expect(result.tokens.flatMap((token) => token.actual ? [token.actual] : [])).toEqual(normalizeWfdWords(answer));
        expect(result.correct).toBe(expected === answer);
        expect(result.accuracy).toBeGreaterThanOrEqual(0);
        expect(result.accuracy).toBeLessThanOrEqual(1);
      }
    }
  });
});
