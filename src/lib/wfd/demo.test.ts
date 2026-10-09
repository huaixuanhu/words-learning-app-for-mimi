import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WFD_DEMOS } from "./demo";
import { validateWfdSentences } from "./import";

describe("shipped WFD learning examples", () => {
  it("keeps original examples distinct from personal prediction banks, with aligned learning text", () => {
    const validated = validateWfdSentences(WFD_DEMOS);
    expect(validated.length).toBeGreaterThan(0);
    for (const sentence of validated) {
      expect(sentence.source.kind).toBe("demo");
      expect(sentence.translationZh.trim()).not.toBe("");
      expect(sentence.chunks.every((chunk) => chunk.cueZh.trim().length > 0)).toBe(true);
    }
  });

  it("ships every referenced picture as a local asset", () => {
    for (const sentence of WFD_DEMOS) {
      expect(sentence.image, `${sentence.id} picture`).toBeTruthy();
      expect(existsSync(path.join(process.cwd(), "public", sentence.image!.slice(1))), sentence.image).toBe(true);
    }
  });
});
