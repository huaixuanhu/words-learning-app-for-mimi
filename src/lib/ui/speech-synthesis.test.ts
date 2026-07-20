import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SPEECH_VOICE_PREFERENCE,
  listEnglishSpeechVoices,
  parseSpeechVoicePreference,
  selectSpeechVoice,
  speakEnglishText,
  type SpeechUtteranceAdapter,
  type SpeechVoiceAdapter,
} from "./speech-synthesis";

const voices: SpeechVoiceAdapter[] = [
  {
    voiceURI: "basic-us",
    name: "Basic English",
    lang: "en-US",
    default: true,
    localService: true,
  },
  {
    voiceURI: "natural-au",
    name: "Natural English",
    lang: "en-AU",
    default: false,
    localService: false,
  },
  {
    voiceURI: "mandarin",
    name: "Mandarin",
    lang: "zh-CN",
    default: false,
    localService: true,
  },
];

describe("browser English speech", () => {
  it("returns a calm unsupported state outside a browser", () => {
    expect(speakEnglishText("adapt")).toEqual({
      status: "unsupported",
      spokenText: "adapt",
    });
  });

  it("cancels the earlier queue and speaks one configured utterance", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    const utterance: SpeechUtteranceAdapter = {
      text: "",
      lang: "",
      rate: 1,
      pitch: 0,
      voice: null,
    };

    expect(
      speakEnglishText("  adapt  ", {
        synthesis: { cancel, speak, getVoices: () => voices },
        createUtterance: (text) => ({ ...utterance, text }),
        voicePreference: DEFAULT_SPEECH_VOICE_PREFERENCE,
      }),
    ).toEqual({
      status: "spoken",
      spokenText: "adapt",
      voiceName: "Natural English",
      voiceLanguage: "en-AU",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledWith({
      text: "adapt",
      lang: "en-AU",
      voice: voices[1],
      rate: 0.9,
      pitch: 1,
    });
  });

  it("lists only English voices and gives natural-labelled voices first", () => {
    expect(listEnglishSpeechVoices(voices).map((voice) => voice.voiceURI)).toEqual([
      "natural-au",
      "basic-us",
    ]);
  });

  it("keeps an exact device choice and falls back safely when it disappears", () => {
    const preference = {
      mode: "voice" as const,
      voiceURI: "basic-us",
      name: "Basic English",
      lang: "en-US",
    };
    expect(selectSpeechVoice(voices, preference)?.voiceURI).toBe("basic-us");
    expect(
      selectSpeechVoice(voices.slice(1), preference)?.voiceURI,
    ).toBe("natural-au");
  });

  it("rejects corrupt or non-English stored preferences", () => {
    expect(parseSpeechVoicePreference("not-json")).toEqual(
      DEFAULT_SPEECH_VOICE_PREFERENCE,
    );
    expect(
      parseSpeechVoicePreference(
        JSON.stringify({
          mode: "voice",
          voiceURI: "mandarin",
          name: "Mandarin",
          lang: "zh-CN",
        }),
      ),
    ).toEqual(DEFAULT_SPEECH_VOICE_PREFERENCE);
  });
});
