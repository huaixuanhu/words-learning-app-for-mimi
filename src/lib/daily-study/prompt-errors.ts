export const STUDY_PROMPT_ERROR_CODES = [
  "prompt_expired",
  "prompt_invalid",
  "prompt_stale",
  "prompt_consumed",
] as const;

export type StudyPromptErrorCode = (typeof STUDY_PROMPT_ERROR_CODES)[number];

export class StudyPromptError extends Error {
  constructor(
    readonly code: StudyPromptErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StudyPromptError";
  }
}

export function isStudyPromptErrorCode(value: unknown): value is StudyPromptErrorCode {
  return STUDY_PROMPT_ERROR_CODES.includes(value as StudyPromptErrorCode);
}

export function getStudyPromptErrorCode(error: unknown) {
  return error instanceof StudyPromptError ? error.code : null;
}

export function isExpiredStudyPromptError(error: unknown) {
  return getStudyPromptErrorCode(error) === "prompt_expired";
}
