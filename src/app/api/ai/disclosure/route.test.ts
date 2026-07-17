import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import {
  AI_DISCLOSURE_VERSION,
  validatePublicAiDisclosureConfirmationRequest,
} from "@/lib/ai-enrichment/contract";
import { handleStage7b1DisclosurePost } from "@/lib/ai-enrichment/route-handler";
import { AI_DISCLOSURE_SESSION_COOKIE } from "@/lib/ai-enrichment/disclosure-session";

function request(headers: Record<string, string> = {}) {
  return new Request("https://mimi.example/api/ai/disclosure", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://mimi.example",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify({
      vocabularyEntryId: "00000000-0000-4000-8000-000000007b21",
      disclosureVersion: AI_DISCLOSURE_VERSION,
      confirmed: true,
    }),
  }) as NextRequest;
}

describe("/api/ai/disclosure V2-7B-1 boundary", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps the default route behind V2-7B-2 activation", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      reason: "provider_activation_pending",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("stores only a session hash and sets a strict HttpOnly cookie in injected tests", async () => {
    vi.stubEnv("VERCEL_ENV", "production-test");
    const confirm = vi.fn(async () => undefined);
    const response = await handleStage7b1DisclosurePost(
      request(),
      validatePublicAiDisclosureConfirmationRequest,
      confirm,
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(response.status).toBe(200);
    expect(cookie).toContain(`${AI_DISCLOSURE_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      sessionTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/u),
      disclosureDigest: expect.stringMatching(/^[0-9a-f]{64}$/u),
    }));
    const rawToken = cookie.match(new RegExp(`${AI_DISCLOSURE_SESSION_COOKIE}=([^;]+)`))?.[1];
    expect(JSON.stringify(confirm.mock.calls)).not.toContain(rawToken);
  });
});
