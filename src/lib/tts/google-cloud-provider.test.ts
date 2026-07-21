import { describe, expect, it } from "vitest";
import { GOOGLE_STANDARD_VOICE_CONTRACT } from "./contract";
import { createGoogleCloudTtsProvider } from "./google-cloud-provider";
import { TTS_GOOGLE_PROJECT_ID } from "./runtime-config";

describe("Google Cloud Standard TTS provider", () => {
  it("sends only the normalized text and the pinned Standard-C voice contract", async () => {
    const audio = Buffer.from("test-mp3").toString("base64");
    const calls: Array<Readonly<{ input: string | URL; init?: RequestInit }>> = [];
    const fetchFn = async (input: string | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ audioContent: audio }), {
        status: 200,
        headers: { "x-request-id": "provider-request" },
      });
    };
    const provider = createGoogleCloudTtsProvider({
      resolveAuthorization: async () => "short-lived-token",
      fetchFn,
    });

    const result = await provider.synthesize({
      normalizedText: "mitigate",
      signal: new AbortController().signal,
    });

    expect(provider.voice).toBe(GOOGLE_STANDARD_VOICE_CONTRACT);
    expect(result.audio).toEqual(Uint8Array.from(Buffer.from("test-mp3")));
    expect(result.providerRequestId).toBe("provider-request");
    expect(calls).toHaveLength(1);
    const { input: url, init } = calls[0];
    expect(url).toBe("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(init?.headers).toEqual({
      authorization: "Bearer short-lived-token",
      "content-type": "application/json",
      "x-goog-user-project": TTS_GOOGLE_PROJECT_ID,
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      input: { text: "mitigate" },
      voice: { languageCode: "en-AU", name: "en-AU-Standard-C" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9, pitch: 0 },
    });
  });

  it("does not surface provider bodies, access tokens or study text", async () => {
    const provider = createGoogleCloudTtsProvider({
      resolveAuthorization: async () => "secret-token",
      fetchFn: async () =>
        new Response("provider says mitigate secret-token", { status: 403 }),
    });

    await expect(
      provider.synthesize({
        normalizedText: "mitigate",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      category: "provider_http_403",
      message: "Voice unavailable · Try again",
    });
  });
});
