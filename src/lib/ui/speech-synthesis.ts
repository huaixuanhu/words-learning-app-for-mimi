import {
  normalizeTtsText,
  TTS_REQUEST_VERSION,
  type TtsPurpose,
} from "@/lib/tts/contract";

export type SpeechVoiceAdapter = {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};

export type SpeechUtteranceAdapter = {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voice: SpeechVoiceAdapter | null;
};

export type SpeechSynthesisAdapter = {
  cancel: () => void;
  speak: (utterance: SpeechUtteranceAdapter) => void;
  getVoices?: () => SpeechVoiceAdapter[];
};

export type SpeechVoicePreference =
  | Readonly<{ mode: "auto" }>
  | Readonly<{
      mode: "voice";
      voiceURI: string;
      name: string;
      lang: string;
    }>;

type SpeechDependencies = Readonly<{
  synthesis?: SpeechSynthesisAdapter | null;
  createUtterance?: (text: string) => SpeechUtteranceAdapter;
  voicePreference?: SpeechVoicePreference;
  voices?: readonly SpeechVoiceAdapter[];
}>;

export type SpeechSourcePreference = "cloud" | "device";

type CloudSpeechDependencies = Readonly<{
  fetchImpl?: typeof fetch;
  createRequestId?: () => string;
  playAudioBlob?: (blob: Blob) => Promise<void>;
  sourcePreference?: SpeechSourcePreference;
}>;

export const SPEECH_VOICE_STORAGE_KEY = "mimi-english-voice-v1";
export const SPEECH_SOURCE_STORAGE_KEY = "mimi-english-speech-source-v1";
export const DEFAULT_SPEECH_SOURCE_PREFERENCE: SpeechSourcePreference = "cloud";
export const DEFAULT_SPEECH_VOICE_PREFERENCE: SpeechVoicePreference = Object.freeze({
  mode: "auto",
});

const ENGLISH_LANGUAGE = /^en(?:-|$)/iu;
const NATURAL_VOICE_HINT = /natural|neural|enhanced|premium|online/iu;

function isVoicePreference(value: unknown): value is SpeechVoicePreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.mode === "auto") {
    return Object.keys(record).length === 1;
  }

  return (
    record.mode === "voice" &&
    typeof record.voiceURI === "string" &&
    Boolean(record.voiceURI.trim()) &&
    typeof record.name === "string" &&
    Boolean(record.name.trim()) &&
    typeof record.lang === "string" &&
    ENGLISH_LANGUAGE.test(record.lang)
  );
}

export function parseSpeechVoicePreference(
  rawValue: string | null,
): SpeechVoicePreference {
  if (!rawValue) {
    return DEFAULT_SPEECH_VOICE_PREFERENCE;
  }

  try {
    const value = JSON.parse(rawValue) as unknown;
    return isVoicePreference(value)
      ? value
      : DEFAULT_SPEECH_VOICE_PREFERENCE;
  } catch {
    return DEFAULT_SPEECH_VOICE_PREFERENCE;
  }
}

export function readSpeechVoicePreference(): SpeechVoicePreference {
  if (typeof window === "undefined") {
    return DEFAULT_SPEECH_VOICE_PREFERENCE;
  }

  try {
    return parseSpeechVoicePreference(
      window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_SPEECH_VOICE_PREFERENCE;
  }
}

export function writeSpeechVoicePreference(
  preference: SpeechVoicePreference,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SPEECH_VOICE_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // Voice choice is device-only. Playback still falls back to auto selection.
  }
}

export function readSpeechSourcePreference(): SpeechSourcePreference {
  if (typeof window === "undefined") return DEFAULT_SPEECH_SOURCE_PREFERENCE;
  try {
    return window.localStorage.getItem(SPEECH_SOURCE_STORAGE_KEY) === "device"
      ? "device"
      : DEFAULT_SPEECH_SOURCE_PREFERENCE;
  } catch {
    return DEFAULT_SPEECH_SOURCE_PREFERENCE;
  }
}

export function writeSpeechSourcePreference(preference: SpeechSourcePreference) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SPEECH_SOURCE_STORAGE_KEY, preference);
  } catch {
    // Playback source is device-only and may safely return to the Cloud default.
  }
}

function normalizedLanguage(language: string) {
  return language.trim().replaceAll("_", "-").toLowerCase();
}

function autoVoiceScore(voice: SpeechVoiceAdapter) {
  const language = normalizedLanguage(voice.lang);
  let score = 0;

  if (NATURAL_VOICE_HINT.test(voice.name)) score += 100;
  if (voice.default) score += 30;
  if (language === "en-au") score += 20;
  else if (language === "en-gb") score += 15;
  else if (language === "en-us") score += 10;
  if (voice.localService) score += 2;

  return score;
}

export function listEnglishSpeechVoices(
  voices: readonly SpeechVoiceAdapter[],
) {
  return voices
    .filter(
      (voice) =>
        Boolean(voice.voiceURI.trim()) &&
        Boolean(voice.name.trim()) &&
        ENGLISH_LANGUAGE.test(voice.lang),
    )
    .sort((left, right) => {
      const scoreDifference = autoVoiceScore(right) - autoVoiceScore(left);
      if (scoreDifference) return scoreDifference;
      return `${left.lang}:${left.name}:${left.voiceURI}`.localeCompare(
        `${right.lang}:${right.name}:${right.voiceURI}`,
      );
    });
}

export function selectSpeechVoice(
  voices: readonly SpeechVoiceAdapter[],
  preference: SpeechVoicePreference,
) {
  const englishVoices = listEnglishSpeechVoices(voices);
  if (!englishVoices.length) {
    return null;
  }

  if (preference.mode === "voice") {
    const exact = englishVoices.find(
      (voice) => voice.voiceURI === preference.voiceURI,
    );
    if (exact) return exact;

    const compatible = englishVoices.find(
      (voice) =>
        voice.name === preference.name &&
        normalizedLanguage(voice.lang) === normalizedLanguage(preference.lang),
    );
    if (compatible) return compatible;
  }

  return englishVoices[0];
}

export function getBrowserEnglishSpeechVoices() {
  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined"
  ) {
    return [];
  }

  return listEnglishSpeechVoices(
    window.speechSynthesis.getVoices() as SpeechVoiceAdapter[],
  );
}

function getBrowserDependencies(): Required<
  Pick<SpeechDependencies, "synthesis" | "createUtterance">
> | null {
  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined" ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return null;
  }

  return {
    synthesis: {
      cancel: () => window.speechSynthesis.cancel(),
      speak: (utterance) =>
        window.speechSynthesis.speak(utterance as SpeechSynthesisUtterance),
      getVoices: () =>
        window.speechSynthesis.getVoices() as SpeechVoiceAdapter[],
    },
    createUtterance: (text) =>
      new SpeechSynthesisUtterance(text) as SpeechUtteranceAdapter,
  };
}

export function speakWithDeviceVoice(
  text: string,
  dependencies: SpeechDependencies = {},
) {
  const spokenText = text.trim();

  if (!spokenText) {
    return { status: "empty" as const, spokenText: "" };
  }

  const browserDependencies = getBrowserDependencies();
  const synthesis =
    dependencies.synthesis ?? browserDependencies?.synthesis ?? null;
  const createUtterance =
    dependencies.createUtterance ?? browserDependencies?.createUtterance;

  if (!synthesis || !createUtterance) {
    return { status: "unsupported" as const, spokenText };
  }

  const voices = dependencies.voices ?? synthesis.getVoices?.() ?? [];
  const preference =
    dependencies.voicePreference ?? readSpeechVoicePreference();
  const voice = selectSpeechVoice(voices, preference);
  const utterance = createUtterance(spokenText);
  utterance.lang = voice?.lang ?? "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.voice = voice;
  synthesis.cancel();
  synthesis.speak(utterance);

  return {
    status: "spoken" as const,
    spokenText,
    source: "device" as const,
    voiceName: voice?.name ?? null,
    voiceLanguage: voice?.lang ?? "en-US",
  };
}

let activeCloudAudio: HTMLAudioElement | null = null;
let activeCloudAudioCleanup: (() => void) | null = null;
let activeCloudRequest: AbortController | null = null;
let activePlaybackGeneration = 0;
let currentCloudVoiceContract = "";
const cloudAudioMemory = new Map<string, Blob>();
const CLOUD_AUDIO_MEMORY_LIMIT = 32;

function rememberCloudAudio(key: string, blob: Blob) {
  cloudAudioMemory.delete(key);
  cloudAudioMemory.set(key, blob);
  while (cloudAudioMemory.size > CLOUD_AUDIO_MEMORY_LIMIT) {
    const oldest = cloudAudioMemory.keys().next().value as string | undefined;
    if (!oldest) break;
    cloudAudioMemory.delete(oldest);
  }
}

function browserPlayAudioBlob(blob: Blob) {
  return new Promise<void>((resolve, reject) => {
    if (typeof Audio === "undefined" || typeof URL === "undefined") {
      reject(new Error("Audio playback is unavailable"));
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      if (activeCloudAudio === audio) {
        activeCloudAudio = null;
        activeCloudAudioCleanup = null;
      }
    };
    activeCloudAudio?.pause();
    activeCloudAudioCleanup?.();
    activeCloudAudio = audio;
    activeCloudAudioCleanup = cleanup;
    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
    void audio.play().then(resolve, (error) => {
      cleanup();
      reject(error);
    });
  });
}

export function cancelEnglishSpeech() {
  activePlaybackGeneration += 1;
  activeCloudRequest?.abort();
  activeCloudRequest = null;
  activeCloudAudio?.pause();
  activeCloudAudioCleanup?.();
  activeCloudAudio = null;
  activeCloudAudioCleanup = null;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

async function errorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message.trim()
      ? body.message
      : "Voice unavailable · Try again";
  } catch {
    return "Voice unavailable · Try again";
  }
}

export async function speakEnglishText(
  text: string,
  purpose: TtsPurpose,
  dependencies: CloudSpeechDependencies & SpeechDependencies = {},
) {
  let spokenText: string;
  try {
    spokenText = normalizeTtsText(text);
  } catch {
    return { status: "empty" as const, spokenText: "" };
  }

  const sourcePreference =
    dependencies.sourcePreference ?? readSpeechSourcePreference();
  if (sourcePreference === "device") {
    return speakWithDeviceVoice(spokenText, dependencies);
  }

  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return {
      status: "unavailable" as const,
      spokenText,
      source: "cloud" as const,
      message: "Voice unavailable · Try again",
    };
  }

  cancelEnglishSpeech();
  const generation = activePlaybackGeneration;
  const playAudioBlob = dependencies.playAudioBlob ?? browserPlayAudioBlob;
  const memoryKey = currentCloudVoiceContract
    ? `${currentCloudVoiceContract}:${spokenText}`
    : "";
  const cached = memoryKey ? cloudAudioMemory.get(memoryKey) : null;
  if (cached) {
    try {
      await playAudioBlob(cached);
      return {
        status: "spoken" as const,
        spokenText,
        source: "cloud-memory" as const,
        cacheStatus: "memory" as const,
      };
    } catch {
      return {
        status: "unavailable" as const,
        spokenText,
        source: "cloud" as const,
        message: "Voice unavailable · Try again",
      };
    }
  }

  const controller = new AbortController();
  activeCloudRequest = controller;
  try {
    const requestId =
      dependencies.createRequestId?.() ?? globalThis.crypto?.randomUUID?.();
    if (!requestId) throw new Error("Request id is unavailable");
    const response = await fetchImpl("/api/tts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: TTS_REQUEST_VERSION,
        requestId,
        text: spokenText,
        purpose,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        status: "unavailable" as const,
        spokenText,
        source: "cloud" as const,
        message: await errorMessage(response),
      };
    }
    if (response.headers.get("content-type")?.split(";", 1)[0] !== "audio/mpeg") {
      throw new Error("Voice response type is invalid");
    }
    const blob = await response.blob();
    if (generation !== activePlaybackGeneration || controller.signal.aborted) {
      return { status: "cancelled" as const, spokenText };
    }
    const voiceContract = response.headers.get("x-mimi-tts-voice-contract") ?? "";
    if (voiceContract) {
      currentCloudVoiceContract = voiceContract;
      rememberCloudAudio(`${voiceContract}:${spokenText}`, blob);
    }
    await playAudioBlob(blob);
    return {
      status: "spoken" as const,
      spokenText,
      source:
        response.headers.get("x-mimi-tts-source") === "local-fixture"
          ? ("local-fixture" as const)
          : ("cloud" as const),
      cacheStatus: response.headers.get("x-mimi-tts-cache") ?? "unknown",
    };
  } catch {
    if (controller.signal.aborted || generation !== activePlaybackGeneration) {
      return { status: "cancelled" as const, spokenText };
    }
    return {
      status: "unavailable" as const,
      spokenText,
      source: "cloud" as const,
      message: "Voice unavailable · Try again",
    };
  } finally {
    if (activeCloudRequest === controller) activeCloudRequest = null;
  }
}
