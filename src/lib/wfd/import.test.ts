import { describe, expect, it } from "vitest";
import { mergeWfdSentences, parseWfdSentenceImport } from "./import";
import type { WfdSentence } from "./types";

const sentence: WfdSentence = {
  id: "wfd-1", text: "The lecture begins tomorrow.", translationZh: "讲座明天开始。",
  chunks: [{ text: "The lecture", cueZh: "讲座" }, { text: "begins tomorrow.", cueZh: "明天开始" }],
  source: { name: "Personal bank", url: "", edition: "October", retrievedAt: "2026-10-09", kind: "user" },
  tags: ["education"], image: "/wfd/lecture.svg", visualKind: "sequence", animation: "timeline",
};

describe("WFD content import", () => {
  it("accepts a bank or wrapped list and preserves source edition", () => {
    expect(parseWfdSentenceImport(JSON.stringify([sentence]))).toEqual([sentence]);
    expect(parseWfdSentenceImport(JSON.stringify({ sentences: [sentence] }))[0].source.edition).toBe("October");
  });

  it("requires exact sentence chunks, typed learning fields, and provenance", () => {
    expect(() => parseWfdSentenceImport(JSON.stringify([{ ...sentence, chunks: [{ text: "A lecture begins tomorrow.", cueZh: "讲座" }] }]))).toThrow("reconstruct");
    expect(() => parseWfdSentenceImport(JSON.stringify([{ ...sentence, translationZh: null }]))).toThrow("Chinese translation");
    expect(() => parseWfdSentenceImport(JSON.stringify([{ ...sentence, source: { ...sentence.source, kind: "official" } }]))).toThrow("source kind");
  });

  it("preserves uncurated source text without inventing translations or visual cues", () => {
    const uncurated = {
      ...sentence, translationZh: "", image: undefined,
      chunks: [{ text: sentence.text, cueZh: "" }],
    };
    const [imported] = parseWfdSentenceImport(JSON.stringify([uncurated]));
    expect(imported.text).toBe(sentence.text);
    expect(imported.translationZh).toBe("");
    expect(imported.chunks[0].cueZh).toBe("");
    expect(imported.image).toBeUndefined();
  });

  it("rejects duplicate IDs, malformed JSON and unsafe assets without partial import", () => {
    expect(() => parseWfdSentenceImport(JSON.stringify([sentence, sentence]))).toThrow("duplicate IDs");
    expect(() => parseWfdSentenceImport("{sentences:broken}")).toThrow("valid JSON");
    expect(() => parseWfdSentenceImport(JSON.stringify([{ ...sentence, image: "https://tracking.example/image.svg" }]))).toThrow("local site asset");
    expect(() => parseWfdSentenceImport(JSON.stringify([{ ...sentence, source: { ...sentence.source, url: "javascript:alert(1)" } }]))).toThrow("HTTP(S)");
  });

  it("allows better cues but requires a new identity for a changed target sentence", () => {
    const updated = { ...sentence, translationZh: "这场讲座将于明天开始。" };
    expect(mergeWfdSentences([sentence], [updated])).toEqual([updated]);
    const revised = {
      ...sentence, text: "The lecture begins today.",
      chunks: [{ text: "The lecture begins today.", cueZh: "讲座今天开始" }],
    };
    expect(() => mergeWfdSentences([sentence], [revised])).toThrow("new ID");
    expect(mergeWfdSentences([sentence], [{ ...revised, id: "wfd-1-revised" }])).toHaveLength(2);
    expect(sentence.text).toBe("The lecture begins tomorrow.");
  });
});
