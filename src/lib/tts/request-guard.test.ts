import { describe, expect, it } from "vitest";
import { TTS_REQUEST_VERSION } from "./contract";
import { parseStrictTtsJson } from "./request-guard";

const body = JSON.stringify({
  version: TTS_REQUEST_VERSION,
  requestId: "00000000-0000-4000-8000-000000000001",
  text: "mitigate",
  purpose: "recognition",
});

describe("TTS same-origin request guard", () => {
  it("accepts the browser origin matching the public Host header", async () => {
    const request = new Request("http://localhost:3000/api/tts", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
        "content-type": "application/json",
        "sec-fetch-site": "same-origin",
      },
      body,
    });

    await expect(parseStrictTtsJson(request)).resolves.toMatchObject({ text: "mitigate" });
  });

  it("rejects an origin that matches neither the request URL nor Host header", async () => {
    const request = new Request("http://localhost:3000/api/tts", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "https://outside.example",
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body,
    });

    await expect(parseStrictTtsJson(request)).rejects.toMatchObject({
      code: "same_origin_required",
      status: 403,
    });
  });
});
