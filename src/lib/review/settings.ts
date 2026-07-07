import type { ReviewSettings } from "./types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { normalizeOptionalText } from "@/lib/vocabulary/normalize";
import { getSelectedPersonId } from "@/lib/people/repository";

export const DEFAULT_SESSION_LIMIT = 24;
export const DEFAULT_RECOGNITION_SESSION_LIMIT = DEFAULT_SESSION_LIMIT;
export const DEFAULT_ACTIVE_SESSION_LIMIT = 8;
export const MIN_SESSION_LIMIT = 1;
export const MAX_SESSION_LIMIT = 80;
export const DEFAULT_TIMEZONE = "Australia/Melbourne";

export type ReviewSettingsInput = {
  sessionLimit?: number | string | null;
  recognitionSessionLimit?: number | string | null;
  activeSessionLimit?: number | string | null;
  timezone?: string | null;
};

export function normalizeSessionLimit(input: number | string | null | undefined) {
  if (input === null || input === undefined || input === "") {
    return DEFAULT_SESSION_LIMIT;
  }

  const numeric = Number(input);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_SESSION_LIMIT;
  }

  return Math.min(MAX_SESSION_LIMIT, Math.max(MIN_SESSION_LIMIT, Math.round(numeric)));
}

export function createDefaultReviewSettings(
  now = new Date().toISOString(),
  timezone = DEFAULT_TIMEZONE,
): ReviewSettings {
  return {
    sessionLimit: DEFAULT_RECOGNITION_SESSION_LIMIT,
    recognitionSessionLimit: DEFAULT_RECOGNITION_SESSION_LIMIT,
    activeSessionLimit: DEFAULT_ACTIVE_SESSION_LIMIT,
    timezone,
    updatedAt: now,
  };
}

export function normalizeReviewSettings(
  input: ReviewSettingsInput | Partial<ReviewSettings> | undefined,
  now = new Date().toISOString(),
): ReviewSettings {
  const timezone = normalizeOptionalText(input?.timezone) || DEFAULT_TIMEZONE;
  const maybeSettings = input as Partial<ReviewSettings> | undefined;
  const recognitionSessionLimit = normalizeSessionLimit(
    input?.recognitionSessionLimit ?? input?.sessionLimit,
  );
  const activeSessionLimit = normalizeSessionLimit(
    input?.activeSessionLimit ?? DEFAULT_ACTIVE_SESSION_LIMIT,
  );

  return {
    sessionLimit: recognitionSessionLimit,
    recognitionSessionLimit,
    activeSessionLimit,
    timezone,
    updatedAt: typeof maybeSettings?.updatedAt === "string" ? maybeSettings.updatedAt : now,
  };
}

export function getReviewSettingsForPerson(data: VocabularyData, personId: string) {
  return normalizeReviewSettings(
    data.settingsByPerson.find((settings) => settings.personId === personId),
  );
}

export function getSelectedReviewSettings(data: VocabularyData) {
  return getReviewSettingsForPerson(data, getSelectedPersonId(data));
}

export function updateReviewSettings(
  data: VocabularyData,
  input: ReviewSettingsInput,
  now = new Date().toISOString(),
) {
  const personId = getSelectedPersonId(data);
  const currentSettings = getReviewSettingsForPerson(data, personId);
  const nextSettings = {
    personId,
    ...currentSettings,
    recognitionSessionLimit: normalizeSessionLimit(
      input.recognitionSessionLimit ?? input.sessionLimit ?? currentSettings.recognitionSessionLimit,
    ),
    activeSessionLimit: normalizeSessionLimit(input.activeSessionLimit ?? currentSettings.activeSessionLimit),
    timezone: normalizeOptionalText(input.timezone) || currentSettings.timezone || DEFAULT_TIMEZONE,
    updatedAt: now,
  };
  nextSettings.sessionLimit = nextSettings.recognitionSessionLimit;
  const hasSettings = data.settingsByPerson.some((settings) => settings.personId === personId);

  return {
    ...data,
    settingsByPerson: hasSettings
      ? data.settingsByPerson.map((settings) => (settings.personId === personId ? nextSettings : settings))
      : [nextSettings, ...data.settingsByPerson],
    updatedAt: now,
  };
}
