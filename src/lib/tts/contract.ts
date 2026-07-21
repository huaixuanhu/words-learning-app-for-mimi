export const TTS_REQUEST_VERSION = "tts-request-v1" as const;
export const TTS_ADAPTER_CONTRACT_VERSION = "standard-tts-adapter-v1" as const;
export const TTS_MAX_TEXT_CHARACTERS = 240;
export const TTS_MAX_REQUEST_BYTES = 2_048;

export const TTS_PURPOSES = [
  "recognition",
  "active-answer",
  "active-dictation",
  "example-word",
  "settings-preview",
] as const;

export type TtsPurpose = (typeof TTS_PURPOSES)[number];

export type PublicTtsRequest = Readonly<{
  version: typeof TTS_REQUEST_VERSION;
  requestId: string;
  text: string;
  purpose: TtsPurpose;
}>;

export type TtsVoiceContract = Readonly<{
  id: string;
  provider: "local-fixture" | "google-cloud-standard";
  voiceName: string;
  languageCode: string;
  speakingRate: number;
  pitch: number;
  audioEncoding: "MP3";
  adapterContractVersion: typeof TTS_ADAPTER_CONTRACT_VERSION;
}>;

export const LOCAL_FIXTURE_VOICE_CONTRACT: TtsVoiceContract = Object.freeze({
  id: "local-fixture-tone-v1",
  provider: "local-fixture",
  voiceName: "local-fixture-tone",
  languageCode: "en-AU",
  speakingRate: 1,
  pitch: 0,
  audioEncoding: "MP3",
  adapterContractVersion: TTS_ADAPTER_CONTRACT_VERSION,
});

export const GOOGLE_STANDARD_VOICE_CONTRACT: TtsVoiceContract = Object.freeze({
  id: "google-en-au-standard-c-v1",
  provider: "google-cloud-standard",
  voiceName: "en-AU-Standard-C",
  languageCode: "en-AU",
  speakingRate: 0.9,
  pitch: 0,
  audioEncoding: "MP3",
  adapterContractVersion: TTS_ADAPTER_CONTRACT_VERSION,
});

export class TtsContractError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "TtsContractError";
    this.code = code;
    this.status = status;
  }
}

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LATIN_PLAYBACK_TEXT =
  /^[\p{Script=Latin}\p{M}\p{N}\s'’.,!?;:()\-/–—]+$/u;
const CONTROL_CHARACTER = /[\p{Cc}\p{Cf}]/u;
const URL_LIKE = /(?:https?:\/\/|www\.)/iu;
const MARKUP_LIKE = /[<>]|&(?:lt|gt|#x?0*3[cCeE]);/iu;

export function countUnicodeCharacters(value: string) {
  return Array.from(value).length;
}

export function normalizeTtsText(value: string) {
  if (typeof value !== "string") {
    throw new TtsContractError("text_required", "Choose English text to play.");
  }

  if (CONTROL_CHARACTER.test(value)) {
    throw new TtsContractError(
      "text_controls_rejected",
      "This text cannot be played.",
    );
  }

  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!normalized) {
    throw new TtsContractError("text_required", "Choose English text to play.");
  }
  if (countUnicodeCharacters(normalized) > TTS_MAX_TEXT_CHARACTERS) {
    throw new TtsContractError("text_too_long", "This text is too long to play.");
  }
  if (
    URL_LIKE.test(normalized) ||
    MARKUP_LIKE.test(normalized) ||
    !LATIN_PLAYBACK_TEXT.test(normalized)
  ) {
    throw new TtsContractError(
      "text_not_supported",
      "Only plain English words and phrases can be played.",
    );
  }
  return normalized;
}

function exactObjectKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

export function validatePublicTtsRequest(value: unknown): PublicTtsRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TtsContractError("request_invalid", "This voice request is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (!exactObjectKeys(record, ["version", "requestId", "text", "purpose"])) {
    throw new TtsContractError("request_shape_invalid", "This voice request is invalid.");
  }
  if (record.version !== TTS_REQUEST_VERSION) {
    throw new TtsContractError("request_version_invalid", "Please refresh this page and try again.");
  }
  if (typeof record.requestId !== "string" || !REQUEST_ID_PATTERN.test(record.requestId)) {
    throw new TtsContractError("request_id_invalid", "This voice request is invalid.");
  }
  if (
    typeof record.purpose !== "string" ||
    !TTS_PURPOSES.includes(record.purpose as TtsPurpose)
  ) {
    throw new TtsContractError("purpose_invalid", "This voice action is not available.");
  }
  return {
    version: TTS_REQUEST_VERSION,
    requestId: record.requestId,
    text: normalizeTtsText(record.text as string),
    purpose: record.purpose as TtsPurpose,
  };
}
