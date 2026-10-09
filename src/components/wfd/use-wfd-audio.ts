"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WfdAudioOptions = {
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
};

type AudioState = { isPlaying: boolean; error: string | null };

export function selectWfdLocalVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const priority = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.replaceAll("_", "-").toLowerCase();
    return lang === "en-au" ? 0 : lang === "en-gb" ? 1 : lang === "en-us" ? 2 : 3;
  };
  return voices.filter((voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name))[0] ?? null;
}

/** Owns one utterance; only its natural end can complete a listening attempt. */
export function createWfdAudioPlayback(
  synthesis: Pick<SpeechSynthesis, "speak" | "cancel">,
  createUtterance: (text: string) => SpeechSynthesisUtterance,
  onState: (state: AudioState) => void,
) {
  let active: SpeechSynthesisUtterance | null = null;
  const detach = (utterance: SpeechSynthesisUtterance) => {
    utterance.onboundary = null;
    utterance.onend = null;
    utterance.onerror = null;
  };
  const stop = () => {
    const previous = active;
    active = null;
    if (previous) {
      detach(previous);
      synthesis.cancel();
    }
    onState({ isPlaying: false, error: null });
  };
  const play = (text: string, voice: SpeechSynthesisVoice | null, options: WfdAudioOptions = {}): boolean => {
    stop();
    if (!voice?.localService || !/^en(?:[-_]|$)/i.test(voice.lang)) {
      onState({ isPlaying: false, error: "No local English voice is available. Install an English device voice, then reload." });
      return false;
    }
    if (!text.trim() || text.length > 2000) {
      onState({ isPlaying: false, error: "Choose one sentence or phrase to play." });
      return false;
    }
    try {
      const utterance = createUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      active = utterance;
      utterance.onboundary = (event) => {
        if (active === utterance && Number.isInteger(event.charIndex) && event.charIndex >= 0 && event.charIndex < text.length) {
          options.onBoundary?.(event.charIndex);
        }
      };
      utterance.onend = () => {
        if (active !== utterance) return;
        active = null;
        detach(utterance);
        onState({ isPlaying: false, error: null });
        options.onEnd?.();
      };
      utterance.onerror = (event) => {
        if (active !== utterance) return;
        active = null;
        detach(utterance);
        onState({
          isPlaying: false,
          error: event.error === "not-allowed"
            ? "Playback was blocked. Tap Play again to hear the sentence."
            : "Device speech did not finish. Replay the sentence before submitting.",
        });
      };
      // Replace the browser queue. No Cloud route or voice fallback is used here.
      synthesis.cancel();
      onState({ isPlaying: true, error: null });
      synthesis.speak(utterance);
      return true;
    } catch {
      if (active) detach(active);
      active = null;
      onState({ isPlaying: false, error: "Device speech is unavailable. Check your browser's English voices." });
      return false;
    }
  };
  return { play, stop };
}

export function useWfdAudio() {
  const [audioState, setAudioState] = useState<AudioState>({ isPlaying: false, error: null });
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const playbackRef = useRef<ReturnType<typeof createWfdAudioPlayback> | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return;
    const synthesis = window.speechSynthesis;
    const playback = createWfdAudioPlayback(
      synthesis,
      (text) => new window.SpeechSynthesisUtterance(text),
      (state) => { if (mounted) setAudioState(state); },
    );
    playbackRef.current = playback;
    const refreshVoices = () => {
      if (!mounted) return;
      const selected = selectWfdLocalVoice(synthesis.getVoices());
      voiceRef.current = selected;
      setVoice(selected);
    };
    synthesis.addEventListener("voiceschanged", refreshVoices);
    // Voice discovery can finish after mount; subscribe before the first query.
    queueMicrotask(refreshVoices);
    return () => {
      mounted = false;
      synthesis.removeEventListener("voiceschanged", refreshVoices);
      playback.stop();
      playbackRef.current = null;
      voiceRef.current = null;
    };
  }, []);

  const play = useCallback((text: string, options?: WfdAudioOptions): boolean => {
    if (!playbackRef.current) {
      setAudioState({ isPlaying: false, error: "This browser does not support device speech. Try a browser with an installed English voice." });
      return false;
    }
    return playbackRef.current.play(text, voiceRef.current, options);
  }, []);
  const stop = useCallback(() => { playbackRef.current?.stop(); }, []);

  return {
    play,
    stop,
    ...audioState,
    available: voice !== null,
    voiceLabel: voice ? `${voice.name} · ${voice.lang} · Device voice` : "No local English device voice",
  };
}
