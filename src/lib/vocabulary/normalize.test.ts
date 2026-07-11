import { describe, expect, it } from "vitest";
import {
  cleanSurfaceText,
  normalizeRarityScore,
  normalizeSurfaceText,
  validateSurfaceText,
} from "./normalize";

describe("vocabulary normalization", () => {
  it("cleans edge punctuation and normalizes case", () => {
    expect(cleanSurfaceText('  "Allocate"  ')).toBe("Allocate");
    expect(normalizeSurfaceText("  ALLOCATE  ")).toBe("allocate");
  });

  it("flags empty, too-long, and sentence-like surface text", () => {
    expect(validateSurfaceText("   ").errors).toContain("empty");
    expect(validateSurfaceText("a".repeat(81)).errors).toContain("too_long");
    expect(
      validateSurfaceText("this is a complete sentence with too many words.").errors,
    ).toContain("sentence_like");
  });

  it("clamps rarity score to the 1 to 5 range", () => {
    expect(normalizeRarityScore(null)).toBeNull();
    expect(normalizeRarityScore("")).toBeNull();
    expect(normalizeRarityScore("4")).toBe(4);
    expect(normalizeRarityScore(0)).toBe(1);
    expect(normalizeRarityScore(7)).toBe(5);
  });
});
