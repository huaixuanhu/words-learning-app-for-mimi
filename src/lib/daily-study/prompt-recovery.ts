import { isExpiredStudyPromptError } from "./prompt-errors";

export const PROMPT_REFRESHED_COPY = "This card was refreshed.";

export async function submitWithExpiredPromptRecovery<T>(input: {
  promptToken: string;
  createIdempotencyKey: () => string;
  submit: (promptToken: string, idempotencyKey: string) => Promise<T>;
  refresh: (promptToken: string) => Promise<{ promptToken: string }>;
}) {
  try {
    const result = await input.submit(
      input.promptToken,
      input.createIdempotencyKey(),
    );

    return { result, refreshed: false } as const;
  } catch (error) {
    if (!isExpiredStudyPromptError(error)) {
      throw error;
    }

    const refreshed = await input.refresh(input.promptToken);
    const result = await input.submit(
      refreshed.promptToken,
      input.createIdempotencyKey(),
    );

    return { result, refreshed: true } as const;
  }
}
