import { describe, expect, it } from "vitest";
import {
  findActionableExampleSegment,
  segmentEnglishExample,
} from "./example-segmentation";

describe("example word segmentation", () => {
  it("preserves punctuation, spaces, and exact source offsets", () => {
    const example = "Well, adapt to change.";
    const segments = segmentEnglishExample(example);

    expect(segments.map((segment) => segment.text).join("")).toBe(example);
    expect(
      segments
        .filter((segment) => segment.isActionable)
        .map((segment) => [segment.text, segment.start, segment.end]),
    ).toEqual([
      ["Well", 0, 4],
      ["adapt", 6, 11],
      ["to", 12, 14],
      ["change", 15, 21],
    ]);
  });

  it("keeps apostrophes and directly joined hyphenated words actionable", () => {
    const example = "Don't skip the well-known pattern.";
    const words = segmentEnglishExample(example)
      .filter((segment) => segment.isActionable)
      .map((segment) => segment.text);

    expect(words).toEqual(["Don't", "skip", "the", "well-known", "pattern"]);
  });

  it("uses a Unicode-aware fallback without changing offsets", () => {
    const example = "A well-known café isn't far.";
    const segments = segmentEnglishExample(example, { forceFallback: true });

    expect(segments.map((segment) => segment.text).join("")).toBe(example);
    expect(
      segments.filter((segment) => segment.isActionable).map((segment) => segment.text),
    ).toEqual(["A", "well-known", "café", "isn't", "far"]);
  });

  it("keeps UTF-16 offsets valid around non-BMP characters", () => {
    const example = "🐈 adapt gently";
    const adapt = segmentEnglishExample(example).find(
      (segment) => segment.text === "adapt",
    );

    expect(adapt).toMatchObject({ start: 3, end: 8, isActionable: true });
    expect(example.slice(adapt?.start, adapt?.end)).toBe("adapt");
  });

  it("finds only an exact actionable span", () => {
    const example = "We adapt quickly.";

    expect(findActionableExampleSegment(example, 3, 8)?.text).toBe("adapt");
    expect(findActionableExampleSegment(example, 4, 8)).toBeNull();
    expect(findActionableExampleSegment(example, 2, 3)).toBeNull();
  });
});
