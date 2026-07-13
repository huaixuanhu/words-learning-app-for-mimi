import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  STAGE2_CONFIRMATION_FLAG,
  STAGE2_CORPUS_SIZE,
  STAGE2_MAXIMUM_RESERVED_RUN_COST_USD,
  STAGE2_MODEL,
  Stage2AiQualityError,
  assertLiveGuards,
  buildGeminiRequest,
  buildProviderLexicalPayload,
  buildReviewWorksheet,
  classifyProviderError,
  parseGeminiResponse,
  reservedAttemptCostUsd,
  summarizeResults,
  validateCorpus,
  validateDraftForRunner,
} from "./v2-ai-quality-runner.mjs";

const corpusUrl = new URL("../test_fixtures/v2-stage2-ai-corpus.json", import.meta.url);
const schemaUrl = new URL(
  "../src/lib/ai-enrichment/gemini-response-schema.json",
  import.meta.url,
);

async function fixtureInputs() {
  const [corpusText, schemaText] = await Promise.all([
    readFile(corpusUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
  ]);
  return {
    corpus: validateCorpus(JSON.parse(corpusText)),
    schema: JSON.parse(schemaText),
  };
}

describe("V2 Stage 2 Gemini quality runner", () => {
  it("loads exactly 120 unique entries in the accepted groups", async () => {
    const { corpus } = await fixtureInputs();
    expect(corpus.entries).toHaveLength(STAGE2_CORPUS_SIZE);
    expect(corpus.groupCounts).toEqual({
      academic: 30,
      polysemy: 20,
      phrase: 20,
      spelling: 20,
      sound: 20,
      usage: 10,
    });
    expect(new Set(corpus.entries.map((entry) => entry.term.toLowerCase())).size).toBe(120);
  });

  it("sends only lexical fields and pins the explicit stable model outside the body", async () => {
    const { corpus, schema } = await fixtureInputs();
    const entry = corpus.entries[0];
    expect(buildProviderLexicalPayload(entry)).toEqual({
      term: entry.term,
      meaningsZh: entry.meaningsZh,
      examples: entry.examples,
    });
    const request = buildGeminiRequest(entry, "fixed prompt", schema);
    const outbound = JSON.parse(request.contents[0].parts[0].text);
    expect(Object.keys(outbound)).toEqual(["term", "meaningsZh", "examples"]);
    expect(JSON.stringify(request)).not.toContain("expectedRelations");
    expect(JSON.stringify(request)).not.toContain("primaryGroup");
    expect(request).not.toHaveProperty("tools");
    expect(request.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" },
      maxOutputTokens: 700,
    });
    expect(STAGE2_MODEL).toBe("gemini-3.1-flash-lite");
  });

  it("requires an explicit second live confirmation", () => {
    expect(assertLiveGuards(["--dry-run"])).toEqual({ live: false });
    expect(() =>
      assertLiveGuards(["--live"], new Date("2026-07-13T10:00:00.000Z")),
    ).toThrow(Stage2AiQualityError);
    expect(
      assertLiveGuards(
        ["--live", STAGE2_CONFIRMATION_FLAG],
        new Date("2026-07-13T10:00:00.000Z"),
      ),
    ).toMatchObject({ live: true });
    expect(reservedAttemptCostUsd() * 120).toBeLessThanOrEqual(
      STAGE2_MAXIMUM_RESERVED_RUN_COST_USD,
    );
  });

  it("fails closed after the price check expires", () => {
    expect(() =>
      assertLiveGuards(
        ["--live", STAGE2_CONFIRMATION_FLAG],
        new Date("2026-08-13T00:00:00.000Z"),
      ),
    ).toThrow("pricing evidence is stale");
  });

  it("validates provider JSON again after Structured Output", () => {
    expect(
      validateDraftForRunner(
        {
          additionalMeaningsZh: [],
          examples: ["The change had a measurable effect."],
          similarWords: [{ word: "result", differenceZh: "更强调最终结果" }],
          confusableWords: [
            {
              word: "affect",
              type: "usage",
              differenceZh: "affect 通常作动词",
              examplePair: [
                "The policy affected demand.",
                "The policy had an effect on demand.",
              ],
            },
          ],
        },
        "effect",
      ),
    ).toMatchObject({ confusableWords: [{ word: "affect" }] });

    expect(() =>
      validateDraftForRunner(
        {
          additionalMeaningsZh: [],
          examples: [],
          similarWords: [{ word: "effect", differenceZh: "self" }],
          confusableWords: [],
        },
        "effect",
      ),
    ).toThrow("candidate words must be unique and not the source term");
  });

  it("parses a valid Gemini response and includes thinking in cost evidence", () => {
    const parsed = parseGeminiResponse(
      {
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    additionalMeaningsZh: [],
                    examples: [],
                    similarWords: [],
                    confusableWords: [],
                  }),
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 5,
          totalTokenCount: 125,
        },
        modelVersion: "gemini-3.1-flash-lite",
      },
      "effect",
    );
    expect(parsed).toMatchObject({
      modelVersion: "gemini-3.1-flash-lite",
      finishReason: "STOP",
      usage: { thoughtsTokenCount: 5 },
    });
  });

  it("retains safe accounting context when semantic validation rejects a draft", () => {
    let caught;
    try {
      parseGeminiResponse(
        {
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      additionalMeaningsZh: [],
                      examples: [],
                      similarWords: [
                        { word: "effect", differenceZh: "重复原词" },
                      ],
                      confusableWords: [],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 20,
            thoughtsTokenCount: 0,
            totalTokenCount: 120,
          },
          modelVersion: "gemini-3.1-flash-lite",
        },
        "effect",
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Stage2AiQualityError);
    expect(caught.safeContext).toMatchObject({
      modelVersion: "gemini-3.1-flash-lite",
      finishReason: "STOP",
      usage: { promptTokenCount: 100, candidatesTokenCount: 20 },
      rejectedDraft: {
        similarWords: [{ word: "effect" }],
      },
    });
  });

  it("retains usage and classifies provider content stops before parsing output", () => {
    const blockedBody = {
      candidates: [],
      promptFeedback: { blockReason: "SAFETY" },
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 0,
        thoughtsTokenCount: 0,
        totalTokenCount: 100,
      },
      modelVersion: "gemini-3.1-flash-lite",
    };
    let promptBlock;
    try {
      parseGeminiResponse(blockedBody, "effect");
    } catch (error) {
      promptBlock = error;
    }
    expect(promptBlock).toBeInstanceOf(Stage2AiQualityError);
    expect(promptBlock).toMatchObject({
      terminalCategory: "provider_content_block",
      safeContext: { usage: { promptTokenCount: 100 } },
    });

    const safetyFinishBody = {
      candidates: [{ finishReason: "SAFETY" }],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 10,
        thoughtsTokenCount: 0,
        totalTokenCount: 110,
      },
      modelVersion: "gemini-3.1-flash-lite",
    };
    let safetyFinish;
    try {
      parseGeminiResponse(safetyFinishBody, "effect");
    } catch (error) {
      safetyFinish = error;
    }
    expect(safetyFinish).toMatchObject({
      terminalCategory: "provider_nonstop_finish",
      safeContext: {
        finishReason: "SAFETY",
        usage: { candidatesTokenCount: 10 },
      },
    });
  });

  it("retains usage when a STOP response contains invalid JSON", () => {
    let caught;
    try {
      parseGeminiResponse(
        {
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: "not-json" }] },
            },
          ],
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 5,
            thoughtsTokenCount: 0,
            totalTokenCount: 105,
          },
          modelVersion: "gemini-3.1-flash-lite",
        },
        "effect",
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({
      terminalCategory: null,
      safeContext: {
        finishReason: "STOP",
        usage: { candidatesTokenCount: 5 },
      },
    });
  });

  it("rejects unexpected model versions and token-envelope overruns", () => {
    const response = {
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  additionalMeaningsZh: [],
                  examples: [],
                  similarWords: [],
                  confusableWords: [],
                }),
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        totalTokenCount: 125,
      },
      modelVersion: "gemini-3.5-flash",
    };
    expect(() => parseGeminiResponse(response, "effect")).toThrow(
      "unexpected model version",
    );

    response.modelVersion = "gemini-3.1-flash-lite";
    response.usageMetadata.promptTokenCount = 2_001;
    response.usageMetadata.totalTokenCount = 2_026;
    expect(() => parseGeminiResponse(response, "effect")).toThrow(
      "input-token reservation",
    );
  });

  it("maps provider errors without preserving provider bodies", () => {
    expect(classifyProviderError(400)).toBe("provider_rejected_request");
    expect(classifyProviderError(401)).toBe("provider_auth_or_permission");
    expect(classifyProviderError(429)).toBe("provider_quota_or_rate_limit");
    expect(classifyProviderError(503)).toBe("provider_unavailable");
  });

  it("builds aggregate evidence and an empty human review worksheet", () => {
    const results = [
      {
        entryId: "academic-001",
        term: "allocate",
        primaryGroup: "academic",
        status: "valid",
        terminalCategory: "valid_draft",
        modelVersion: "gemini-3.1-flash-lite",
        latencyMs: 120,
        usage: {
          promptTokenCount: 100,
          candidatesTokenCount: 20,
          thoughtsTokenCount: 5,
          totalTokenCount: 125,
        },
        estimatedCostUsd: 0.00003,
      },
    ];
    const summary = summarizeResults(
      results,
      "corpus-hash",
      "2026-07-13T10:00:00.000Z",
      "2026-07-13T10:00:01.000Z",
    );
    expect(summary).toMatchObject({
      version: 2,
      submitted: 1,
      succeeded: 1,
      invalid: 0,
      failed: 0,
      usageTotals: { thoughtsTokenCount: 5 },
    });
    const worksheet = buildReviewWorksheet(results);
    expect(worksheet).toContain('"meaningRating"');
    expect(worksheet).toContain('"terminalCategory"');
    expect(worksheet).toContain('"allocate"');
    expect(worksheet).not.toContain("accept");
  });
});
