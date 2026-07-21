"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import {
  DEFAULT_SPEECH_VOICE_PREFERENCE,
  DEFAULT_SPEECH_SOURCE_PREFERENCE,
  getBrowserEnglishSpeechVoices,
  readSpeechSourcePreference,
  readSpeechVoicePreference,
  speakEnglishText,
  writeSpeechSourcePreference,
  writeSpeechVoicePreference,
  type SpeechSourcePreference,
  type SpeechVoiceAdapter,
  type SpeechVoicePreference,
} from "@/lib/ui/speech-synthesis";

const PREVIEW_SENTENCE = "The new policy may mitigate the risk.";

function preferenceValue(
  preference: SpeechVoicePreference,
  voices: readonly SpeechVoiceAdapter[],
) {
  return preference.mode === "voice" &&
    voices.some((voice) => voice.voiceURI === preference.voiceURI)
    ? preference.voiceURI
    : "auto";
}

function voiceLabel(voice: SpeechVoiceAdapter) {
  const details = [voice.lang];
  if (voice.default) details.push("device default");
  if (voice.localService) details.push("on device");
  return `${voice.name} · ${details.join(" · ")}`;
}

export function VoiceSettingsForm() {
  const [voices, setVoices] = useState<SpeechVoiceAdapter[]>([]);
  const [preference, setPreference] = useState<SpeechVoicePreference>(
    DEFAULT_SPEECH_VOICE_PREFERENCE,
  );
  const [source, setSource] = useState<SpeechSourcePreference>(
    DEFAULT_SPEECH_SOURCE_PREFERENCE,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [status, setStatus] = useState("Cloud voice is used for word playback.");

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined" || !window.speechSynthesis) {
      queueMicrotask(() => {
        if (!cancelled) {
          setPreference(readSpeechVoicePreference());
          setSource(readSpeechSourcePreference());
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const refreshVoices = () => {
      if (!cancelled) {
        setVoices(getBrowserEnglishSpeechVoices());
      }
    };
    queueMicrotask(() => {
      if (!cancelled) {
        setPreference(readSpeechVoicePreference());
        setSource(readSpeechSourcePreference());
        refreshVoices();
      }
    });
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);

    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, []);

  const selectedValue = useMemo(
    () => preferenceValue(preference, voices),
    [preference, voices],
  );

  const selectVoice = (value: string) => {
    const nextPreference: SpeechVoicePreference =
      value === "auto"
        ? DEFAULT_SPEECH_VOICE_PREFERENCE
        : (() => {
            const voice = voices.find((candidate) => candidate.voiceURI === value);
            return voice
              ? {
                  mode: "voice" as const,
                  voiceURI: voice.voiceURI,
                  name: voice.name,
                  lang: voice.lang,
                }
              : DEFAULT_SPEECH_VOICE_PREFERENCE;
          })();

    writeSpeechVoicePreference(nextPreference);
    setPreference(nextPreference);
    setStatus(
      nextPreference.mode === "voice"
        ? `${nextPreference.name} selected on this device.`
        : "Best available voice selected on this device.",
    );
  };

  const selectSource = (value: string) => {
    const nextSource: SpeechSourcePreference =
      value === "device" ? "device" : "cloud";
    writeSpeechSourcePreference(nextSource);
    setSource(nextSource);
    setStatus(
      nextSource === "device"
        ? "Device voice selected for this browser."
        : "Cloud voice selected for this browser.",
    );
  };

  const preview = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    setStatus("Preparing voice...");
    try {
      const result = await speakEnglishText(PREVIEW_SENTENCE, "settings-preview", {
        sourcePreference: source,
        voices,
        voicePreference: preference,
      });

      if (result.status === "unsupported") {
        setStatus("Speech is not available in this browser.");
      } else if (result.status === "unavailable") {
        setStatus(result.message);
      } else if (result.status === "spoken") {
        setStatus(
          result.source === "local-fixture"
            ? "Local preview audio played."
            : result.source === "device" && result.voiceName
            ? `Playing ${result.voiceName} · ${result.voiceLanguage}.`
            : result.source === "device"
              ? "Playing the device fallback voice."
              : "Playing Cloud voice.",
        );
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="grid gap-3 md:max-w-2xl">
      <div className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-[var(--mimi-text)]">
            Word voice
            <select
              value={source}
              onChange={(event) => selectSource(event.target.value)}
              className="mimi-input min-h-11 w-full px-3 text-base font-normal"
            >
              <option value="cloud">Cloud voice</option>
              <option value="device">Use device voice</option>
            </select>
          </label>

          <PressableButton
            type="button"
            data-mimi-sound-skip="true"
            onClick={() => void preview()}
            disabled={isPreviewing}
            aria-busy={isPreviewing}
            className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            <Volume2 aria-hidden="true" className="size-4" />
            {isPreviewing ? "Preparing..." : "Preview"}
          </PressableButton>
        </div>

        {source === "device" ? (
          <label className="mt-3 grid min-w-0 gap-2 text-sm font-semibold text-[var(--mimi-text)]">
            Device voice
            <select
              value={selectedValue}
              onChange={(event) => selectVoice(event.target.value)}
              className="mimi-input min-h-11 w-full px-3 text-base font-normal"
            >
              <option value="auto">Best available</option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voiceLabel(voice)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-3 text-xs leading-5 text-[var(--mimi-text-muted)]">
            Cloud voice sends only the English text you play to Google Cloud. / 云端朗读只发送你点击播放的英文内容。
          </p>
        )}
      </div>

      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">{status}</p>
    </div>
  );
}
