import { validateWfdSentences, wfdDate, wfdId, wfdObject } from "./import";
import { normalizeWfdWords } from "./grading";
import { WfdDataError, type WfdAttempt, type WfdData, type WfdProgress } from "./types";

export const WFD_STORAGE_PREFIX = "mimi:wfd:v1:";
const MAX_BACKUP_LENGTH = 25_000_000;

function numberInRange(value: unknown, label: string, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max ||
    (integer && !Number.isInteger(value))) {
    throw new WfdDataError(`${label} is invalid.`);
  }
  return value;
}

function validateAttempt(input: unknown): WfdAttempt {
  const value = wfdObject(input, "Attempt");
  if ((value.mode !== "recall" && value.mode !== "dictation") ||
    typeof value.assisted !== "boolean" || typeof value.correct !== "boolean" ||
    typeof value.answer !== "string" || value.answer.length > 10000) {
    throw new WfdDataError("The backup contains an invalid WFD attempt.");
  }
  const accuracy = numberInRange(value.accuracy, "Attempt accuracy", 1);
  if (value.correct !== (accuracy === 1)) throw new WfdDataError("Attempt result and accuracy disagree.");
  return {
    id: wfdId(value.id, "Attempt ID"),
    sentenceId: wfdId(value.sentenceId, "Attempt sentence ID"),
    submittedAt: wfdDate(value.submittedAt, "Attempt date"),
    mode: value.mode,
    answer: value.answer,
    assisted: value.assisted,
    playCount: numberInRange(value.playCount, "Attempt play count", 10000, true),
    correct: value.correct,
    accuracy,
  };
}

function validateProgress(input: unknown): WfdProgress {
  const value = wfdObject(input, "Sentence progress");
  const result: WfdProgress = {};
  for (const key of ["learnedAt", "dueAt", "lastAttemptAt", "lastIndependentSuccessAt"] as const) {
    if (value[key] !== undefined) result[key] = wfdDate(value[key], `Progress ${key}`);
  }
  for (const key of ["intervalDays", "successfulReviews", "lapses"] as const) {
    if (value[key] !== undefined) {
      result[key] = numberInRange(value[key], `Progress ${key}`, 1_000_000, key !== "intervalDays");
    }
  }
  if ((result.successfulReviews ?? 0) > 0 && !result.lastIndependentSuccessAt) {
    throw new WfdDataError("Successful WFD reviews need an independent attempt timestamp.");
  }
  return result;
}

export function validateWfdData(input: unknown, expectedPersonId?: string): WfdData {
  const value = wfdObject(input, "WFD data");
  if (value.version !== 1) throw new WfdDataError("This WFD backup version is not supported.");
  const personId = wfdId(value.personId, "Learner ID");
  if (expectedPersonId !== undefined && expectedPersonId !== personId) {
    throw new WfdDataError("This backup belongs to another learner. Select that learner before restoring.");
  }
  if (!Array.isArray(value.attempts) || value.attempts.length > 100000) {
    throw new WfdDataError("The WFD attempt history is invalid or too large.");
  }
  const attempts = value.attempts.map(validateAttempt);
  if (new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length) {
    throw new WfdDataError("The WFD backup contains duplicate attempt IDs.");
  }
  const rawProgress = wfdObject(value.progress, "WFD progress");
  if (Object.keys(rawProgress).length > 10000) throw new WfdDataError("The WFD progress collection is too large.");
  const progress = Object.fromEntries(Object.entries(rawProgress).map(([id, item]) => [
    wfdId(id, "Progress sentence ID"), validateProgress(item),
  ]));
  return {
    version: 1,
    personId,
    sentences: validateWfdSentences(value.sentences),
    attempts,
    progress,
    updatedAt: wfdDate(value.updatedAt, "WFD last update"),
  };
}

export function createEmptyWfdData(personId: string, now = new Date().toISOString()): WfdData {
  return {
    version: 1,
    personId: wfdId(personId, "Learner ID"),
    sentences: [],
    attempts: [],
    progress: {},
    updatedAt: wfdDate(now, "WFD creation date"),
  };
}

function browserStorage(): Storage {
  try {
    if (typeof window !== "undefined") return window.localStorage;
  } catch {
    throw new WfdDataError("Browser storage is unavailable. Your WFD changes have not been saved.");
  }
  throw new WfdDataError("WFD progress can only be saved in this browser.");
}

export function wfdStorageKey(personId: string): string {
  return `${WFD_STORAGE_PREFIX}${encodeURIComponent(wfdId(personId, "Learner ID"))}`;
}

export function parseWfdBackup(json: string, expectedPersonId?: string): WfdData {
  if (json.length > MAX_BACKUP_LENGTH) throw new WfdDataError("The WFD backup is too large (maximum 25 MB).");
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
  } catch {
    throw new WfdDataError("This WFD data cannot be read. The original saved data has been kept.");
  }
  return validateWfdData(input, expectedPersonId);
}

export function readWfdData(personId: string): WfdData {
  try {
    const raw = browserStorage().getItem(wfdStorageKey(personId));
    return raw === null ? createEmptyWfdData(personId) : parseWfdBackup(raw, personId);
  } catch (error) {
    if (error instanceof WfdDataError) throw error;
    throw new WfdDataError("WFD progress could not be read. Saved data has not been changed.");
  }
}

export function writeWfdData(data: WfdData, expectedUpdatedAt?: string): void {
  const validated = validateWfdData(data);
  const storage = browserStorage();
  const key = wfdStorageKey(validated.personId);
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      // Never replace corrupt data with an empty, apparently successful save.
      const previous = parseWfdBackup(raw, validated.personId);
      if (expectedUpdatedAt !== undefined && previous.updatedAt !== expectedUpdatedAt) {
        throw new WfdDataError("WFD data changed in another tab. Reload before saving; your saved data was not overwritten.");
      }
      const attempts = new Map(validated.attempts.map((attempt) => [attempt.id, attempt]));
      if (previous.attempts.some((attempt) => JSON.stringify(attempts.get(attempt.id)) !== JSON.stringify(attempt))) {
        throw new WfdDataError("WFD history changed in another tab. Reload before saving; no history was overwritten.");
      }
      const previousAttemptIds = new Set(previous.attempts.map((attempt) => attempt.id));
      const updatedSentenceIds = new Set(validated.attempts
        .filter((attempt) => !previousAttemptIds.has(attempt.id)).map((attempt) => attempt.sentenceId));
      for (const [id, progress] of Object.entries(previous.progress)) {
        const replacement = validated.progress[id];
        if (!replacement || (!updatedSentenceIds.has(id) && Object.entries(progress).some(
          ([key, value]) => replacement[key as keyof WfdProgress] !== value,
        ))) {
          throw new WfdDataError("WFD progress changed in another tab. Reload before saving; no progress was overwritten.");
        }
      }
      const sentences = new Map(validated.sentences.map((sentence) => [sentence.id, sentence]));
      if (previous.sentences.some((sentence) => {
        const replacement = sentences.get(sentence.id);
        return !replacement || normalizeWfdWords(replacement.text).join(" ") !== normalizeWfdWords(sentence.text).join(" ");
      })) {
        throw new WfdDataError("The saved WFD bank cannot be removed or have its targets changed by a normal save. Reload or use backup restore.");
      }
    }
    storage.setItem(key, exportWfdBackup(validated));
  } catch (error) {
    if (error instanceof WfdDataError) throw error;
    throw new WfdDataError("WFD changes could not be saved. Browser storage may be full or disabled.");
  }
}

export function exportWfdBackup(data: WfdData): string {
  const json = JSON.stringify(validateWfdData(data), null, 2);
  if (json.length > MAX_BACKUP_LENGTH) throw new WfdDataError("The WFD backup is too large (maximum 25 MB).");
  return json;
}

/** UI must preview the backup and obtain explicit replacement confirmation first. */
export function restoreWfdBackup(personId: string, json: string): {
  data: WfdData;
  recoveryStorageKey: string | null;
} {
  const data = parseWfdBackup(json, personId);
  const storage = browserStorage();
  const key = wfdStorageKey(personId);
  try {
    const raw = storage.getItem(key);
    const recoveryStorageKey = raw === null ? null : `${key}:recovery:${crypto.randomUUID()}`;
    // Keep exact previous bytes, including malformed data, before replacement.
    // If there is not enough room for this recovery copy, stop without replacing.
    if (recoveryStorageKey !== null) storage.setItem(recoveryStorageKey, raw!);
    storage.setItem(key, JSON.stringify(data));
    return { data, recoveryStorageKey };
  } catch {
    throw new WfdDataError("The WFD restore could not finish. The original data has been preserved.");
  }
}
