import { describe, expect, it } from "vitest";
import {
  GOOGLE_STANDARD_VOICE_CONTRACT,
  normalizeTtsText,
  TTS_REQUEST_VERSION,
  TtsContractError,
  validatePublicTtsRequest,
} from "./contract";

const request = {
  version: TTS_REQUEST_VERSION,
  requestId: "00000000-0000-4000-8000-000000000001",
  text: "  state-of-the-art   policy  ",
  purpose: "recognition",
} as const;

describe("TTS public contract", () => {
  it("pins the human-selected Google Standard voice", () => {
    expect(GOOGLE_STANDARD_VOICE_CONTRACT).toEqual({
      id: "google-en-au-standard-c-v1",
      provider: "google-cloud-standard",
      voiceName: "en-AU-Standard-C",
      languageCode: "en-AU",
      speakingRate: 0.9,
      pitch: 0,
      audioEncoding: "MP3",
      adapterContractVersion: "standard-tts-adapter-v1",
    });
  });

  it("normalizes a bounded plain-English word or phrase", () => {
    expect(validatePublicTtsRequest(request)).toEqual({
      ...request,
      text: "state-of-the-art policy",
    });
  });

  it.each([
    "https://example.com",
    "<speak>adapt</speak>",
    "adapt\u0000",
    "减轻",
    "a".repeat(241),
  ])("rejects unsafe or out-of-scope text without echoing it", (text) => {
    expect(() => normalizeTtsText(text)).toThrow(TtsContractError);
    try {
      normalizeTtsText(text);
    } catch (error) {
      expect((error as Error).message).not.toContain(text);
    }
  });

  it("rejects client-selected provider fields and unsupported purposes", () => {
    expect(() => validatePublicTtsRequest({ ...request, voice: "anything" })).toThrow(
      "This voice request is invalid.",
    );
    expect(() => validatePublicTtsRequest({ ...request, purpose: "ssml" })).toThrow(
      "This voice action is not available.",
    );
  });
});
