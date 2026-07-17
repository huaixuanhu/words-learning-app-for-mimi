import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { AI_DISCLOSURE_VERSION } from "@/lib/ai-enrichment/contract";

function request(body: unknown) {
  return new Request("https://mimi.example/api/ai/context-explain", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://mimi.example",
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("/api/ai/context-explain V2-7B-1 boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only exact offsets and stays closed before V2-7B-2", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("MIMI_AI_KILL_SWITCH", "true");
    const { POST } = await import("./route");
    const response = await POST(
      request({
        vocabularyEntryId: "11111111-1111-4111-8111-111111111111",
        exampleIndex: 0,
        selectedStart: 3,
        selectedEnd: 8,
        feature: "context_explain_v1",
        disclosureVersion: AI_DISCLOSURE_VERSION,
        idempotencyKey: "context-test-1",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: "provider_activation_pending" });
  });

  it("rejects client-supplied selected text", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    const { POST } = await import("./route");
    const response = await POST(
      request({
        vocabularyEntryId: "11111111-1111-4111-8111-111111111111",
        exampleIndex: 0,
        selectedStart: 3,
        selectedEnd: 8,
        selectedText: "adapt",
        feature: "context_explain_v1",
        disclosureVersion: AI_DISCLOSURE_VERSION,
        idempotencyKey: "context-test-2",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ reason: "request_contract_invalid" });
  });
});
