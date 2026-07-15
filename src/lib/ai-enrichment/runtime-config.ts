import {
  GEMINI_PRICING_2026_07_14_STANDARD,
  getAiGenerationAvailability,
  isGeminiPricingFresh,
} from "./contract";
import type { AiGenerationAvailability } from "./types";

type AiRuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export type AiRuntimeHealth = Readonly<{
  enabled: boolean;
  availability: AiGenerationAvailability;
}>;

export function resolveAiRuntimeHealth(
  env: AiRuntimeEnvironment,
  now: string | Date,
): AiRuntimeHealth {
  const enabled = env.MIMI_AI_RUNTIME_ENABLED === "true";
  const availability = getAiGenerationAvailability({
    killSwitchEnabled: env.MIMI_AI_KILL_SWITCH === "true",
    providerConfigured: enabled && Boolean(env.GEMINI_API_KEY?.trim()),
    pricingFresh: isGeminiPricingFresh(GEMINI_PRICING_2026_07_14_STANDARD, now),
    usageAccountingAvailable:
      env.MIMI_AI_ACCOUNTING_READY === "true" &&
      env.MIMI_AI_SCHEMA6_READY === "true",
    quotaAvailable: env.MIMI_AI_QUOTA_AVAILABLE !== "false",
  });

  return { enabled, availability };
}

export function aiRestingMessage(reason: AiGenerationAvailability["reason"]) {
  if (reason === "quota_exhausted") {
    return "AI suggestions have finished for today. Your saved words still work normally.";
  }
  return "AI suggestions are resting for now. Your saved words still work normally.";
}
