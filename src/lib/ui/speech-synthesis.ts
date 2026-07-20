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

export const SPEECH_VOICE_STORAGE_KEY = "mimi-english-voice-v1";
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

export function speakEnglishText(
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
    voiceName: voice?.name ?? null,
    voiceLanguage: voice?.lang ?? "en-US",
  };
}
