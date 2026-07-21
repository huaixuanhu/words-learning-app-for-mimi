import type { TtsVoiceContract } from "./contract";

export const TTS_PROVIDER_TIMEOUT_MS = 8_000;
export const TTS_MAX_AUDIO_BYTES = 512 * 1_024;

export type TtsProviderResult = Readonly<{
  audio: Uint8Array;
  contentType: "audio/mpeg";
  providerRequestId: string | null;
}>;

export type TtsProvider = Readonly<{
  source: "local-fixture" | "google-cloud-standard";
  voice: TtsVoiceContract;
  synthesize: (input: Readonly<{
    normalizedText: string;
    signal: AbortSignal;
  }>) => Promise<TtsProviderResult>;
}>;

export class TtsProviderError extends Error {
  readonly category: string;

  constructor(category: string, message = "Voice unavailable · Try again") {
    super(message);
    this.name = "TtsProviderError";
    this.category = category;
  }
}

export function validateTtsProviderResult(result: TtsProviderResult) {
  if (result.contentType !== "audio/mpeg") {
    throw new TtsProviderError("content_type_invalid");
  }
  if (!result.audio.byteLength || result.audio.byteLength > TTS_MAX_AUDIO_BYTES) {
    throw new TtsProviderError("audio_size_invalid");
  }
  return result;
}
