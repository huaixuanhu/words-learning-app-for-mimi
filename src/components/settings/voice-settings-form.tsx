"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import {
  DEFAULT_SPEECH_VOICE_PREFERENCE,
  getBrowserEnglishSpeechVoices,
  readSpeechVoicePreference,
  speakEnglishText,
  writeSpeechVoicePreference,
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
  const [status, setStatus] = useState("Choose and preview a voice on this device.");

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined" || !window.speechSynthesis) {
      queueMicrotask(() => {
        if (!cancelled) {
          setStatus("Speech is not available in this browser.");
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

  const preview = () => {
    const result = speakEnglishText(PREVIEW_SENTENCE, {
      voices,
      voicePreference: preference,
    });

    if (result.status === "unsupported") {
      setStatus("Speech is not available in this browser.");
      return;
    }

    if (result.status === "spoken") {
      setStatus(
        result.voiceName
          ? `Playing ${result.voiceName} · ${result.voiceLanguage}.`
          : "Playing the browser fallback voice.",
      );
    }
  };

  return (
    <div className="grid gap-3 md:max-w-2xl">
      <div className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-strong)] p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-[var(--mimi-text)]">
            Word voice
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

          <PressableButton
            type="button"
            data-mimi-sound-skip="true"
            onClick={preview}
            className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            <Volume2 aria-hidden="true" className="size-4" />
            Preview
          </PressableButton>
        </div>
      </div>

      <p className="text-sm leading-6 text-[var(--mimi-text-soft)]">{status}</p>
    </div>
  );
}
