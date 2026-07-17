import { describe, expect, it, vi } from "vitest";
import {
  GEMINI_PROVIDER_TIMEOUT_MS,
  createGeminiProviderAdapter,
} from "./gemini-provider-adapter";

const materials = {
  systemPrompt: "Return only the requested structure.",
  responseJsonSchema: { type: "object" },
};
const source = {
  term: "adapt",
  meaningsZh: ["适应"],
  examples: ["We adapt to change."],
};

function providerResponse(draft: unknown, overrides: Record<string, unknown> = {}) {
  return {
    modelVersion: "gemini-3.1-flash-lite-001",
    responseId: "provider-response-1",
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 80,
      thoughtsTokenCount: 20,
      totalTokenCount: 200,
    },
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(draft) }] },
      },
    ],
    ...overrides,
  };
}

describe("V2-7B-1 Gemini provider adapter", () => {
  it("uses the pinned REST model, strict structure, and no optional tools", async () => {
    const fetchImpl = vi.fn(async (input: string, init: RequestInit) => {
      void input;
      void init;
      return Response.json(
        providerResponse({
          additionalMeaningsZh: [],
          examples: ["People adapt gradually."],
          similarWords: [],
          confusableWords: [],
        }),
      );
    });
    const adapter = createGeminiProviderAdapter({
      apiKey: "test-key",
      fetchImpl,
    });
    const result = await adapter.generateEnrichment(source, materials);

    expect(result.value.examples).toEqual(["People adapt gradually."]);
    expect(result.usage.totalTokenCount).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    );
    expect(url).not.toContain("test-key");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    const requestBody = JSON.parse(String(init.body));
    expect(requestBody.store).toBe(false);
    expect(requestBody.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" },
      maxOutputTokens: 700,
    });
    expect(requestBody).not.toHaveProperty("tools");
  });

  it("does not retry an ambiguous network failure", async () => {
    const fetchImpl = vi.fn(async (input: string, init: RequestInit) => {
      void input;
      void init;
      throw new Error("timeout");
    });
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });

    await expect(adapter.generateEnrichment(source, materials)).rejects.toMatchObject({
      category: "provider_network_ambiguous",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("aborts one provider request before the accounting lease can expire", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      async (_input: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });
    const pending = adapter.generateEnrichment(source, materials);
    const rejection = expect(pending).rejects.toMatchObject({
      category: "provider_network_ambiguous",
    });

    await vi.advanceTimersByTimeAsync(GEMINI_PROVIDER_TIMEOUT_MS);
    await rejection;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("rejects output usage above the reserved envelope", async () => {
    const fetchImpl = vi.fn(async (input: string, init: RequestInit) => {
      void input;
      void init;
      return Response.json(
        providerResponse(
          { additionalMeaningsZh: [], examples: [], similarWords: [], confusableWords: [] },
          {
            usageMetadata: {
              promptTokenCount: 100,
              candidatesTokenCount: 701,
              thoughtsTokenCount: 0,
              totalTokenCount: 801,
            },
          },
        ),
      );
    });
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });

    await expect(adapter.generateEnrichment(source, materials)).rejects.toMatchObject({
      category: "provider_usage_exceeded",
      usage: { totalTokenCount: 801 },
    });
  });

  it("fails closed when modelVersion evidence is missing", async () => {
    const fetchImpl = vi.fn(async () => Response.json(
      providerResponse(
        { additionalMeaningsZh: [], examples: [], similarWords: [], confusableWords: [] },
        { modelVersion: undefined },
      ),
    ));
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });

    await expect(adapter.generateEnrichment(source, materials)).rejects.toMatchObject({
      category: "provider_model_missing",
      usage: { totalTokenCount: 200 },
      providerResponseId: "provider-response-1",
    });
  });

  it("preserves reliable usage when visible content fails local validation", async () => {
    const fetchImpl = vi.fn(async () => Response.json(
      providerResponse({
        additionalMeaningsZh: [],
        examples: ["We adapt to change."],
        similarWords: [],
        confusableWords: [],
      }),
    ));
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });

    await expect(adapter.generateEnrichment(source, materials)).rejects.toMatchObject({
      category: "provider_response_contract",
      usage: { promptTokenCount: 100, totalTokenCount: 200 },
      modelVersion: "gemini-3.1-flash-lite-001",
    });
  });

  it("preserves reliable usage on a provider content block", async () => {
    const fetchImpl = vi.fn(async () => Response.json(
      providerResponse(null, {
        promptFeedback: { blockReason: "SAFETY" },
        candidates: [],
      }),
    ));
    const adapter = createGeminiProviderAdapter({ apiKey: "test-key", fetchImpl });

    await expect(adapter.generateEnrichment(source, materials)).rejects.toMatchObject({
      category: "provider_content_block",
      usage: { totalTokenCount: 200 },
      providerResponseId: "provider-response-1",
    });
  });
});
