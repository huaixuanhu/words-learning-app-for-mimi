import { describe, expect, it, vi } from "vitest";
import { StudyPromptError } from "./prompt-errors";
import {
  PROMPT_REFRESHED_COPY,
  submitWithExpiredPromptRecovery,
} from "./prompt-recovery";

describe("expired study prompt recovery", () => {
  it("submits a current prompt without refreshing", async () => {
    const submit = vi.fn().mockResolvedValue("saved");
    const refresh = vi.fn();

    await expect(
      submitWithExpiredPromptRecovery({
        promptToken: "current-token",
        createIdempotencyKey: () => "rating-1",
        submit,
        refresh,
      }),
    ).resolves.toEqual({ result: "saved", refreshed: false });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes an explicitly expired prompt and retries exactly once", async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(
        new StudyPromptError("prompt_expired", "This study card expired."),
      )
      .mockResolvedValueOnce("saved");
    const refresh = vi.fn().mockResolvedValue({ promptToken: "refreshed-token" });
    let key = 0;

    await expect(
      submitWithExpiredPromptRecovery({
        promptToken: "expired-token",
        createIdempotencyKey: () => `rating-${++key}`,
        submit,
        refresh,
      }),
    ).resolves.toEqual({ result: "saved", refreshed: true });
    expect(submit).toHaveBeenNthCalledWith(1, "expired-token", "rating-1");
    expect(submit).toHaveBeenNthCalledWith(2, "refreshed-token", "rating-2");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh invalid prompts or ambiguous failures", async () => {
    for (const failure of [
      new StudyPromptError("prompt_invalid", "Invalid prompt"),
      new Error("Network unavailable"),
    ]) {
      const submit = vi.fn().mockRejectedValue(failure);
      const refresh = vi.fn();

      await expect(
        submitWithExpiredPromptRecovery({
          promptToken: "token",
          createIdempotencyKey: () => "rating-1",
          submit,
          refresh,
        }),
      ).rejects.toBe(failure);
      expect(refresh).not.toHaveBeenCalled();
    }
  });

  it("does not loop when the single retry fails", async () => {
    const secondFailure = new StudyPromptError(
      "prompt_stale",
      "The study plan changed.",
    );
    const submit = vi
      .fn()
      .mockRejectedValueOnce(
        new StudyPromptError("prompt_expired", "This study card expired."),
      )
      .mockRejectedValueOnce(secondFailure);
    const refresh = vi.fn().mockResolvedValue({ promptToken: "refreshed-token" });

    await expect(
      submitWithExpiredPromptRecovery({
        promptToken: "expired-token",
        createIdempotencyKey: () => "rating-key",
        submit,
        refresh,
      }),
    ).rejects.toBe(secondFailure);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(PROMPT_REFRESHED_COPY).toBe("This card was refreshed.");
  });
});
