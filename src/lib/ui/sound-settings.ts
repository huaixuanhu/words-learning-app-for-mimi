export type MimiSoundSettings = {
  button: boolean;
  reviewComplete: boolean;
};

export const SOUND_STORAGE_KEY = "mimi-ui-sound-v1";

export const DEFAULT_SOUND_SETTINGS: MimiSoundSettings = {
  button: true,
  reviewComplete: true,
};

export function normalizeSoundSettings(value: unknown): MimiSoundSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_SOUND_SETTINGS;
  }

  const candidate = value as Partial<Record<keyof MimiSoundSettings, unknown>>;

  return {
    button: typeof candidate.button === "boolean" ? candidate.button : DEFAULT_SOUND_SETTINGS.button,
    reviewComplete:
      typeof candidate.reviewComplete === "boolean"
        ? candidate.reviewComplete
        : DEFAULT_SOUND_SETTINGS.reviewComplete,
  };
}

export function parseSoundSettings(rawValue: string | null): MimiSoundSettings {
  if (!rawValue) {
    return DEFAULT_SOUND_SETTINGS;
  }

  try {
    return normalizeSoundSettings(JSON.parse(rawValue));
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function serializeSoundSettings(settings: MimiSoundSettings) {
  return JSON.stringify(normalizeSoundSettings(settings));
}
