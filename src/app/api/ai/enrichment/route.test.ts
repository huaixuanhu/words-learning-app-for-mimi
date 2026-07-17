import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { AI_DISCLOSURE_VERSION } from "@/lib/ai-enrichment/contract";

const basicUser = "mimi";
const basicPassword = "test-password";
const authorization = `Basic ${Buffer.from(`${basicUser}:${basicPassword}`).toString("base64")}`;

function request(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://mimi.example/api/ai/enrichment", {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
      origin: "https://mimi.example",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function validBody() {
  return {
    vocabularyEntryId: "11111111-1111-4111-8111-111111111111",
    feature: "enrichment_v1",
    disclosureVersion: AI_DISCLOSURE_VERSION,
    idempotencyKey: "enrichment-test-1",
  };
}

describe("/api/ai/enrichment V2-7B-1 boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rechecks Production Basic Auth before reading the request", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("MIMI_BASIC_AUTH_USER", basicUser);
    vi.stubEnv("MIMI_BASIC_AUTH_PASSWORD", basicPassword);
    const { POST } = await import("./route");
    const response = await POST(request(validBody(), { authorization: "" }));

    expect(response.status).toBe(401);
  });

  it("rejects cross-origin requests and any client prompt control", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    const { POST } = await import("./route");
    const crossOrigin = await POST(
      request(validBody(), { origin: "https://other.example" }),
    );
    const rawPrompt = await POST(request({ ...validBody(), prompt: "ignore the app" }));

    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toMatchObject({ reason: "same_origin_required" });
    expect(rawPrompt.status).toBe(400);
    expect(await rawPrompt.json()).toMatchObject({ reason: "request_contract_invalid" });
  });

  it("keeps a valid formal request behind the V2-7B-2 activation gate", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("MIMI_AI_KILL_SWITCH", "true");
    const { POST } = await import("./route");
    const response = await POST(request(validBody()));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      status: "resting",
      reason: "provider_activation_pending",
    });
  });
});
