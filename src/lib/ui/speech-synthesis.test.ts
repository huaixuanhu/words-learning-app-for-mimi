import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SPEECH_VOICE_PREFERENCE,
  listEnglishSpeechVoices,
  parseSpeechVoicePreference,
  selectSpeechVoice,
  speakEnglishText,
  speakWithDeviceVoice,
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
    expect(speakWithDeviceVoice("adapt")).toEqual({
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
      speakWithDeviceVoice("  adapt  ", {
        synthesis: { cancel, speak, getVoices: () => voices },
        createUtterance: (text) => ({ ...utterance, text }),
        voicePreference: DEFAULT_SPEECH_VOICE_PREFERENCE,
      }),
    ).toEqual({
      status: "spoken",
      spokenText: "adapt",
      source: "device",
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

  it("uses the strict Cloud route by default without a silent device fallback", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(Uint8Array.from([0xff, 0xfb, 0x90, 0x64]), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "x-mimi-tts-cache": "miss",
          "x-mimi-tts-source": "local-fixture",
          "x-mimi-tts-voice-contract": "fixture-v1",
        },
      }),
    );
    const playAudioBlob = vi.fn(async () => undefined);
    const result = await speakEnglishText("adapt", "recognition", {
      fetchImpl,
      createRequestId: () => "00000000-0000-4000-8000-000000000001",
      playAudioBlob,
      sourcePreference: "cloud",
    });

    expect(result).toMatchObject({
      status: "spoken",
      source: "local-fixture",
      cacheStatus: "miss",
    });
    expect(playAudioBlob).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/tts",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("routes device choice only through browser speech", async () => {
    const fetchImpl = vi.fn();
    const cancel = vi.fn();
    const speak = vi.fn();
    const result = await speakEnglishText("device only", "settings-preview", {
      sourcePreference: "device",
      fetchImpl,
      synthesis: { cancel, speak, getVoices: () => voices },
      createUtterance: (text) => ({
        text,
        lang: "",
        rate: 1,
        pitch: 0,
        voice: null,
      }),
    });

    expect(result).toMatchObject({ status: "spoken", source: "device" });
    expect(speak).toHaveBeenCalledOnce();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("cancels an earlier Cloud request before device playback", async () => {
    let cloudSignal: AbortSignal | undefined;
    const pendingCloud = speakEnglishText("pending cloud", "recognition", {
      sourcePreference: "cloud",
      createRequestId: () => "00000000-0000-4000-8000-000000000002",
      fetchImpl: vi.fn((_url, init) => {
        cloudSignal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          cloudSignal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      }),
    });
    await Promise.resolve();

    const deviceResult = await speakEnglishText(
      "device after cloud",
      "settings-preview",
      {
        sourcePreference: "device",
        synthesis: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => voices },
        createUtterance: (text) => ({
          text,
          lang: "",
          rate: 1,
          pitch: 0,
          voice: null,
        }),
      },
    );

    expect(cloudSignal?.aborted).toBe(true);
    expect(deviceResult).toMatchObject({ status: "spoken", source: "device" });
    expect(await pendingCloud).toMatchObject({ status: "cancelled" });
  });

  it("reports browser autoplay blocking without changing voice source", async () => {
    const result = await speakEnglishText("autoplay policy probe", "recognition", {
      sourcePreference: "cloud",
      createRequestId: () => "00000000-0000-4000-8000-000000000003",
      fetchImpl: vi.fn(async () =>
        new Response(Uint8Array.from([0xff, 0xfb, 0x90, 0x64]), {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        }),
      ),
      playAudioBlob: vi.fn(async () => {
        const error = new Error("play requires a user gesture");
        error.name = "NotAllowedError";
        throw error;
      }),
    });

    expect(result).toEqual({
      status: "unavailable",
      spokenText: "autoplay policy probe",
      source: "cloud",
      message: "Autoplay was blocked · Tap the sound button",
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
