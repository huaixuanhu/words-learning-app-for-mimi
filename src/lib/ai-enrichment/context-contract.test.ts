import { describe, expect, it } from "vitest";
import {
  AI_DISCLOSURE_VERSION,
} from "./contract";
import {
  AiContextContractError,
  buildTrustedAiContextPayload,
  validateAiContextExplanation,
  validatePublicAiContextExplainRequest,
} from "./context-contract";

const request = {
  vocabularyEntryId: "vocab-1",
  exampleIndex: 0,
  selectedStart: 3,
  selectedEnd: 8,
  feature: "context_explain_v1",
  disclosureVersion: AI_DISCLOSURE_VERSION,
  idempotencyKey: "context-request-1",
} as const;

const entry = {
  surfaceText: "adapt",
  meaningZh: "适应",
  meaningsZh: ["适应", "改编"],
  example: "",
  examples: ["We adapt to change."],
};

describe("V2 context explanation contract", () => {
  it("accepts only the exact minimal public request", () => {
    expect(validatePublicAiContextExplainRequest(request)).toEqual(request);
    expect(() =>
      validatePublicAiContextExplainRequest({ ...request, selectedText: "adapt" }),
    ).toThrow("request fields do not match the contract");
    expect(() =>
      validatePublicAiContextExplainRequest({ ...request, feature: "enrichment_v1" }),
    ).toThrow("feature is unsupported");
  });

  it("rejects malformed or oversized selected spans before source lookup", () => {
    expect(() =>
      validatePublicAiContextExplainRequest({ ...request, selectedEnd: 3 }),
    ).toThrow("selected span is invalid");
    expect(() =>
      validatePublicAiContextExplainRequest({ ...request, selectedEnd: 130 }),
    ).toThrow("selected span is invalid");
  });

  it("re-reads one stored example and derives the exact actionable token", () => {
    expect(buildTrustedAiContextPayload(request, entry)).toEqual({
      sourceTerm: "adapt",
      sourceMeaningsZh: ["适应", "改编"],
      example: "We adapt to change.",
      selectedText: "adapt",
    });
    expect(() =>
      buildTrustedAiContextPayload({ ...request, selectedStart: 5 }, entry),
    ).toThrow("selected span is not one actionable stored token");
    expect(() =>
      buildTrustedAiContextPayload({ ...request, exampleIndex: 1 }, entry),
    ).toThrow("exampleIndex does not reference a stored example");
  });

  it("accepts a directly joined hyphenated token as one trusted selection", () => {
    const example = "A well-known pattern helps.";
    const start = example.indexOf("well-known");

    expect(
      buildTrustedAiContextPayload(
        {
          ...request,
          selectedStart: start,
          selectedEnd: start + "well-known".length,
        },
        { ...entry, examples: [example] },
      ).selectedText,
    ).toBe("well-known");
  });

  it("keeps stored example whitespace so public offsets cannot drift", () => {
    const example = "  We adapt.";
    const selectedStart = example.indexOf("adapt");

    expect(
      buildTrustedAiContextPayload(
        {
          ...request,
          selectedStart,
          selectedEnd: selectedStart + "adapt".length,
        },
        { ...entry, examples: [example] },
      ),
    ).toMatchObject({
      example,
      selectedText: "adapt",
    });
  });

  it("validates the bounded structured result against trusted context", () => {
    const trusted = buildTrustedAiContextPayload(request, entry);
    const result = {
      suggestedHeadword: "adapt",
      meaningInContextZh: "在这里表示适应变化",
      grammarRoleZh: "动词",
      contextExplanationZh: "adapt 在句中与 to 连用，表示逐渐适应某种变化。",
      phraseInContext: "adapt to",
    };

    expect(validateAiContextExplanation(result, trusted)).toEqual(result);
    expect(() =>
      validateAiContextExplanation({ ...result, phraseInContext: "adapt for" }, trusted),
    ).toThrow("phraseInContext must occur in the trusted example");
    expect(() =>
      validateAiContextExplanation({ ...result, source: "dictionary" }, trusted),
    ).toThrow(AiContextContractError);
  });
});
