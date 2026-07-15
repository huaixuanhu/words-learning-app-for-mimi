import { describe, expect, it } from "vitest";
import { AI_ROUTE_MAX_BODY_BYTES, parseStrictSameOriginJson } from "./request-guard";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://mimi.example/api/ai/enrichment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://mimi.example",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body,
  });
}

describe("V2 Stage 7A AI route request guard", () => {
  it("accepts bounded same-origin JSON", async () => {
    await expect(parseStrictSameOriginJson(request('{"ok":true}'))).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects a missing or cross-origin browser origin", async () => {
    await expect(
      parseStrictSameOriginJson(request("{}", { origin: "https://other.example" })),
    ).rejects.toMatchObject({ code: "same_origin_required", status: 403 });
    await expect(
      parseStrictSameOriginJson(request("{}", { origin: "" })),
    ).rejects.toMatchObject({ code: "same_origin_required", status: 403 });
  });

  it("rejects non-JSON and oversized request bodies", async () => {
    await expect(
      parseStrictSameOriginJson(request("{}", { "content-type": "text/plain" })),
    ).rejects.toMatchObject({ code: "json_content_type_required", status: 415 });
    await expect(
      parseStrictSameOriginJson(request("x".repeat(AI_ROUTE_MAX_BODY_BYTES + 1))),
    ).rejects.toMatchObject({ code: "body_too_large", status: 413 });
  });
});

