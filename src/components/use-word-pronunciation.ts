"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsPurpose } from "@/lib/tts/contract";
import {
  cancelEnglishSpeech,
  speakEnglishText,
} from "@/lib/ui/speech-synthesis";

type UseWordPronunciationOptions = Readonly<{
  text: string | null;
  purpose: TtsPurpose;
  activationKey: string | null;
  autoPlay: boolean;
  unsupportedMessage: string;
  onMessage: (message: string) => void;
}>;

export function useWordPronunciation({
  text,
  purpose,
  activationKey,
  autoPlay,
  unsupportedMessage,
  onMessage,
}: UseWordPronunciationOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const latestRef = useRef({ text, purpose, unsupportedMessage, onMessage });
  const inFlightRef = useRef(false);
  const requestNumberRef = useRef(0);
  const autoPlayedKeyRef = useRef("");

  useEffect(() => {
    latestRef.current = { text, purpose, unsupportedMessage, onMessage };
  }, [onMessage, purpose, text, unsupportedMessage]);

  const play = useCallback(async () => {
    const current = latestRef.current;
    if (!current.text || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    const requestNumber = requestNumberRef.current + 1;
    requestNumberRef.current = requestNumber;
    setIsPlaying(true);

    try {
      const result = await speakEnglishText(current.text, current.purpose);
      if (requestNumber !== requestNumberRef.current) {
        return;
      }

      if (result.status === "unsupported") {
        current.onMessage(current.unsupportedMessage);
      } else if (result.status === "unavailable") {
        current.onMessage(result.message);
      } else if (result.status === "spoken" && result.source === "local-fixture") {
        current.onMessage("Local preview audio played.");
      }
    } finally {
      if (requestNumber === requestNumberRef.current) {
        inFlightRef.current = false;
        setIsPlaying(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      inFlightRef.current = false;
      cancelEnglishSpeech();
    };
  }, [activationKey]);

  useEffect(() => {
    if (!autoPlay || !activationKey || !text) {
      return;
    }

    if (autoPlayedKeyRef.current === activationKey) {
      return;
    }

    autoPlayedKeyRef.current = activationKey;
    let cancelled = false;
    let started = false;
    queueMicrotask(() => {
      if (!cancelled) {
        started = true;
        void play();
      }
    });

    return () => {
      cancelled = true;
      if (!started && autoPlayedKeyRef.current === activationKey) {
        autoPlayedKeyRef.current = "";
      }
    };
  }, [activationKey, autoPlay, play, text]);

  return { isPlaying, play } as const;
}
