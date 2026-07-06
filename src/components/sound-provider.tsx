"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { playSoftButtonClick } from "@/lib/ui/sound-player";
import {
  DEFAULT_SOUND_SETTINGS,
  parseSoundSettings,
  serializeSoundSettings,
  SOUND_STORAGE_KEY,
} from "@/lib/ui/sound-settings";
import type { MimiSoundSettings } from "@/lib/ui/sound-settings";

type SoundContextValue = {
  settings: MimiSoundSettings;
  setButtonSound: (enabled: boolean) => void;
  setReviewCompleteSound: (enabled: boolean) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);
const soundListeners = new Set<() => void>();
let memorySoundSettings = DEFAULT_SOUND_SETTINGS;
let memorySoundRawValue: string | null = null;

function readStoredSoundSettings(): MimiSoundSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SOUND_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(SOUND_STORAGE_KEY);

    if (rawValue === memorySoundRawValue) {
      return memorySoundSettings;
    }

    const settings = parseSoundSettings(rawValue);
    memorySoundRawValue = rawValue;
    memorySoundSettings = settings;
    return settings;
  } catch {
    return memorySoundSettings;
  }
}

function writeStoredSoundSettings(settings: MimiSoundSettings) {
  const serializedSettings = serializeSoundSettings(settings);

  memorySoundRawValue = serializedSettings;
  memorySoundSettings = parseSoundSettings(serializedSettings);

  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, serializedSettings);
  } catch {
    // Sound preference is UI-only; keep the in-memory state when storage is unavailable.
  }
}

function emitSoundChange() {
  soundListeners.forEach((listener) => listener());
}

function subscribeSound(listener: () => void) {
  soundListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SOUND_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    soundListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function isDisabledButtonLikeElement(element: Element) {
  if (element instanceof HTMLButtonElement && element.disabled) {
    return true;
  }

  return element.getAttribute("aria-disabled") === "true";
}

function getButtonSoundTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const buttonTarget = target.closest("button, [role='button'], a[href]");

  if (!buttonTarget || isDisabledButtonLikeElement(buttonTarget)) {
    return null;
  }

  if (buttonTarget.closest("[data-mimi-sound-skip='true']")) {
    return null;
  }

  return buttonTarget;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribeSound, readStoredSoundSettings, () => DEFAULT_SOUND_SETTINGS);

  const setSoundSettings = useCallback((nextSettings: MimiSoundSettings) => {
    writeStoredSoundSettings(nextSettings);
    emitSoundChange();
  }, []);

  const setButtonSound = useCallback(
    (enabled: boolean) => {
      setSoundSettings({ ...readStoredSoundSettings(), button: enabled });
    },
    [setSoundSettings],
  );

  const setReviewCompleteSound = useCallback(
    (enabled: boolean) => {
      setSoundSettings({ ...readStoredSoundSettings(), reviewComplete: enabled });
    },
    [setSoundSettings],
  );

  useEffect(() => {
    if (!settings.button) {
      return;
    }

    const playForPointer = (event: PointerEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !getButtonSoundTarget(event.target)) {
        return;
      }

      void playSoftButtonClick();
    };

    const playForKeyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      if (!getButtonSoundTarget(event.target)) {
        return;
      }

      void playSoftButtonClick();
    };

    document.addEventListener("pointerdown", playForPointer, true);
    document.addEventListener("keydown", playForKeyboard, true);

    return () => {
      document.removeEventListener("pointerdown", playForPointer, true);
      document.removeEventListener("keydown", playForKeyboard, true);
    };
  }, [settings.button]);

  const value = useMemo(
    () => ({
      settings,
      setButtonSound,
      setReviewCompleteSound,
    }),
    [setButtonSound, setReviewCompleteSound, settings],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useMimiSound() {
  const value = useContext(SoundContext);

  if (!value) {
    throw new Error("useMimiSound must be used inside SoundProvider");
  }

  return value;
}

export { SOUND_STORAGE_KEY };
