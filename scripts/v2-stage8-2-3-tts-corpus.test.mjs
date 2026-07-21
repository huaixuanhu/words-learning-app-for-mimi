import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { assertCorpus, htmlDocument } from "./v2-stage8-2-3-tts-corpus.mjs";

const corpus = JSON.parse(
  await readFile(
    new URL("./fixtures/v2-stage8-2-3-tts-corpus.json", import.meta.url),
    "utf8",
  ),
);

describe("V2-8-2.3 Standard-C human listening corpus", () => {
  it("freezes exactly 50 unique samples in the accepted 20/10/10/5/5 groups", () => {
    expect(() => assertCorpus(corpus)).not.toThrow();
    expect(corpus.entries).toHaveLength(50);
    const counts = corpus.entries.reduce((result, entry) => ({
      ...result,
      [entry.group]: (result[entry.group] ?? 0) + 1,
    }), {});
    expect(counts).toEqual({
      "Common and PTE words": 20,
      "Long or uncommon words": 10,
      "Phrases and fixed collocations": 10,
      "Sound and confusable pairs": 5,
      "Short preview sentences": 5,
    });
  });

  it("builds a local-only rating and export page without provider credentials", () => {
    const html = htmlDocument({
      voiceContractId: corpus.voiceContractId,
      entries: corpus.entries.map((entry, index) => ({
        ...entry,
        fileName: `${index + 1}.mp3`,
      })),
    });
    expect(html).toContain("50 fixed samples");
    expect(html).toContain("Export results");
    expect(html).toContain("Good");
    expect(html).toContain("Review");
    expect(html).toContain("Bad");
    expect(html).not.toContain("authorization");
    expect(html).not.toContain("service_account");
  });
});
